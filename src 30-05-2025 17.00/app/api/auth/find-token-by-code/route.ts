// src/app/api/auth/find-token-by-code/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';
import { logSecurityEvent } from '@/lib/security';

interface RequestBody {
  verificationCode: string;
  fingerprint?: string;
}

interface SecurityEvent {
  type: string;
  path: string;
  ip: string;
  userAgent: string;
  userId?: string;
  message: string;
  metadata?: Record<string, any>;
}

// Enhanced rate limiting for token lookups
const tokenLookupLimiter = new EnhancedRateLimiter("token_lookup", {
  maxAttempts: 10, // 10 attempts per window
  windowMinutes: 15, // 15 minute window
  lockoutMinutes: 30, // 30 minute lockout
  progressiveDelay: true
});

// Enhanced client info extraction
const getClientInfo = (req: NextRequest) => {
  const ip = req.headers.get('x-forwarded-for')?.split(',').shift()?.trim() || 
             req.headers.get('x-real-ip') || 
             req.headers.get('cf-connecting-ip') ||
             'unknown';
  
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const fingerprint = req.headers.get('x-client-fingerprint') || 'unknown';

  return { ip, userAgent, fingerprint };
};

export async function POST(req: NextRequest) {
  const clientInfo = getClientInfo(req);

  try {
    // Parse request body
    const body = await req.json() as RequestBody;
    const { verificationCode, fingerprint } = body;

    // Basic validation
    if (!verificationCode) {
      await logSecurityEvent({
        type: 'invalid_token_lookup_request',
        path: '/api/auth/find-token-by-code',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: 'Missing verification code parameter'
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Kode verifikasi tidak ditemukan' 
      }, { status: 400 });
    }

    // Check rate limiting
    const rateLimit = await tokenLookupLimiter.checkAndLimit(clientInfo.ip);
    if (!rateLimit.success) {
      await logSecurityEvent({
        type: 'token_lookup_rate_limited',
        path: '/api/auth/find-token-by-code',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Token lookup rate limited: ${rateLimit.remaining} remaining`
      } as SecurityEvent);

      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      
      return NextResponse.json({ 
        message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfter / 60)} menit.` 
      }, { 
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString()
        }
      });
    }

    // Enhanced input validation
    const codeValidation = SecurityValidator.validateAndSanitize(verificationCode, {
      maxLength: 8,
      checkSQLInjection: true,
      checkXSS: true,
      checkPathTraversal: true
    });

    if (!codeValidation.isValid) {
      await tokenLookupLimiter.recordAttempt(clientInfo.ip, false, {
        reason: 'invalid_input',
        violations: codeValidation.violations
      });

      await logSecurityEvent({
        type: 'malicious_token_lookup_attempt',
        path: '/api/auth/find-token-by-code',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Input validation failed: ${codeValidation.violations.join(', ')}`
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Input tidak valid' 
      }, { status: 400 });
    }

    const sanitizedCode = codeValidation.sanitized.toUpperCase();

    // Validate verification code format (8 alphanumeric characters)
    if (!/^[A-Z0-9]{8}$/.test(sanitizedCode)) {
      await tokenLookupLimiter.recordAttempt(clientInfo.ip, false, {
        reason: 'invalid_format',
        code: sanitizedCode
      });

      return NextResponse.json({ 
        message: 'Format kode verifikasi tidak valid' 
      }, { status: 400 });
    }

    // Search for token that starts with this verification code
    const now = new Date().toISOString();
    
    const { data: tokens, error: searchError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select(`
        token,
        user_id,
        created_at,
        expires_at,
        used,
        ip_address,
        user_agent,
        fingerprint,
        users (
          id,
          email,
          is_locked
        )
      `)
      .gt('expires_at', now) // Only non-expired tokens
      .eq('used', false) // Only unused tokens
      .like('token', `${sanitizedCode}%`) // Token starts with verification code
      .limit(1);

    if (searchError) {
      console.error('Database error during token lookup:', searchError);
      
      await logSecurityEvent({
        type: 'token_lookup_db_error',
        path: '/api/auth/find-token-by-code',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Database error during token lookup: ${searchError.message}`
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Terjadi kesalahan sistem' 
      }, { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      await tokenLookupLimiter.recordAttempt(clientInfo.ip, false, {
        reason: 'token_not_found',
        code: sanitizedCode
      });

      await logSecurityEvent({
        type: 'token_lookup_not_found',
        path: '/api/auth/find-token-by-code',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: 'Token lookup failed - not found',
        metadata: { verificationCode: sanitizedCode }
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Kode verifikasi tidak ditemukan atau sudah kedaluwarsa' 
      }, { status: 404 });
    }

    const tokenData = tokens[0];

    // Additional security checks
    const securityWarnings: string[] = [];

    // Check if user account is locked
    if (tokenData.users?.is_locked) {
      await logSecurityEvent({
        type: 'token_lookup_locked_account',
        path: '/api/auth/find-token-by-code',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        userId: tokenData.user_id,
        message: 'Token lookup attempted for locked account'
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Akun terkunci' 
      }, { status: 403 });
    }

    // Enhanced security: Check if request comes from similar environment
    if (tokenData.ip_address !== clientInfo.ip) {
      securityWarnings.push('Different IP address');
    }
    
    if (tokenData.fingerprint !== clientInfo.fingerprint) {
      securityWarnings.push('Different browser fingerprint');
    }

    // Log security warnings but don't block (could be legitimate)
    if (securityWarnings.length > 0) {
      await logSecurityEvent({
        type: 'token_lookup_security_warning',
        path: '/api/auth/find-token-by-code',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        userId: tokenData.user_id,
        message: `Security warning during token lookup: ${securityWarnings.join(', ')}`,
        metadata: {
          originalIp: tokenData.ip_address,
          currentIp: clientInfo.ip,
          originalFingerprint: tokenData.fingerprint,
          currentFingerprint: clientInfo.fingerprint,
          verificationCode: sanitizedCode
        }
      } as SecurityEvent);
    }

    // Record successful token lookup
    await tokenLookupLimiter.recordAttempt(clientInfo.ip, true, {
      userId: tokenData.user_id,
      securityWarnings: securityWarnings.length,
      verificationCode: sanitizedCode
    });

    await logSecurityEvent({
      type: 'token_lookup_successful',
      path: '/api/auth/find-token-by-code',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      userId: tokenData.user_id,
      message: 'Token lookup successful via verification code',
      metadata: {
        verificationCode: sanitizedCode,
        hasSecurityWarnings: securityWarnings.length > 0
      }
    } as SecurityEvent);

    return NextResponse.json({ 
      token: tokenData.token,
      expiresAt: tokenData.expires_at,
      hasSecurityWarnings: securityWarnings.length > 0,
      securityWarnings: securityWarnings
    });

  } catch (error) {
    console.error('Token lookup error:', error);
    
    await logSecurityEvent({
      type: 'token_lookup_system_error',
      path: '/api/auth/find-token-by-code',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      message: `System error during token lookup: ${error instanceof Error ? error.message : String(error)}`
    } as SecurityEvent);

    return NextResponse.json({ 
      message: 'Terjadi kesalahan sistem. Silakan coba lagi.' 
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';