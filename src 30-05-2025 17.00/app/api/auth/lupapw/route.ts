// src/app/api/auth/lupapw/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createTransport, Transporter } from 'nodemailer';
import { supabaseAdmin } from '@/lib/sb_admin';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';
import { logSecurityEvent } from '@/lib/security';

interface RequestBody {
  email: string;
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

// Enhanced rate limiting for password reset requests
const passwordResetLimiter = new EnhancedRateLimiter("password_reset", {
  maxAttempts: 3,
  windowMinutes: 60, // 3 attempts per hour
  lockoutMinutes: 120, // 2 hour lockout
  progressiveDelay: true
});

// Email rate limiter to prevent mail bombing
const emailLimiter = new EnhancedRateLimiter("email_send", {
  maxAttempts: 5,
  windowMinutes: 60, // 5 emails per hour per IP
  lockoutMinutes: 60,
  progressiveDelay: false
});

// Enhanced email template with security features
const generateSecureEmailTemplate = (resetUrl: string, userEmail: string, token: string): string => {
  // Generate a verification code for additional security
  const verificationCode = token.substring(0, 8).toUpperCase();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - Fortuna Admin</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .code { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 18px; letter-spacing: 2px; text-align: center; margin: 20px 0; }
            .warning { background: #fef2f2; border: 1px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Reset Password</h1>
                <p>Fortuna Admin System</p>
            </div>
            
            <div class="content">
                <h2>Permintaan Reset Password</h2>
                <p>Halo,</p>
                <p>Kami menerima permintaan untuk mereset password akun admin Anda yang terdaftar dengan email: <strong>${userEmail}</strong></p>
                
                <div class="warning">
                    <h3>⚠️ Peringatan Keamanan</h3>
                    <ul>
                        <li>Jika Anda tidak meminta reset password, segera abaikan email ini</li>
                        <li>Link ini akan kedaluwarsa dalam <strong>1 jam</strong></li>
                        <li>Link hanya dapat digunakan <strong>satu kali</strong></li>
                        <li>Jangan bagikan link atau kode ini kepada siapapun</li>
                    </ul>
                </div>

                <h3>Kode Verifikasi:</h3>
                <div class="code">${verificationCode}</div>
                <p><small>Simpan kode ini untuk verifikasi tambahan</small></p>

                <p>Klik tombol di bawah untuk mereset password Anda:</p>
                <p style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password Sekarang</a>
                </p>
                
                <p>Atau copy link berikut ke browser Anda:</p>
                <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">
                    ${resetUrl}
                </p>

                <div class="warning">
                    <h3>🛡️ Tips Keamanan untuk Password Baru:</h3>
                    <ul>
                        <li>Minimal 8 karakter</li>
                        <li>Kombinasi huruf besar, kecil, angka, dan simbol</li>
                        <li>Hindari informasi pribadi atau kata yang umum</li>
                        <li>Gunakan password yang unik untuk setiap akun</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>Email ini dikirim secara otomatis dari sistem Fortuna Admin</p>
                <p>Jika Anda memiliki pertanyaan, hubungi administrator sistem</p>
                <p><small>Dikirim pada: ${new Date().toLocaleString('id-ID')}</small></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

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

// Enhanced email transporter with security settings
const createSecureTransporter = (): Transporter => {
  return createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'HIGH:!aNULL:!MD5:!3DES'
    },
    pool: true,
    maxConnections: 3, // Limit concurrent connections
    maxMessages: 10,   // Limit messages per connection
    rateDelta: 1000,   // Rate limiting
    rateLimit: 5       // Max 5 emails per second
  });
};

// Main handler function
export async function POST(req: NextRequest) {
  const clientInfo = getClientInfo(req);
  
  try {
    // Parse and validate request body
    const body = await req.json() as RequestBody;
    const { email, fingerprint, timestamp } = body;

    // Basic request validation
    if (!email) {
      await logSecurityEvent({
        type: 'invalid_password_reset_request',
        path: '/api/auth/lupapw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: 'Missing email parameter'
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Email tidak valid' 
      }, { status: 400 });
    }

    // Enhanced input validation
    const emailValidation = SecurityValidator.validateAndSanitize(email, {
      maxLength: 254,
      checkSQLInjection: true,
      checkXSS: true
    });

    if (!emailValidation.isValid) {
      await logSecurityEvent({
        type: 'malicious_password_reset_attempt',
        path: '/api/auth/lupapw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Input validation failed: ${emailValidation.violations.join(', ')}`
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Input tidak valid' 
      }, { status: 400 });
    }

    const sanitizedEmail = emailValidation.sanitized.toLowerCase();

    // Validate email format
    if (!SecurityValidator.validateEmail(sanitizedEmail)) {
      return NextResponse.json({ 
        message: 'Format email tidak valid' 
      }, { status: 400 });
    }

    // Check rate limiting for password reset requests
    const resetRateLimit = await passwordResetLimiter.checkAndLimit(clientInfo.ip);
    if (!resetRateLimit.success) {
      await logSecurityEvent({
        type: 'password_reset_rate_limited',
        path: '/api/auth/lupapw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: `Rate limit exceeded for password reset: ${resetRateLimit.remaining} remaining`
      } as SecurityEvent);

      const retryAfter = Math.ceil((resetRateLimit.resetTime - Date.now()) / 1000);
      
      return NextResponse.json({ 
        message: `Terlalu banyak permintaan reset password. Coba lagi dalam ${Math.ceil(retryAfter / 60)} menit.` 
      }, { 
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString()
        }
      });
    }

    // Check email sending rate limit
    const emailRateLimit = await emailLimiter.checkAndLimit(`email:${clientInfo.ip}`);
    if (!emailRateLimit.success) {
      await logSecurityEvent({
        type: 'email_rate_limited',
        path: '/api/auth/lupapw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: 'Email sending rate limit exceeded'
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Terlalu banyak email dikirim. Tunggu beberapa saat.' 
      }, { status: 429 });
    }

    // Check if email exists in auth.users database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', sanitizedEmail)
      .maybeSingle();

    // Always record the attempt regardless of whether user exists
    await passwordResetLimiter.recordAttempt(clientInfo.ip, true, {
      email: sanitizedEmail,
      userExists: !!user,
      fingerprint: clientInfo.fingerprint
    });

    await emailLimiter.recordAttempt(`email:${clientInfo.ip}`, true, {
      email: sanitizedEmail,
      type: 'password_reset'
    });

    // For security, always return the same message
    const standardMessage = 'Jika email terdaftar, link reset password akan dikirim.';

    if (userError || !user) {
      // Log the attempt but don't reveal if user exists
      await logSecurityEvent({
        type: 'password_reset_attempt_unknown_email',
        path: '/api/auth/lupapw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        message: 'Password reset attempted for unknown email',
        metadata: { email: sanitizedEmail, fingerprint }
      } as SecurityEvent);

      return NextResponse.json({ message: standardMessage });
    }

    // Check if account is locked (if you have custom users table)
    let isLocked = false;
    if (user) {
      const { data: customUser } = await supabaseAdmin
        .from('users')
        .select('is_locked')
        .eq('email', sanitizedEmail)
        .maybeSingle();
      
      isLocked = customUser?.is_locked || false;
    }

    if (isLocked) {
      await logSecurityEvent({
        type: 'password_reset_locked_account',
        path: '/api/auth/lupapw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        userId: user.id,
        message: 'Password reset attempted for locked account'
      } as SecurityEvent);

      // Still return standard message for security
      return NextResponse.json({ message: standardMessage });
    }

    // Check for recent reset tokens for this user
    const { data: existingTokens } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (existingTokens && existingTokens.length > 0) {
      const lastTokenTime = new Date(existingTokens[0].created_at).getTime();
      const timeSinceLastToken = Date.now() - lastTokenTime;
      const minInterval = 5 * 60 * 1000; // 5 minutes

      if (timeSinceLastToken < minInterval) {
        await logSecurityEvent({
          type: 'password_reset_too_frequent',
          path: '/api/auth/lupapw',
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          userId: user.id,
          message: 'Password reset requested too frequently'
        } as SecurityEvent);

        return NextResponse.json({ 
          message: 'Link reset password baru saja dikirim. Tunggu beberapa menit sebelum meminta lagi.' 
        }, { status: 429 });
      }
    }

    // Generate secure token
    const token = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token valid for 1 hour

    // Clean up old tokens for this user
    await supabaseAdmin
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', user.id);

    // Insert new token with enhanced metadata
    const { error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: token,
        expires_at: expires.toISOString(),
        created_at: new Date().toISOString(),
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        fingerprint: clientInfo.fingerprint,
        used: false
      });

    if (tokenError) {
      console.error('Failed to create reset token:', tokenError);
      await logSecurityEvent({
        type: 'password_reset_token_creation_failed',
        path: '/api/auth/lupapw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        userId: user.id,
        message: 'Failed to create password reset token'
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Terjadi kesalahan sistem. Silakan coba lagi.' 
      }, { status: 500 });
    }

    // Generate secure reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/resetpw?token=${encodeURIComponent(token)}`;

    // Send email with enhanced security template
    try {
      const transporter = createSecureTransporter();
      const emailTemplate = generateSecureEmailTemplate(resetUrl, sanitizedEmail, token);

      await transporter.sendMail({
        from: {
          name: 'Fortuna Admin System',
          address: process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'noreply@fortuna.com'
        },
        to: sanitizedEmail,
        subject: '🔒 [URGENT] Reset Password - Fortuna Admin',
        html: emailTemplate,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'High',
          'X-Mailer': 'Fortuna Security System',
          'Reply-To': process.env.ADMIN_EMAIL || 'noreply@fortuna.com'
        },
        // Additional security headers
        attachments: [],
        alternatives: []
      });

      await logSecurityEvent({
        type: 'password_reset_email_sent',
        path: '/api/auth/lupapw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        userId: user.id,
        message: 'Password reset email sent successfully'
      } as SecurityEvent);

    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      
      // Clean up the token if email failed
      await supabaseAdmin
        .from('password_reset_tokens')
        .delete()
        .eq('token', token);

      await logSecurityEvent({
        type: 'password_reset_email_failed',
        path: '/api/auth/lupapw',
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        userId: user.id,
        message: 'Failed to send password reset email'
      } as SecurityEvent);

      return NextResponse.json({ 
        message: 'Gagal mengirim email. Silakan coba lagi nanti.' 
      }, { status: 500 });
    }

    return NextResponse.json({ message: standardMessage });

  } catch (error) {
    console.error('Password reset error:', error);
    
    await logSecurityEvent({
      type: 'password_reset_system_error',
      path: '/api/auth/lupapw',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      message: `System error in password reset: ${error instanceof Error ? error.message : String(error)}`
    } as SecurityEvent);

    return NextResponse.json({ 
      message: 'Terjadi kesalahan sistem. Silakan coba lagi nanti.' 
    }, { status: 500 });
  }
}

// Rate limit info endpoint
export async function GET(req: NextRequest) {
  const clientInfo = getClientInfo(req);

  try {
    const rateLimitResult = await passwordResetLimiter.checkAndLimit(clientInfo.ip);
    
    return NextResponse.json({
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime,
      canRequest: rateLimitResult.success
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Unable to check rate limit status' 
    }, { status: 500 });
  }
}

// Ensure this route is dynamic
export const dynamic = 'force-dynamic';