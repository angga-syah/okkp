import { NextRequest, NextResponse } from 'next/server';
import nodemailer from "nodemailer";
import { z } from 'zod';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

// In-memory rate limiting untuk Vercel hobby plan
const rateLimitMap = new Map<string, { count: number; resetTime: number; lockoutTime: number }>();
const emailRateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Security configurations
const SECURITY_CONFIG = {
  maxAttempts: 3,
  windowMinutes: 15,
  lockoutMinutes: 30,
  maxEmailsPerHour: 2,
  maxInputLength: {
    name: 100,
    email: 100,
    message: 2000
  }
};

// Security patterns untuk deteksi serangan
const SECURITY_PATTERNS = {
  sqlInjection: [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|EXEC|DECLARE|SCRIPT)(\s|'|"|$|\*|\\)/i,
    /(\s|^)(FROM|WHERE)(\s+)(users|accounts|passwords|admin)(\s|'|"|$|\*|\\)/i,
    /(\s|^)(--|;--|\*\*|#|\/\*|\*\/|@@)(\s|'|"|$|\*|\\)/i,
    /'(\s)*(or|and)(\s)*'.*'(\s)*=/i,
    /1(\s)*=(\s)*1/i,
    /admin'(\s)*--/i
  ],
  xss: [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript\s*:/gi,
    /on(load|click|mouseover|mouseout|submit|focus|blur|change|select|keydown|keyup|keypress)\s*=/gi,
    /<iframe[^>]*>/gi,
    /<img[^>]*onerror/gi,
    /<svg[^>]*onload/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /expression\s*\(/gi
  ],
  documentBomb: [
    /(\s|^)(LOAD_FILE|INTO\s+OUTFILE|DUMPFILE)(\s|'|"|$|\*|\\)/i,
    /<\?xml[^>]*>[\s\S]*<!ENTITY/i,
    /<!ENTITY[^>]*>/i,
    /%[a-zA-Z0-9_]+;/g // XML entity references
  ]
};

const contactTranslations = {
  en: {
    validation: {
      nameMin: "Name must be at least 2 characters",
      nameMax: "Name cannot exceed 100 characters",
      nameFormat: "Name contains invalid characters",
      emailInvalid: "Invalid email format",
      emailTooLong: "Email is too long",
      messageMin: "Message must be at least 10 characters",
      messageMax: "Message cannot exceed 2000 characters",
      tokenRequired: "Security token is required",
      suspiciousContent: "Content contains suspicious patterns"
    },
    errors: {
      methodNotAllowed: "Method not allowed",
      invalidContentType: "Invalid content type",
      invalidFormat: "Invalid data format",
      processingFailed: "Failed to process data",
      validationFailed: "Data validation failed",
      serverConfig: "Service temporarily unavailable",
      securityVerification: "Security verification failed. Please try again.",
      sendingFailed: "Failed to send message. Please try again later.",
      rateLimited: "Too many requests. Please wait before trying again.",
      accountLocked: "Account temporarily locked due to suspicious activity",
      emailRateLimited: "Email limit reached. Please try again later."
    },
    success: {
      messageSent: "Thank you, your message has been sent successfully"
    },
    email: {
      subject: "New Contact Form Submission from",
      heading: "New Contact Form Submission",
      nameLabel: "Name:",
      emailLabel: "Email:",
      messageLabel: "Message:"
    }
  },
  id: {
    validation: {
      nameMin: "Nama minimal 2 karakter",
      nameMax: "Nama maksimal 100 karakter",
      nameFormat: "Nama mengandung karakter tidak valid",
      emailInvalid: "Format email tidak valid",
      emailTooLong: "Email terlalu panjang",
      messageMin: "Pesan minimal 10 karakter",
      messageMax: "Pesan maksimal 2000 karakter",
      tokenRequired: "Token keamanan diperlukan",
      suspiciousContent: "Konten mengandung pola mencurigakan"
    },
    errors: {
      methodNotAllowed: "Metode tidak diizinkan",
      invalidContentType: "Format data tidak valid",
      invalidFormat: "Format data tidak valid",
      processingFailed: "Gagal memproses data",
      validationFailed: "Validasi data gagal",
      serverConfig: "Layanan sementara tidak tersedia",
      securityVerification: "Verifikasi keamanan gagal. Silakan coba lagi.",
      sendingFailed: "Gagal mengirim pesan. Silakan coba lagi nanti.",
      rateLimited: "Terlalu banyak permintaan. Harap tunggu sebelum mencoba lagi.",
      accountLocked: "Akun sementara dikunci karena aktivitas mencurigakan",
      emailRateLimited: "Batas email tercapai. Silakan coba lagi nanti."
    },
    success: {
      messageSent: "Terima kasih, pesan Anda berhasil dikirim"
    },
    email: {
      subject: "Kiriman Formulir Kontak Baru dari",
      heading: "Kiriman Formulir Kontak Baru",
      nameLabel: "Nama:",
      emailLabel: "Email:",
      messageLabel: "Pesan:"
    }
  }
};

// Security validation functions
function detectSecurityThreats(input: string): string[] {
  const threats: string[] = [];
  
  // Check SQL injection patterns
  for (const pattern of SECURITY_PATTERNS.sqlInjection) {
    if (pattern.test(input)) {
      threats.push('SQL injection attempt detected');
      break;
    }
  }
  
  // Check XSS patterns
  for (const pattern of SECURITY_PATTERNS.xss) {
    if (pattern.test(input)) {
      threats.push('XSS attempt detected');
      break;
    }
  }
  
  // Check document bomb patterns
  for (const pattern of SECURITY_PATTERNS.documentBomb) {
    if (pattern.test(input)) {
      threats.push('Document bomb attempt detected');
      break;
    }
  }
  
  return threats;
}

function sanitizeInput(input: string): string {
  return input
    .trim()
    // Remove potential XSS
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on(load|click|mouseover|mouseout|submit|focus|blur|change|select|keydown|keyup|keypress)\s*=/gi, '')
    // Remove potential SQL injection
    .replace(/(['";])/g, '')
    .replace(/(--|;--|\/\*|\*\/)/g, '')
    // HTML encode dangerous characters
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // Remove null bytes and control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent') || '';
  
  const ip = forwarded ? forwarded.split(',')[0] : realIp || '127.0.0.1';
  
  // Create fingerprint combining IP and partial user agent
  const fingerprint = `${ip}_${userAgent.substring(0, 50)}`;
  return fingerprint;
}

function cleanupRateLimitMaps(): void {
  const now = Date.now();
  
  // Cleanup rate limit map
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime && now > value.lockoutTime) {
      rateLimitMap.delete(key);
    }
  }
  
  // Cleanup email rate limit map
  for (const [key, value] of emailRateLimitMap.entries()) {
    if (now > value.resetTime) {
      emailRateLimitMap.delete(key);
    }
  }
}

function checkRateLimit(identifier: string): { allowed: boolean; reason?: string; waitTime?: number } {
  cleanupRateLimitMaps();
  
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + (SECURITY_CONFIG.windowMinutes * 60 * 1000),
      lockoutTime: 0
    });
    return { allowed: true };
  }
  
  // Check if account is locked
  if (entry.lockoutTime > now) {
    return {
      allowed: false,
      reason: 'account_locked',
      waitTime: Math.ceil((entry.lockoutTime - now) / 1000)
    };
  }
  
  // Reset counter if window expired
  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + (SECURITY_CONFIG.windowMinutes * 60 * 1000);
    entry.lockoutTime = 0;
    return { allowed: true };
  }
  
  // Check rate limit
  if (entry.count >= SECURITY_CONFIG.maxAttempts) {
    entry.lockoutTime = now + (SECURITY_CONFIG.lockoutMinutes * 60 * 1000);
    return {
      allowed: false,
      reason: 'rate_limited',
      waitTime: Math.ceil((entry.lockoutTime - now) / 1000)
    };
  }
  
  entry.count++;
  return { allowed: true };
}

function checkEmailRateLimit(email: string): { allowed: boolean; waitTime?: number } {
  cleanupRateLimitMaps();
  
  const now = Date.now();
  const entry = emailRateLimitMap.get(email);
  
  if (!entry) {
    emailRateLimitMap.set(email, {
      count: 1,
      resetTime: now + (60 * 60 * 1000) // 1 hour
    });
    return { allowed: true };
  }
  
  // Reset counter if window expired
  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + (60 * 60 * 1000);
    return { allowed: true };
  }
  
  // Check email rate limit
  if (entry.count >= SECURITY_CONFIG.maxEmailsPerHour) {
    return {
      allowed: false,
      waitTime: Math.ceil((entry.resetTime - now) / 1000)
    };
  }
  
  entry.count++;
  return { allowed: true };
}

// Enhanced Zod schema with security validation
const createContactSchema = (lang: 'en' | 'id' = 'en') => {
  const t = contactTranslations[lang].validation;
  
  return z.object({
    name: z.string()
      .trim()
      .min(2, { message: t.nameMin })
      .max(SECURITY_CONFIG.maxInputLength.name, { message: t.nameMax })
      .refine(value => {
        // Allow letters, spaces, hyphens, apostrophes, and common international characters
        const namePattern = /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\s\-'\.]+$/;
        return namePattern.test(value);
      }, { message: t.nameFormat })
      .refine(value => {
        const threats = detectSecurityThreats(value);
        return threats.length === 0;
      }, { message: t.suspiciousContent }),
    
    email: z.string()
      .trim()
      .email({ message: t.emailInvalid })
      .max(SECURITY_CONFIG.maxInputLength.email, { message: t.emailTooLong })
      .refine(value => {
        const threats = detectSecurityThreats(value);
        return threats.length === 0;
      }, { message: t.suspiciousContent }),
    
    message: z.string()
      .trim()
      .min(10, { message: t.messageMin })
      .max(SECURITY_CONFIG.maxInputLength.message, { message: t.messageMax })
      .refine(value => {
        const threats = detectSecurityThreats(value);
        return threats.length === 0;
      }, { message: t.suspiciousContent }),
    
    turnstileToken: z.string()
      .min(1, { message: t.tokenRequired }),
      
    language: z.enum(['en', 'id']).default('en')
  });
};

// Response type
type ResponseData = {
  success?: boolean;
  message?: string;
  error?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
  waitTime?: number;
}

// Enhanced Turnstile verification with retry logic
async function verifyTurnstileToken(token: string, retries = 2): Promise<{
  success: boolean;
  reason?: string;
  details?: string;
}> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const formData = new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY || '',
        response: token
      });

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'ContactFormAPI/1.0'
          },
          body: formData
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (attempt === retries) {
          return {
            success: false,
            reason: 'Service verification failed'
          };
        }
        continue;
      }

      const data = await response.json();
      
      if (data.success) {
        return { success: true };
      }
      
      return {
        success: false,
        reason: 'Token verification failed',
        details: Array.isArray(data['error-codes']) ? data['error-codes'].join(', ') : 'Unknown error'
      };

    } catch (error) {
      if (attempt === retries) {
        return {
          success: false,
          reason: 'Verification service unavailable'
        };
      }
    }
  }

  return {
    success: false,
    reason: 'Verification failed'
  };
}

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  
  try {
    // Rate limiting check
    const rateLimitResult = checkRateLimit(clientId);
    if (!rateLimitResult.allowed) {
      const lang = 'en'; // Default language for rate limit errors
      const t = contactTranslations[lang].errors;
      
      return NextResponse.json<ResponseData>({ 
        error: rateLimitResult.reason === 'account_locked' ? t.accountLocked : t.rateLimited,
        waitTime: rateLimitResult.waitTime,
        validationErrors: [{ 
          field: 'general', 
          message: rateLimitResult.reason === 'account_locked' ? t.accountLocked : t.rateLimited
        }]
      }, { status: 429 });
    }

    // Content type validation
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json<ResponseData>({ 
        error: "Invalid request format",
        validationErrors: [{ 
          field: 'general', 
          message: "Invalid request format" 
        }]
      }, { status: 400 });
    }
    
    // Request size limit (document bomb protection)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10000) { // 10KB limit
      return NextResponse.json<ResponseData>({ 
        error: "Request too large",
        validationErrors: [{ 
          field: 'general', 
          message: "Request too large" 
        }]
      }, { status: 413 });
    }

    const parsedBody = await request.json();
    
    // Language detection
    const lang = (parsedBody?.language || 'en') as 'en' | 'id';
    const t = contactTranslations[lang].errors;
    const successMsg = contactTranslations[lang].success;
    const emailT = contactTranslations[lang].email;

    // Zod validation
    const ContactSchema = createContactSchema(lang);
    const validationResult = ContactSchema.safeParse(parsedBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path[0] as string,
        message: err.message
      }));

      return NextResponse.json<ResponseData>({ 
        error: t.validationFailed,
        validationErrors: errors
      }, { status: 400 });
    }

    const { name, email, message, turnstileToken } = validationResult.data;
    
    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedMessage = sanitizeInput(message);

    // Email rate limiting (mail bomb protection)
    const emailRateLimit = checkEmailRateLimit(sanitizedEmail);
    if (!emailRateLimit.allowed) {
      return NextResponse.json<ResponseData>({ 
        error: t.emailRateLimited,
        waitTime: emailRateLimit.waitTime,
        validationErrors: [{ 
          field: 'email', 
          message: t.emailRateLimited 
        }]
      }, { status: 429 });
    }

    // Turnstile verification
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.error("Missing TURNSTILE_SECRET_KEY environment variable");
      return NextResponse.json<ResponseData>({ 
        error: t.serverConfig,
        validationErrors: [{ 
          field: 'general', 
          message: t.serverConfig 
        }]
      }, { status: 503 });
    }

    const tokenVerification = await verifyTurnstileToken(turnstileToken);
    
    if (!tokenVerification.success) {
      return NextResponse.json<ResponseData>({ 
        error: t.securityVerification,
        validationErrors: [{ 
          field: 'turnstileToken', 
          message: t.securityVerification 
        }]
      }, { status: 403 });
    }

    // Email configuration with security settings
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });

    // Enhanced email content with security headers
    const mailOptions = {
      from: `"Website Contact Form" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      replyTo: sanitizedEmail,
      subject: `${emailT.subject} ${sanitizedName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
          <h2 style="color: #333;">${emailT.heading}</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>${emailT.nameLabel}</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${sanitizedName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>${emailT.emailLabel}</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${sanitizedEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;" colspan="2"><strong>${emailT.messageLabel}</strong></td>
            </tr>
            <tr>
              <td style="padding: 15px; border: 1px solid #ddd; white-space: pre-wrap;" colspan="2">${sanitizedMessage}</td>
            </tr>
          </table>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This message was sent through the website contact form with security verification.
          </p>
        </div>
      `,
      text: `
        ${emailT.heading}
        
        ${emailT.nameLabel} ${sanitizedName}
        ${emailT.emailLabel} ${sanitizedEmail}
        
        ${emailT.messageLabel}
        ${sanitizedMessage}
        
        ---
        This message was sent through the website contact form with security verification.
      `,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'ContactForm/1.0'
      }
    };

    // Send email with timeout
    await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 15000)
      )
    ]);
    
    // Success response
    return NextResponse.json<ResponseData>({ 
      success: true, 
      message: successMsg.messageSent 
    }, { status: 200 });

  } catch (error) {
    // Enhanced error handling without exposing sensitive information
    console.error("Contact form error:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      clientId,
      timestamp: new Date().toISOString()
    });

    // Increment rate limit counter on error to prevent abuse
    const entry = rateLimitMap.get(clientId);
    if (entry) {
      entry.count++;
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json<ResponseData>({
        error: "Invalid request format",
        validationErrors: [{ 
          field: 'general', 
          message: "Invalid request format" 
        }]
      }, { status: 400 });
    }

    return NextResponse.json<ResponseData>({ 
      error: "Service temporarily unavailable",
      validationErrors: [{ 
        field: 'general', 
        message: "Please try again later" 
      }]
    }, { status: 503 });
  }
}

// Reject all other HTTP methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}