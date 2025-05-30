// src/app/api/auth/validasi-token/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';
import { logSecurityEvent } from '@/lib/security';

interface SecurityEvent {
  type: string;
  path: string;
  ip: string;
  userAgent: string;
  userId?: string;
  message: string;
  metadata?: Record<string, any>;
}

// Enhanced rate limiting for token validation (more lenient than reset attempts)
const tokenValidationLimiter = new EnhancedRateLimiter("token_validation", {
  maxAttempts: 20, // Allow more validation attempts
  windowMinutes: 10, // Shorter window for faster reset
  lockoutMinutes: 15, // Shorter lockout
  progressiveDelay: false // No progressive delay for validations
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

// Enhanced token validation with security checks
const validateResetToken = async (token: string, clientInfo: any) => {
  const now = new Date().toISOString();
  
  // Get token data with user information
  const { data: tokenData, error: tokenError } = await supabaseAdmin
    .from('password_reset_tokens')
    .select(`
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
        is_locked,
        failed_attempts
      )
    `)
    .eq('token', token)
    .gt('expires_at', now)
    .single();

  if (tokenError || !tokenData) {
    return { 
      valid: false, 
      reason: 'Token tidak valid atau sudah kedaluwarsa',
      code: 'INVALID_TOKEN'
    };
  }

  // Check if token has already been used
  if (tokenData.used) {
    await logSecurityEvent({
      type: 'used_token_validation_attempt',
      path: '/api/auth/validasi-token',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      userId: tokenData.user_id,
      message: 'Attempt to validate already used reset token'
    } as SecurityEvent);

    return { 
      valid: false, 
      reason: 'Token sudah digunakan',
      code: 'TOKEN_ALREADY_USED'
    };
  }

  // Check if user account is locked
  if (tokenData.users?.is_locked) {
    await logSecurityEvent({
      type: 'validation_attempt_locked_account',
      path: '/api/auth/validasi-token',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      userId: tokenData.user_id,
      message: 'Token validation attempted for locked account'
    } as SecurityEvent);

    return { 
      valid: false, 
      reason: 'Akun terkunci',
      code: 'ACCOUNT_LOCKED'
    };
  }

  // Enhanced security: Check if request comes from similar environment
  const securityWarnings: string[] = [];
  
  if (tokenData.ip_address !== clientInfo.ip) {
    securityWarnings.push('Different IP address');
  }
  
  if (tokenData.fingerprint !== clientInfo.fingerprint) {
    securityWarnings.push('Different browser fingerprint');
  }

  // Log security warnings but don't block (could be legitimate)
  if (securityWarnings.length > 0) {
    await logSecurityEvent({
      type: 'validation_security_warning',
      path: '/api/auth/validasi-token',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      userId: tokenData.user_id,
      message: `Security warning during token validation: ${securityWarnings.join(', ')}`,
      metadata: {
        originalIp: tokenData.ip_address,
        currentIp: clientInfo.ip,
        originalFingerprint: tokenData.fingerprint,
        currentFingerprint: clientInfo.fingerprint
      }
    } as SecurityEvent);
  }

  return { 
    valid: true, 
    tokenData,
    securityWarnings 
  };
};

export async function GET(req: NextRequest) {
  const clientInfo = getClientInfo(req);
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  try {
    // Basic validation
    if (!token) {
      await logSecurityEvent({
        type: 'invalid_token_validation_request',
        path: '/api/auth/validasi-token',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: 'Missing token parameter'
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Token tidak ditemukan' 
      }, { status: 400 });
    }

    // Check rate limiting for token validation (more lenient)
    const rateLimit = await tokenValidationLimiter.checkAndLimit(clientInfo.ip);
    if (!rateLimit.success && rateLimit.isLocked) {
      await logSecurityEvent({
        type: 'token_validation_rate_limited',
        path: '/api/auth/validasi-token',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Token validation rate limited: ${rateLimit.remaining} remaining`
      } as SecurityEvent);

      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      
      return NextResponse.json({ 
        message: `Terlalu banyak validasi token. Tunggu ${Math.ceil(retryAfter / 60)} menit.` 
      }, { 
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString()
        }
      });
    }

    // Enhanced input validation
    const tokenValidation = SecurityValidator.validateAndSanitize(token, {
      maxLength: 100,
      checkSQLInjection: true,
      checkXSS: true,
      checkPathTraversal: true
    });

    if (!tokenValidation.isValid) {
      await tokenValidationLimiter.recordAttempt(clientInfo.ip, false, {
        reason: 'invalid_input',
        violations: tokenValidation.violations
      });

      await logSecurityEvent({
        type: 'malicious_token_validation_attempt',
        path: '/api/auth/validasi-token',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Input validation failed: ${tokenValidation.violations.join(', ')}`
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Token tidak valid' 
      }, { status: 400 });
    }

    // Validate the token with enhanced security checks
    const validationResult = await validateResetToken(tokenValidation.sanitized, clientInfo);
    
    // Record the validation attempt
    await tokenValidationLimiter.recordAttempt(clientInfo.ip, validationResult.valid, {
      tokenValid: validationResult.valid,
      reason: validationResult.valid ? 'valid' : validationResult.code,
      userId: validationResult.tokenData?.user_id,
      securityWarnings: validationResult.securityWarnings?.length || 0
    });

    if (!validationResult.valid) {
      await logSecurityEvent({
        type: 'invalid_token_validation',
        path: '/api/auth/validasi-token',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Invalid token validation: ${validationResult.reason}`,
        metadata: {
          code: validationResult.code,
          tokenPrefix: tokenValidation.sanitized.substring(0, 8) // Log only first 8 chars for security
        }
      } as SecurityEvent);

      return NextResponse.json({ 
        valid: false,
        message: validationResult.reason 
      }, { status: 400 });
    }

    // Log successful validation
    await logSecurityEvent({
      type: 'token_validation_successful',
      path: '/api/auth/validasi-token',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      userId: validationResult.tokenData?.user_id,
      message: 'Token validation successful',
      metadata: {
        hasSecurityWarnings: (validationResult.securityWarnings?.length || 0) > 0,
        securityWarningsCount: validationResult.securityWarnings?.length || 0
      }
    } as SecurityEvent);

    return NextResponse.json({ 
      valid: true,
      expiresAt: validationResult.tokenData?.expires_at,
      hasSecurityWarnings: (validationResult.securityWarnings?.length || 0) > 0,
      securityWarnings: validationResult.securityWarnings || []
    });

  } catch (error) {
    console.error('Token validation error:', error);
    
    await logSecurityEvent({
      type: 'token_validation_error',
      path: '/api/auth/validasi-token',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      message: `Token validation error: ${error instanceof Error ? error.message : String(error)}`
    } as SecurityEvent);

    return NextResponse.json({ 
      message: 'Terjadi kesalahan saat memvalidasi token' 
    }, { status: 500 });
  }
}

// Optional: Add rate limit info endpoint
export async function POST(req: NextRequest) {
  const clientInfo = getClientInfo(req);

  try {
    const rateLimitResult = await tokenValidationLimiter.checkAndLimit(clientInfo.ip);
    
    return NextResponse.json({
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime,
      canValidate: rateLimitResult.success
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Unable to check rate limit status' 
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';