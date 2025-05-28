// app/api/order-complete/route.ts - Fixed Email Delivery Version
import { NextRequest, NextResponse } from 'next/server';
import { Invoice as InvoiceClient } from "xendit-node";
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import { sendMail } from '@/lib/mail';
import { getEmailTranslations } from '@/lib/translations';
import { supabaseAdmin, storeCustomerData } from '@/lib/sb';
import { validateService } from '@/lib/serviceValidator';
import { ensureDefaultServices } from '@/lib/services';

// Enhanced security configuration (unchanged)
const SECURITY_CONFIG = {
  RATE_LIMITS: {
    ORDER_CREATION: { max: 5, windowMinutes: 5 },
    EMAIL_SENDING: { max: 8, windowMinutes: 15 },
    FILE_UPLOAD: { max: 20, windowMinutes: 15 }
  },
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'application/pdf', 'image/jpeg', 'image/jpg', 
    'image/png', 'application/zip', 'application/x-zip-compressed'
  ],
  ALLOWED_EXTENSIONS: ['pdf', 'jpg', 'jpeg', 'png', 'zip'],
  MAX_INPUT_LENGTHS: {
    name: 100, email: 254, serviceName: 200, language: 10
  },
  SUSPICIOUS_PATTERNS: {
    SQL_INJECTION: [
      /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|EXEC|DECLARE|SCRIPT)(\s|'|"|$|\*|\\)/i,
      /(\s|^)(FROM|WHERE)(\s+)(users|accounts|passwords|admin)(\s|'|"|$|\*|\\)/i,
      /(\s|^)(--|;--|\*\*|#|\/\*|\*\/|@@)(\s|'|"|$|\*|\\)/i,
      /'(\s)*(or|and)(\s)*'.*'(\s)*=/i, /1(\s)*=(\s)*1/i, /admin'(\s)*--/i
    ],
    XSS: [
      /<script[^>]*>[\s\S]*?<\/script>/gi, /javascript\s*:/gi,
      /on(load|click|mouseover|mouseout|submit|focus|blur|change|select|keydown|keyup|keypress)\s*=/gi,
      /<iframe[^>]*>/gi, /<img[^>]*onerror/gi, /<svg[^>]*onload/gi,
      /data:text\/html/gi, /vbscript:/gi, /expression\s*\(/gi
    ],
    PATH_TRAVERSAL: [/\.\.\//g, /\.\.\\+/g, /%2e%2e%2f/gi, /%2e%2e%5c/gi, /\0/g]
  }
};

// Interfaces
interface SecurityViolation {
  type: 'sql_injection' | 'xss' | 'path_traversal' | 'rate_limit' | 'file_validation' | 'input_validation';
  field?: string;
  value?: string;
  message: string;
}

interface EnhancedCustomFile {
  filepath: string;
  originalFilename: string;
  newFilename: string;
  mimetype: string;
  size: number;
  hash?: string;
  isValidated: boolean;
}

interface ValidatedFormFields {
  customerName: string;
  customerEmail: string;
  serviceId: string;
  serviceName: string;
  amount: string;
  invoiceId?: string;
  paymentUrl?: string;
  sendPaymentLinkByEmail?: string;
  language?: string;
}

interface ValidatedFormFiles {
  allRequirements: EnhancedCustomFile | EnhancedCustomFile[];
}

// FIXED EMAIL SYSTEM - Ensures customer email is always sent
interface EmailInfo {
  customerInfo: {
    name: string;
    email: string;
    serviceName: string;
    invoiceId?: string;
    paymentUrl?: string;
  };
  language: string;
  orderId?: string;
}

class FixedEmailManager {
  // FIXED: Always send customer email, even without payment URL
  static async sendOrderEmails(emailInfo: EmailInfo): Promise<{
    adminSent: boolean;
    customerSent: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let adminSent = false;
    let customerSent = false;
    
    try {
      const t = getEmailTranslations(emailInfo.language);
      const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@evisa-service.com';
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@evisa-service.com';
      
      console.log(`[EMAIL] Starting email process for: ${emailInfo.customerInfo.email}`);
      
      // Send admin email (priority)
      try {
        const adminEmailContent = this.buildAdminEmailContent(emailInfo, t);
        const adminResult = await sendMail({
          from: `"E-Visa Service" <${fromEmail}>`,
          to: adminEmail,
          subject: `${t.adminEmailSubject} - ${emailInfo.customerInfo.name}`,
          html: adminEmailContent,
        });
        
        if (adminResult.success) {
          adminSent = true;
          console.log(`[EMAIL] Admin email sent successfully`);
        } else {
          errors.push(`Admin email failed: ${adminResult.error}`);
          console.error(`[EMAIL] Admin email failed:`, adminResult.error);
        }
      } catch (adminError) {
        errors.push(`Admin email error: ${adminError}`);
        console.error(`[EMAIL] Admin email error:`, adminError);
      }
      
      // FIXED: Always send customer email (with small delay)
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
      
      try {
        const customerEmailContent = this.buildCustomerEmailContent(emailInfo, t);
        const customerEmailSubject = emailInfo.customerInfo.paymentUrl 
          ? `${t.customerEmailSubject} - ${emailInfo.customerInfo.serviceName} (${emailInfo.language === 'id' ? 'Link Pembayaran' : 'Payment Link'})`
          : `${t.customerEmailSubject} - ${emailInfo.customerInfo.serviceName} (${emailInfo.language === 'id' ? 'Konfirmasi Pesanan' : 'Order Confirmation'})`;
        
        console.log(`[EMAIL] Sending customer email to: ${emailInfo.customerInfo.email}`);
        
        const customerResult = await sendMail({
          from: `"E-Visa Service" <${fromEmail}>`,
          to: emailInfo.customerInfo.email,
          subject: customerEmailSubject,
          html: customerEmailContent
        });
        
        if (customerResult.success) {
          customerSent = true;
          console.log(`[EMAIL] Customer email sent successfully to: ${emailInfo.customerInfo.email}`);
        } else {
          errors.push(`Customer email failed: ${customerResult.error}`);
          console.error(`[EMAIL] Customer email failed:`, customerResult.error);
        }
      } catch (customerError) {
        errors.push(`Customer email error: ${customerError}`);
        console.error(`[EMAIL] Customer email error:`, customerError);
      }
      
      console.log(`[EMAIL] Final result - Admin: ${adminSent}, Customer: ${customerSent}, Errors: ${errors.length}`);
      return { adminSent, customerSent, errors };
      
    } catch (error) {
      console.error(`[EMAIL] System error:`, error);
      errors.push(`Email system error: ${error}`);
      return { adminSent: false, customerSent: false, errors };
    }
  }
  
  // Build admin email content
  private static buildAdminEmailContent(emailInfo: EmailInfo, t: any): string {
    const logoUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/images/logo/logo_email.png`;
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f0f7ff; padding: 20px; text-align: center;">
          <img src="${logoUrl}" alt="Logo" style="max-height: 60px; margin-bottom: 15px;">
          <h2 style="color: #2563eb; margin: 0;">${t.adminEmailTitle}</h2>
        </div>
        <div style="padding: 20px; background-color: #ffffff;">
          <p><strong>${t.nameLabel}:</strong> ${emailInfo.customerInfo.name}</p>
          <p><strong>${t.emailLabel}:</strong> ${emailInfo.customerInfo.email}</p>
          <p><strong>${t.serviceLabel}:</strong> ${emailInfo.customerInfo.serviceName}</p>
          ${emailInfo.customerInfo.invoiceId ? `<p><strong>${t.invoiceIdLabel}:</strong> ${emailInfo.customerInfo.invoiceId}</p>` : ''}
          ${emailInfo.customerInfo.paymentUrl ? `<p><strong>${t.paymentUrlLabel}:</strong> <a href="${emailInfo.customerInfo.paymentUrl}" style="color: #2563eb; word-break: break-all;">${emailInfo.customerInfo.paymentUrl}</a></p>` : ''}
          <p style="margin-top: 20px; padding: 10px; background-color: #f8fafc; border-radius: 4px;">
            <small>Order ID: ${emailInfo.orderId || 'N/A'}<br>
            Time: ${new Date().toLocaleString()}<br>
            Language: ${emailInfo.language}</small>
          </p>
        </div>
      </div>
    `;
  }
  
  // FIXED: Build customer email content - always includes confirmation
  private static buildCustomerEmailContent(emailInfo: EmailInfo, t: any): string {
    const logoUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/images/logo/logo_email.png`;
    const trackUrl = process.env.NEXT_PUBLIC_TRACK_URL || 'https://demo.fortunasadanioga.com/track';
    const hasPaymentUrl = !!emailInfo.customerInfo.paymentUrl;
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #f0f7ff; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
          <img src="${logoUrl}" alt="Logo" style="max-height: 70px; margin-bottom: 15px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 24px;">${t.customerEmailTitle}</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; margin-bottom: 25px;">${t.customerEmailGreeting} <strong>${emailInfo.customerInfo.name}</strong>,</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 25px;">
            <p style="margin: 0; font-size: 16px;">
              ${t.customerEmailOrderConfirmation} <strong>${emailInfo.customerInfo.serviceName}</strong> 
              ${emailInfo.language === 'id' ? 'telah berhasil dibuat dan dokumen Anda telah diterima.' : 'has been successfully created and your documents have been received.'}
            </p>
          </div>
          
          ${emailInfo.customerInfo.invoiceId ? `
          <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>${t.invoiceIdLabel}:</strong> 
            <span style="background-color: #f0f7ff; padding: 3px 8px; border-radius: 4px;">${emailInfo.customerInfo.invoiceId}</span>
          </p>` : ''}
          
          ${hasPaymentUrl ? `
          <p style="font-size: 16px; margin-bottom: 20px;">${t.customerEmailPaymentInstructions}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailInfo.customerInfo.paymentUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">${t.customerEmailPaymentButton}</a>
          </div>
          <p style="font-size: 15px; color: #64748b; font-style: italic; margin-bottom: 25px;">${t.customerEmailIgnoreIfPaid}</p>
          ` : `
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 25px;">
            <p style="margin: 0; font-size: 16px; color: #856404;">
              ${emailInfo.language === 'id' 
                ? 'Link pembayaran akan dikirim dalam email terpisah setelah sistem memproses pesanan Anda.' 
                : 'Payment link will be sent in a separate email after our system processes your order.'}
            </p>
          </div>
          `}
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${trackUrl}?email=${encodeURIComponent(emailInfo.customerInfo.email)}&invoiceId=${encodeURIComponent(emailInfo.customerInfo.invoiceId || '')}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">${t.trackOrder || (emailInfo.language === 'id' ? 'Lacak Pesanan' : 'Track Order')}</a>
          </div>
          
          <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin-top: 25px;">
            <p style="margin: 0; font-size: 15px;">
              ${t.customerEmailSupport || (emailInfo.language === 'id' 
                ? 'Jika Anda memiliki pertanyaan, silakan hubungi tim dukungan kami.' 
                : 'If you have any questions, please contact our support team.')}
            </p>
          </div>
        </div>
        <div style="padding: 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #64748b; font-size: 13px; margin: 0;">
            ${t.customerEmailFooter || (emailInfo.language === 'id' 
              ? 'Terima kasih telah mempercayai layanan kami.' 
              : 'Thank you for trusting our service.')}
          </p>
        </div>
      </div>
    `;
  }
}

// Security classes (unchanged - keeping existing security code)
class SecurityValidator {
  static validateInput(
    input: string, 
    field: string,
    options: { maxLength?: number; required?: boolean; patterns?: RegExp[]; } = {}
  ): { isValid: boolean; sanitized: string; violations: SecurityViolation[] } {
    const violations: SecurityViolation[] = [];
    let sanitized = input || '';
    
    if (options.required && !sanitized.trim()) {
      violations.push({
        type: 'input_validation',
        field,
        message: `${field} is required`
      });
      return { isValid: false, sanitized: '', violations };
    }
    
    if (options.maxLength && sanitized.length > options.maxLength) {
      violations.push({
        type: 'input_validation',
        field,
        message: `${field} exceeds maximum length of ${options.maxLength}`
      });
      sanitized = sanitized.substring(0, options.maxLength);
    }
    
    const allPatterns = [
      ...SECURITY_CONFIG.SUSPICIOUS_PATTERNS.SQL_INJECTION,
      ...SECURITY_CONFIG.SUSPICIOUS_PATTERNS.XSS,
      ...SECURITY_CONFIG.SUSPICIOUS_PATTERNS.PATH_TRAVERSAL
    ];
    
    for (const pattern of allPatterns) {
      if (pattern.test(sanitized)) {
        const violationType = SECURITY_CONFIG.SUSPICIOUS_PATTERNS.SQL_INJECTION.includes(pattern) ? 'sql_injection' :
                            SECURITY_CONFIG.SUSPICIOUS_PATTERNS.XSS.includes(pattern) ? 'xss' : 'path_traversal';
        
        violations.push({
          type: violationType,
          field,
          value: sanitized.substring(0, 50) + '...',
          message: `Suspicious ${violationType.replace('_', ' ')} pattern detected in ${field}`
        });
      }
    }
    
    sanitized = sanitized
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
    
    if (options.patterns) {
      for (const pattern of options.patterns) {
        if (!pattern.test(sanitized)) {
          violations.push({
            type: 'input_validation',
            field,
            message: `${field} format is invalid`
          });
        }
      }
    }
    
    return { isValid: violations.length === 0, sanitized, violations };
  }
  
  static validateEmail(email: string): { isValid: boolean; violations: SecurityViolation[] } {
    const violations: SecurityViolation[] = [];
    
    if (!email || email.length > SECURITY_CONFIG.MAX_INPUT_LENGTHS.email) {
      violations.push({
        type: 'input_validation',
        field: 'email',
        message: 'Invalid email length'
      });
      return { isValid: false, violations };
    }
    
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
      violations.push({
        type: 'input_validation',
        field: 'email',
        message: 'Invalid email format'
      });
      return { isValid: false, violations };
    }
    
    const [localPart, domain] = email.split('@');
    const suspiciousPatterns = [
      /<script/i, /javascript/i, /vbscript/i, /onload/i, /onerror/i,
      /<|>/, /\.\./, /^\.|\.$/, /\+{2,}/, /@{2,}/
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(localPart) || pattern.test(domain)) {
        violations.push({
          type: 'xss',
          field: 'email',
          message: 'Suspicious pattern detected in email'
        });
        break;
      }
    }
    
    return { isValid: violations.length === 0, violations };
  }
  
  static validateName(name: string): { isValid: boolean; violations: SecurityViolation[] } {
    const violations: SecurityViolation[] = [];
    
    if (!name || name.length < 2 || name.length > SECURITY_CONFIG.MAX_INPUT_LENGTHS.name) {
      violations.push({
        type: 'input_validation',
        field: 'name',
        message: 'Invalid name length (2-100 characters required)'
      });
      return { isValid: false, violations };
    }
    
    const nameRegex = /^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF\u0100-\u017F\u0180-\u024F'-]+$/;
    
    if (!nameRegex.test(name)) {
      violations.push({
        type: 'input_validation',
        field: 'name',
        message: 'Name contains invalid characters'
      });
      return { isValid: false, violations };
    }
    
    for (const pattern of SECURITY_CONFIG.SUSPICIOUS_PATTERNS.XSS) {
      if (pattern.test(name)) {
        violations.push({
          type: 'xss',
          field: 'name',
          message: 'Suspicious XSS pattern detected in name'
        });
        break;
      }
    }
    
    return { isValid: violations.length === 0, violations };
  }
}

class EnhancedRateLimiter {
  static async checkRateLimit(
    identifier: string,
    action: string,
    config: { max: number; windowMinutes: number }
  ): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - (config.windowMinutes * 60 * 1000));
      const resetTime = now.getTime() + (config.windowMinutes * 60 * 1000);
      
      const { data: attempts, error } = await supabaseAdmin
        .from('rate_limits')
        .select('id, created_at')
        .eq('ip_address', identifier)
        .eq('path', action)
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Rate limit check error:', error);
        return { allowed: true, remaining: config.max - 1 };
      }
      
      const currentAttempts = attempts?.length || 0;
      
      if (currentAttempts >= config.max) {
        return { allowed: false, resetTime, remaining: 0 };
      }
      
      await supabaseAdmin
        .from('rate_limits')
        .insert({
          ip_address: identifier,
          path: action,
          created_at: now.toISOString()
        });
      
      return { 
        allowed: true, 
        resetTime, 
        remaining: config.max - currentAttempts - 1 
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      return { allowed: false, resetTime: Date.now() + (config.windowMinutes * 60 * 1000) };
    }
  }
  
  static async cleanupOldRecords(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000));
      
      await supabaseAdmin
        .from('rate_limits')
        .delete()
        .lt('created_at', cutoffTime.toISOString());
    } catch (error) {
      console.error('Rate limit cleanup error:', error);
    }
  }
}

async function logSecurityEvent(event: {
  event_type: string;
  path: string;
  ip_address: string;
  user_agent: string;
  message?: string;
  metadata?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}): Promise<void> {
  try {
    await supabaseAdmin
      .from('security_logs')
      .insert({
        ...event,
        severity: event.severity || 'medium',
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Form processing functions (keeping existing logic)
async function parseAndValidateFormData(req: Request): Promise<{
  fields: ValidatedFormFields;
  files: ValidatedFormFiles;
  violations: SecurityViolation[];
}> {
  const violations: SecurityViolation[] = [];
  const formData = await req.formData();
  const fields: Partial<ValidatedFormFields> = {};
  const files: Partial<ValidatedFormFiles> = {};
  
  const tempDir = join(os.tmpdir(), 'evisa-secure', uuidv4());
  await mkdir(tempDir, { recursive: true, mode: 0o700 });
  
  const entries = Array.from(formData.entries());
  if (entries.length > 50) {
    violations.push({
      type: 'input_validation',
      message: 'Too many form fields submitted'
    });
    throw new Error('Form contains too many fields');
  }
  
  for (const [key, value] of entries) {
    if (value instanceof File) {
      if (key === 'allRequirements') {
        const fileValidation = await validateFile(value, tempDir);
        if (!fileValidation.isValid) {
          violations.push(...fileValidation.violations);
        } else {
          files.allRequirements = fileValidation.file!;
        }
      }
    } else if (typeof value === 'string') {
      switch (key) {
        case 'customerName':
          const nameValidation = SecurityValidator.validateName(value);
          if (!nameValidation.isValid) {
            violations.push(...nameValidation.violations);
          } else {
            fields.customerName = nameValidation.violations.length === 0 ? value.trim() : '';
          }
          break;
          
        case 'customerEmail':
          const emailValidation = SecurityValidator.validateEmail(value);
          if (!emailValidation.isValid) {
            violations.push(...emailValidation.violations);
          } else {
            fields.customerEmail = value.trim().toLowerCase();
          }
          break;
          
        case 'serviceId':
        case 'amount':
          if (!/^\d+$/.test(value) || parseInt(value) < 0) {
            violations.push({
              type: 'input_validation',
              field: key,
              message: `Invalid ${key}: must be positive integer`
            });
          } else {
            (fields as any)[key] = value;
          }
          break;
          
        default:
          const validation = SecurityValidator.validateInput(
            value,
            key,
            { maxLength: SECURITY_CONFIG.MAX_INPUT_LENGTHS.serviceName }
          );
          if (!validation.isValid) {
            violations.push(...validation.violations);
          } else {
            (fields as any)[key] = validation.sanitized;
          }
      }
    }
  }
  
  return {
    fields: fields as ValidatedFormFields,
    files: files as ValidatedFormFiles,
    violations
  };
}

async function validateFile(
  file: File,
  tempDir: string
): Promise<{
  isValid: boolean;
  file?: EnhancedCustomFile;
  violations: SecurityViolation[];
}> {
  const violations: SecurityViolation[] = [];
  
  if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    violations.push({
      type: 'file_validation',
      message: `File too large: ${file.size} bytes (max: ${SECURITY_CONFIG.MAX_FILE_SIZE})`
    });
    return { isValid: false, violations };
  }
  
  if (file.size === 0) {
    violations.push({
      type: 'file_validation',
      message: 'Empty file not allowed'
    });
    return { isValid: false, violations };
  }
  
  const fileName = file.name;
  if (!fileName || fileName.length > 255) {
    violations.push({
      type: 'file_validation',
      message: 'Invalid file name length'
    });
    return { isValid: false, violations };
  }
  
  const maliciousPatterns = [
    /\.(exe|php|js|jsp|asp|aspx|bat|cmd|scr|pif|com|vbs|ps1)$/i,
    /[<>:"|?*\x00-\x1f]/, /^\./, /\.\./, 
    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i
  ];
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(fileName)) {
      violations.push({
        type: 'file_validation',
        message: 'Potentially malicious file name detected'
      });
      return { isValid: false, violations };
    }
  }
  
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension || !SECURITY_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
    violations.push({
      type: 'file_validation',
      message: `File extension '${extension}' not allowed`
    });
    return { isValid: false, violations };
  }
  
  if (!SECURITY_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
    violations.push({
      type: 'file_validation',
      message: `MIME type '${file.type}' not allowed`
    });
    return { isValid: false, violations };
  }
  
  try {
    const secureFileName = `${uuidv4()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = join(tempDir, secureFileName);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    
    if (buffer.length !== file.size) {
      violations.push({
        type: 'file_validation',
        message: 'File corruption detected during upload'
      });
      return { isValid: false, violations };
    }
    
    const fileHeader = buffer.slice(0, 10);
    const isValidFormat = validateFileHeader(fileHeader, extension);
    if (!isValidFormat) {
      violations.push({
        type: 'file_validation',
        message: 'File format does not match extension'
      });
      return { isValid: false, violations };
    }
    
    await writeFile(filePath, buffer, { mode: 0o600 });
    
    const enhancedFile: EnhancedCustomFile = {
      filepath: filePath,
      originalFilename: fileName,
      newFilename: secureFileName,
      mimetype: file.type,
      size: file.size,
      hash: require('crypto').createHash('sha256').update(buffer).digest('hex'),
      isValidated: true
    };
    
    return { isValid: true, file: enhancedFile, violations: [] };
  } catch (error) {
    violations.push({
      type: 'file_validation',
      message: `File processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    return { isValid: false, violations };
  }
}

function validateFileHeader(header: Buffer, extension: string): boolean {
  const signatures: Record<string, Buffer[]> = {
    'pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
    'jpg': [Buffer.from([0xFF, 0xD8, 0xFF])],
    'jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
    'png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
    'zip': [
      Buffer.from([0x50, 0x4B, 0x03, 0x04]),
      Buffer.from([0x50, 0x4B, 0x05, 0x06]),
      Buffer.from([0x50, 0x4B, 0x07, 0x08])
    ]
  };
  
  const expectedSignatures = signatures[extension];
  if (!expectedSignatures) return true;
  
  return expectedSignatures.some(signature => 
    header.slice(0, signature.length).equals(signature)
  );
}

// TIMEOUT PROTECTION FOR VERCEL FREE PLAN
const VERCEL_FREE_TIMEOUT = 8000; // 8 seconds safety margin

function checkTimeout(requestId: string, operation: string, requestStartTime: number): boolean {
  const elapsed = Date.now() - requestStartTime;
  if (elapsed > VERCEL_FREE_TIMEOUT) {
    console.warn(`[${requestId}] Timeout approaching during ${operation}: ${elapsed}ms`);
    return true;
  }
  return false;
}

// Main POST handler function
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  const requestStartTime = Date.now();
  
  const clientIp = (req.headers.get('x-forwarded-for') || '')
    .split(',')[0]
    .trim() || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const preferredLanguage = req.headers.get('x-preferred-language') || 'en';
  
  console.log(`[${requestId}] Order creation started from ${clientIp}`);
  
  const securityViolations: SecurityViolation[] = [];
  let tempFilePaths: string[] = [];
  
  try {
    // Rate limiting
    const rateLimitChecks = await Promise.all([
      EnhancedRateLimiter.checkRateLimit(clientIp, 'order_creation', SECURITY_CONFIG.RATE_LIMITS.ORDER_CREATION),
      EnhancedRateLimiter.checkRateLimit(clientIp, 'file_upload', SECURITY_CONFIG.RATE_LIMITS.FILE_UPLOAD)
    ]);
    
    for (const check of rateLimitChecks) {
      if (!check.allowed) {
        await logSecurityEvent({
          event_type: 'rate_limit_exceeded',
          path: '/api/order-complete',
          ip_address: clientIp,
          user_agent: userAgent,
          message: `Rate limit exceeded. Reset time: ${new Date(check.resetTime || 0).toISOString()}`,
          severity: 'high'
        });
        
        return NextResponse.json(
          {
            success: false,
            message: preferredLanguage === 'id' 
              ? 'Terlalu banyak permintaan. Silakan coba lagi nanti.'
              : 'Too many requests. Please try again later.',
            retryAfter: Math.ceil(((check.resetTime || 0) - Date.now()) / 1000)
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(((check.resetTime || 0) - Date.now()) / 1000))
            }
          }
        );
      }
    }
    
    // Parse and validate form data
    console.time(`[${requestId}] parseValidateForm`);
    const { fields, files, violations } = await parseAndValidateFormData(req);
    console.timeEnd(`[${requestId}] parseValidateForm`);
    
    const uploadedFile = Array.isArray(files.allRequirements) 
      ? files.allRequirements[0] 
      : files.allRequirements;
    
    if (uploadedFile?.filepath) {
      tempFilePaths.push(uploadedFile.filepath);
    }
    
    // Handle security violations
    if (violations.length > 0) {
      securityViolations.push(...violations);
      
      for (const violation of violations) {
        await logSecurityEvent({
          event_type: violation.type,
          path: '/api/order-complete',
          ip_address: clientIp,
          user_agent: userAgent,
          message: violation.message,
          metadata: { field: violation.field, violationType: violation.type },
          severity: violation.type === 'sql_injection' || violation.type === 'xss' ? 'critical' : 'high'
        });
      }
      
      const criticalViolations = violations.filter(v => 
        v.type === 'sql_injection' || v.type === 'xss'
      );
      
      if (criticalViolations.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: preferredLanguage === 'id' 
              ? 'Input tidak valid terdeteksi.'
              : 'Invalid input detected.'
          },
          { status: 400 }
        );
      }
    }
    
    // Validate required fields
    if (!uploadedFile || !uploadedFile.filepath) {
      return NextResponse.json({
        success: false,
        message: preferredLanguage === 'id' 
          ? 'File dokumen diperlukan.'
          : 'Document file is required.'
      }, { status: 400 });
    }
    
    if (!fields.customerName || !fields.customerEmail || !fields.serviceId || !fields.amount) {
      return NextResponse.json({
        success: false,
        message: preferredLanguage === 'id' 
          ? 'Data wajib tidak lengkap.'
          : 'Required data is missing.'
      }, { status: 400 });
    }
    
    // Email rate limiting
    const emailRateLimit = await EnhancedRateLimiter.checkRateLimit(
      fields.customerEmail, 
      'email_sending', 
      SECURITY_CONFIG.RATE_LIMITS.EMAIL_SENDING
    );
    
    if (!emailRateLimit.allowed) {
      await logSecurityEvent({
        event_type: 'email_rate_limit_exceeded',
        path: '/api/order-complete',
        ip_address: clientIp,
        user_agent: userAgent,
        message: `Email rate limit exceeded for ${fields.customerEmail}`,
        severity: 'medium'
      });
      
      return NextResponse.json({
        success: false,
        message: preferredLanguage === 'id' 
          ? 'Terlalu banyak email dikirim ke alamat ini. Coba lagi nanti.'
          : 'Too many emails sent to this address. Try again later.'
      }, { status: 429 });
    }
    
    // Service validation
    const serviceValidation = await validateService(
      fields.serviceId,
      fields.serviceName,
      parseInt(fields.amount)
    );
    
    if (!serviceValidation.valid) {
      await logSecurityEvent({
        event_type: 'price_tampering_attempt',
        path: '/api/order-complete',
        ip_address: clientIp,
        user_agent: userAgent,
        message: `Service validation failed: ${serviceValidation.message}`,
        metadata: {
          serviceId: fields.serviceId,
          serviceName: fields.serviceName,
          requestedAmount: fields.amount,
          expectedPrice: serviceValidation.expectedPrice
        },
        severity: 'high'
      });
      
      return NextResponse.json({
        success: false,
        message: preferredLanguage === 'id' 
          ? 'Data layanan tidak valid.'
          : 'Invalid service data.'
      }, { status: 400 });
    }
    
    const validatedAmount = serviceValidation.expectedPrice!;
    const finalLanguage = preferredLanguage === 'id' ? 'id' : 'en';
    
    // Create Xendit invoice
    console.time(`[${requestId}] xenditInvoice`);
    let invoiceId = '';
    let paymentUrl = '';
    let xenditError: any = null;
    
    try {
      if (!process.env.XENDIT_SECRET_KEY) {
        throw new Error("Missing Xendit API key");
      }
      
      const xenditInvoiceClient = new InvoiceClient({
        secretKey: process.env.XENDIT_SECRET_KEY,
      });
      
      const invoiceData = {
        externalId: `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        amount: validatedAmount,
        payerEmail: fields.customerEmail,
        description: `E-Visa Service Payment - ${fields.customerName}`,
        currency: "IDR",
        invoiceDuration: "86400",
      };
      
      const invoice = await xenditInvoiceClient.createInvoice({
        data: invoiceData,
      });
      
      invoiceId = invoice.id || '';
      paymentUrl = invoice.invoiceUrl || '';
      
      console.log(`[${requestId}] Xendit invoice created: ${invoiceId}`);
    } catch (error) {
      xenditError = error;
      console.error(`[${requestId}] Xendit invoice creation failed:`, error);
    }
    console.timeEnd(`[${requestId}] xenditInvoice`);
    
    // Store data in database
    console.time(`[${requestId}] storeDatabase`);
    let supabaseResult: { 
      success: boolean; 
      id?: string; 
      error?: any;
      documentPath?: string; 
    } = { success: false };
    
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const fileBuffer = await require('fs/promises').readFile(uploadedFile.filepath);
        const storagePath = `documents/${invoiceId || uuidv4()}_${Date.now()}_${uploadedFile.originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        const customerData = {
          name: fields.customerName,
          email: fields.customerEmail,
          service_id: parseInt(fields.serviceId),
          service_name: fields.serviceName,
          invoice_id: invoiceId || undefined,
          payment_url: paymentUrl || undefined,
          status: 'Pending Payment',
          language: finalLanguage
        };
        
        const result = await storeCustomerData(customerData, fileBuffer, storagePath);
        supabaseResult = { 
          success: result.success,
          id: result.id,
          error: result.error,
          documentPath: storagePath 
        };
      }
    } catch (dbError) {
      console.error(`[${requestId}] Database error:`, dbError);
      supabaseResult.error = dbError;
    }
    console.timeEnd(`[${requestId}] storeDatabase`);
    
    // FIXED EMAIL HANDLING - Always send customer email
    const customerInfo = {
      name: fields.customerName,
      email: fields.customerEmail,
      serviceName: fields.serviceName,
      invoiceId,
      paymentUrl // Can be empty, but email will still be sent
    };
    
    const emailInfo: EmailInfo = {
      customerInfo,
      language: finalLanguage,
      orderId: supabaseResult.id
    };
    
    // Send emails immediately (don't make it fire and forget)
    console.time(`[${requestId}] emailSending`);
    let emailResult = { adminSent: false, customerSent: false, errors: ['Not attempted'] };
    
    try {
      console.log(`[${requestId}] Starting email sending process...`);
      emailResult = await FixedEmailManager.sendOrderEmails(emailInfo);
      console.log(`[${requestId}] Email sending completed:`, {
        adminSent: emailResult.adminSent,
        customerSent: emailResult.customerSent,
        errorCount: emailResult.errors.length
      });
      
      // Update database with email status
      if (supabaseResult.id) {
        await supabaseAdmin
          .from('orders')
          .update({ 
            email_sent: emailResult.adminSent || emailResult.customerSent,
            email_errors: emailResult.errors.length > 0 ? emailResult.errors.join('; ') : null,
            admin_email_sent: emailResult.adminSent,
            customer_email_sent: emailResult.customerSent
          })
          .eq('id', supabaseResult.id);
      }
    } catch (emailError) {
      console.error(`[${requestId}] Email sending error:`, emailError);
      emailResult.errors.push(`Email system error: ${emailError}`);
    }
    console.timeEnd(`[${requestId}] emailSending`);
    
    // Log successful order creation
    await logSecurityEvent({
      event_type: 'order_created',
      path: '/api/order-complete',
      ip_address: clientIp,
      user_agent: userAgent,
      message: `Order created successfully: ${invoiceId}`,
      metadata: {
        serviceId: fields.serviceId,
        amount: validatedAmount,
        processingTime: Date.now() - requestStartTime,
        emailsSent: emailResult.adminSent || emailResult.customerSent
      },
      severity: 'low'
    });
    
    // Return response
    const response = {
      success: true,
      message: finalLanguage === 'id' 
        ? 'Pesanan berhasil dibuat dan email telah dikirim.'
        : 'Order created successfully and email has been sent.',
      paymentUrl,
      invoiceId,
      storedInDatabase: supabaseResult.success,
      databaseId: supabaseResult.id || null,
      emailSent: emailResult.customerSent,
      processingTime: Date.now() - requestStartTime
    };
    
    if (xenditError) {
      (response as any).warning = finalLanguage === 'id' 
        ? 'Link pembayaran mungkin tidak tersedia, tetapi email konfirmasi telah dikirim.'
        : 'Payment link may not be available, but confirmation email has been sent.';
    }
    
    if (!emailResult.customerSent) {
      (response as any).emailWarning = finalLanguage === 'id'
        ? 'Email mungkin tertunda. Silakan periksa email Anda dalam beberapa menit.'
        : 'Email may be delayed. Please check your email in a few minutes.';
    }
    
    console.log(`[${requestId}] Request completed successfully in ${Date.now() - requestStartTime}ms`);
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error(`[${requestId}] Critical error:`, error);
    
    await logSecurityEvent({
      event_type: 'order_creation_critical_error',
      path: '/api/order-complete',
      ip_address: clientIp,
      user_agent: userAgent,
      message: `Critical error: ${error instanceof Error ? error.message : String(error)}`,
      metadata: { 
        processingTime: Date.now() - requestStartTime,
        requestId: requestId,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      },
      severity: 'critical'
    });
    
    let errorMessage = preferredLanguage === 'id' 
      ? 'Terjadi kesalahan sistem. Silakan coba lagi dalam beberapa menit.'
      : 'System error occurred. Please try again in a few minutes.';
    
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = preferredLanguage === 'id'
          ? 'Permintaan timeout. Silakan coba lagi.'
          : 'Request timeout. Please try again.';
        statusCode = 408;
      } else if (error.message.includes('network')) {
        errorMessage = preferredLanguage === 'id'
          ? 'Masalah jaringan. Periksa koneksi internet Anda.'
          : 'Network issue. Check your internet connection.';
        statusCode = 503;
      } else if (error.message.includes('validation')) {
        errorMessage = preferredLanguage === 'id'
          ? 'Data tidak valid. Periksa input Anda.'
          : 'Invalid data. Please check your input.';
        statusCode = 400;
      }
    }
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      requestId: requestId,
      timestamp: new Date().toISOString()
    }, { status: statusCode });
    
  } finally {
    // Enhanced cleanup
    const cleanupPromises: Promise<void | null>[] = [];
    
    for (const filePath of tempFilePaths) {
      cleanupPromises.push(
        unlink(filePath).catch(cleanupError => {
          console.warn(`[${requestId}] Failed to cleanup temp file ${filePath}:`, cleanupError);
          return null;
        })
      );
    }
    
    await Promise.allSettled(cleanupPromises);
    
    // Periodic cleanup (5% chance)
    if (Math.random() < 0.05) {
      EnhancedRateLimiter.cleanupOldRecords().catch(cleanupError => {
        console.error(`[${requestId}] Rate limit cleanup error:`, cleanupError);
      });
    }
    
    const totalTime = Date.now() - requestStartTime;
    console.log(`[${requestId}] Request completed in ${totalTime}ms`);
    
    if (totalTime > 20000) { // 20 seconds
      await logSecurityEvent({
        event_type: 'performance_warning',
        path: '/api/order-complete',
        ip_address: clientIp,
        user_agent: userAgent,
        message: `Request took ${totalTime}ms to complete`,
        metadata: { processingTime: totalTime, requestId },
        severity: 'medium'
      }).catch(() => {});
    }
  }
}