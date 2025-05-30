// src/app/api/auth/resetpw/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { hash, compare } from 'bcryptjs';
import { createTransport } from 'nodemailer';
import { supabaseAdmin } from '@/lib/sb_admin';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';
import { logSecurityEvent } from '@/lib/security';

interface RequestBody {
  token: string;
  password: string;
  fingerprint?: string;
  timestamp?: number;
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

// Adjusted rate limiting - less aggressive for password reset attempts
const resetAttemptLimiter = new EnhancedRateLimiter("password_reset_attempt", {
  maxAttempts: 10, // Increased from 5
  windowMinutes: 60,
  lockoutMinutes: 30, // Reduced from 120
  progressiveDelay: false // Disabled to prevent cascading delays
});

// More lenient token validation rate limiter
const tokenValidationLimiter = new EnhancedRateLimiter("token_validation", {
  maxAttempts: 20, // Increased from 10
  windowMinutes: 10,
  lockoutMinutes: 15, // Reduced from 30
  progressiveDelay: false
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
      type: 'used_token_reuse_attempt',
      path: '/api/auth/resetpw',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      userId: tokenData.user_id,
      message: 'Attempt to reuse already used reset token'
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
      type: 'reset_attempt_locked_account',
      path: '/api/auth/resetpw',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      userId: tokenData.user_id,
      message: 'Password reset attempted for locked account'
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
      type: 'reset_security_warning',
      path: '/api/auth/resetpw',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      userId: tokenData.user_id,
      message: `Security warning during password reset: ${securityWarnings.join(', ')}`,
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

// Enhanced password hashing with additional security
const createSecurePasswordHash = async (password: string): Promise<string> => {
  // Use higher salt rounds for better security
  const saltRounds = 14; // Increased from default 10
  return await hash(password, saltRounds);
};

// Main POST handler
export async function POST(req: NextRequest) {
  const clientInfo = getClientInfo(req);

  try {
    // Parse request body
    const body = await req.json() as RequestBody;
    const { token, password, fingerprint, timestamp } = body;

    // Basic validation
    if (!token || !password) {
      await logSecurityEvent({
        type: 'incomplete_reset_request',
        path: '/api/auth/resetpw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: 'Missing token or password in reset request'
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Token dan password harus diisi' 
      }, { status: 400 });
    }

    // Check rate limiting for reset attempts - only if this specific IP has been problematic
    const resetRateLimit = await resetAttemptLimiter.checkAndLimit(clientInfo.ip);
    if (!resetRateLimit.success && resetRateLimit.isLocked) {
      await logSecurityEvent({
        type: 'password_reset_rate_limited',
        path: '/api/auth/resetpw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Password reset rate limited: ${resetRateLimit.remaining} remaining`
      } as SecurityEvent);

      const retryAfter = Math.ceil((resetRateLimit.resetTime - Date.now()) / 1000);
      
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
    const tokenValidation = SecurityValidator.validateAndSanitize(token, {
      maxLength: 100,
      checkSQLInjection: true,
      checkXSS: true,
      checkPathTraversal: true
    });

    const passwordValidation = SecurityValidator.validateAndSanitize(password, {
      maxLength: 200,
      checkSQLInjection: true,
      checkXSS: true
    });

    if (!tokenValidation.isValid || !passwordValidation.isValid) {
      await logSecurityEvent({
        type: 'malicious_reset_attempt',
        path: '/api/auth/resetpw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Input validation failed: ${[...tokenValidation.violations, ...passwordValidation.violations].join(', ')}`
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Input tidak valid' 
      }, { status: 400 });
    }

    // Enhanced password strength validation with detailed feedback
    const passwordStrengthCheck = SecurityValidator.validatePassword(passwordValidation.sanitized);
    console.log('Password strength check result:', passwordStrengthCheck); // Debug log

if (!passwordStrengthCheck.isValid) {
  await resetAttemptLimiter.recordAttempt(clientInfo.ip, false, {
    reason: 'weak_password',
    score: passwordStrengthCheck.score
  });

  // Simple error message
  let errorMessage = 'Password tidak memenuhi kriteria keamanan.';
  
  if (passwordStrengthCheck.feedback && passwordStrengthCheck.feedback.length > 0) {
    errorMessage += ` ${passwordStrengthCheck.feedback[0]}`;
  } else {
    errorMessage += ' Gunakan minimal 8 karakter dengan kombinasi huruf besar, kecil, angka, dan simbol.';
  }

  return NextResponse.json({ 
    message: errorMessage,
    score: passwordStrengthCheck.score
  }, { status: 400 });
}
    // Check token validation rate limit (more lenient)
    const tokenRateLimit = await tokenValidationLimiter.checkAndLimit(clientInfo.ip);
    if (!tokenRateLimit.success && tokenRateLimit.isLocked) {
      return NextResponse.json({ 
        message: 'Terlalu banyak validasi token. Tunggu beberapa menit.' 
      }, { status: 429 });
    }

    // Validate token with enhanced security checks
    const tokenValidationResult = await validateResetToken(tokenValidation.sanitized, clientInfo);
    
    if (!tokenValidationResult.valid) {
      await resetAttemptLimiter.recordAttempt(clientInfo.ip, false, {
        reason: tokenValidationResult.code,
        token: tokenValidation.sanitized.substring(0, 8) // Log only first 8 chars for security
      });

      await tokenValidationLimiter.recordAttempt(clientInfo.ip, false, {
        reason: tokenValidationResult.code
      });

      await logSecurityEvent({
        type: 'invalid_token_reset_attempt',
        path: '/api/auth/resetpw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Invalid token used in reset attempt: ${tokenValidationResult.reason}`
      } as SecurityEvent);

      return NextResponse.json({ 
        message: tokenValidationResult.reason 
      }, { status: 400 });
    }

    const { tokenData, securityWarnings } = tokenValidationResult;

    // Record successful token validation
    await tokenValidationLimiter.recordAttempt(clientInfo.ip, true, {
      userId: tokenData.user_id,
      securityWarnings: securityWarnings?.length || 0
    });

    // Check if this is a potential password that was just used (optional check)
    try {
      // Get current user password from users table
      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('password')
        .eq('id', tokenData.user_id)
        .single();

      if (currentUser?.password) {
        const isCurrentPassword = await compare(passwordValidation.sanitized, currentUser.password);
        if (isCurrentPassword) {
          await logSecurityEvent({
            type: 'reset_with_current_password',
            path: '/api/auth/resetpw',
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            userId: tokenData.user_id,
            message: 'User attempted to reset with current password'
          } as SecurityEvent);

          return NextResponse.json({ 
            message: 'Password baru tidak boleh sama dengan password saat ini' 
          }, { status: 400 });
        }
      }
    } catch (compareError) {
      console.warn('Could not compare with current password:', compareError);
      // Continue with reset - this is not a critical error
    }

    // Create secure password hash
    const hashedPassword = await createSecurePasswordHash(passwordValidation.sanitized);

    // Start transaction to update password and mark token as used
    try {
      // Update user password and reset security fields
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          password: hashedPassword,
          failed_attempts: 0, // Reset failed attempts
          is_locked: false,   // Unlock account if it was locked
          last_password_change: new Date().toISOString(),
          password_changed_by_ip: clientInfo.ip
        })
        .eq('id', tokenData.user_id);

      if (updateError) {
        throw updateError;
      }

      // Mark token as used
      const { error: tokenUpdateError } = await supabaseAdmin
        .from('password_reset_tokens')
        .update({ 
          used: true,
          used_at: new Date().toISOString(),
          used_by_ip: clientInfo.ip,
          used_by_fingerprint: clientInfo.fingerprint
        })
        .eq('token', tokenValidation.sanitized);

      if (tokenUpdateError) {
        throw tokenUpdateError;
      }

      // Clean up any other unused tokens for this user
      await supabaseAdmin
        .from('password_reset_tokens')
        .delete()
        .eq('user_id', tokenData.user_id)
        .eq('used', false);

      // Record successful password reset
      await resetAttemptLimiter.recordAttempt(clientInfo.ip, true, {
        userId: tokenData.user_id,
        hasSecurityWarnings: (securityWarnings?.length || 0) > 0
      });

      await logSecurityEvent({
        type: 'password_reset_successful',
        path: '/api/auth/resetpw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        userId: tokenData.user_id,
        message: 'Password successfully reset',
        metadata: {
          securityWarnings: securityWarnings || [],
          passwordStrengthScore: passwordStrengthCheck.score
        }
      } as SecurityEvent);

      // Optional: Send notification email about password change
      try {
        const transporter = createTransport({
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
        
        await transporter.sendMail({
          from: process.env.ADMIN_EMAIL,
          to: tokenData.users.email,
          subject: '✅ Password Berhasil Direset - Fortuna Admin',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">Password Berhasil Direset</h2>
              <p>Password akun admin Anda telah berhasil direset pada ${new Date().toLocaleString('id-ID')}.</p>
              <div style="background: #f0f9ff; border: 1px solid #0ea5e9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3 style="color: #0ea5e9; margin-top: 0;">ℹ️ Informasi Keamanan:</h3>
                <ul>
                  <li>IP Address: ${clientInfo.ip}</li>
                  <li>Waktu: ${new Date().toLocaleString('id-ID')}</li>
                  ${securityWarnings && securityWarnings.length > 0 ? 
                    `<li style="color: #f59e0b;">⚠️ Peringatan: ${securityWarnings.join(', ')}</li>` : 
                    '<li style="color: #059669;">✅ Tidak ada peringatan keamanan</li>'
                  }
                </ul>
              </div>
              <p>Jika ini bukan Anda, segera hubungi administrator sistem.</p>
              <p><small>Email otomatis dari sistem Fortuna Admin</small></p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send password change notification:', emailError);
        // Don't fail the reset if email fails
      }

      return NextResponse.json({ 
        message: 'Password berhasil direset',
        securityInfo: {
          hasWarnings: (securityWarnings?.length || 0) > 0,
          passwordStrength: passwordStrengthCheck.score
        }
      });

    } catch (dbError) {
      console.error('Database error during password reset:', dbError);
      
      await logSecurityEvent({
        type: 'password_reset_db_error',
        path: '/api/auth/resetpw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        userId: tokenData.user_id,
        message: `Database error during password reset: ${dbError instanceof Error ? dbError.message : String(dbError)}`
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Terjadi kesalahan sistem. Silakan coba lagi.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Password reset error:', error);
    
    await logSecurityEvent({
      type: 'password_reset_system_error',
      path: '/api/auth/resetpw',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      message: `System error during password reset: ${error instanceof Error ? error.message : String(error)}`
    } as SecurityEvent);

    return NextResponse.json({ 
      message: 'Terjadi kesalahan sistem. Silakan coba lagi nanti.' 
    }, { status: 500 });
  }
}

// Enhanced token validation endpoint
export async function GET(req: NextRequest) {
  const clientInfo = getClientInfo(req);
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ 
      message: 'Token tidak ditemukan' 
    }, { status: 400 });
  }

  try {
    // Check token validation rate limit (more lenient)
    const rateLimit = await tokenValidationLimiter.checkAndLimit(clientInfo.ip);
    if (!rateLimit.success && rateLimit.isLocked) {
      return NextResponse.json({ 
        message: 'Terlalu banyak validasi token. Tunggu beberapa menit.' 
      }, { status: 429 });
    }

    // Validate token format
    const tokenValidation = SecurityValidator.validateAndSanitize(token, {
      maxLength: 100,
      checkSQLInjection: true,
      checkXSS: true
    });

    if (!tokenValidation.isValid) {
      await logSecurityEvent({
        type: 'malicious_token_validation',
        path: '/api/auth/resetpw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Malicious token validation attempt: ${tokenValidation.violations.join(', ')}`
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Token tidak valid' 
      }, { status: 400 });
    }

    // Validate the token
    const validationResult = await validateResetToken(tokenValidation.sanitized, clientInfo);
    
    await tokenValidationLimiter.recordAttempt(clientInfo.ip, validationResult.valid, {
      tokenValid: validationResult.valid,
      reason: validationResult.valid ? 'valid' : validationResult.code
    });

    if (!validationResult.valid) {
      return NextResponse.json({ 
        valid: false,
        message: validationResult.reason 
      }, { status: 400 });
    }

    await logSecurityEvent({
      type: 'token_validation_success',
      path: '/api/auth/resetpw',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      userId: validationResult.tokenData?.user_id,
      message: 'Token validation successful'
    } as SecurityEvent);

    return NextResponse.json({ 
      valid: true,
      expiresAt: validationResult.tokenData?.expires_at,
      hasSecurityWarnings: (validationResult.securityWarnings?.length || 0) > 0
    });

  } catch (error) {
    console.error('Token validation error:', error);
    
    await logSecurityEvent({
      type: 'token_validation_error',
      path: '/api/auth/resetpw',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      message: `Token validation error: ${error instanceof Error ? error.message : String(error)}`
    } as SecurityEvent);

    return NextResponse.json({ 
      message: 'Terjadi kesalahan saat memvalidasi token' 
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';