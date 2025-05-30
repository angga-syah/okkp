// app/api/upload-revision/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/sb_client';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { sendMail } from '@/lib/mail';
import path from 'path';
import { supabaseAdmin } from '@/lib/sb_admin';
import fs from 'fs';
import { encryptFile } from '@/lib/encryption';
import { SecurityValidator, EnhancedRateLimiter } from '@/lib/enhanced-security';

// Enhanced security constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB to prevent document bombs
const MAX_FILES_PER_ORDER = 10; // Prevent spam uploads per order
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  
  // ZIP variants - browser bisa melaporkan berbagai MIME type untuk ZIP
  'application/zip',
  'application/x-zip',
  'application/x-zip-compressed',
  'multipart/x-zip',
  'application/x-compressed',
  
  // RAR variants - browser bisa melaporkan berbagai MIME type untuk RAR
  'application/x-rar-compressed',
  'application/x-rar',
  'application/rar',
  'application/x-winrar-compressed',
  'application/octet-stream', // Fallback yang sering digunakan
];

// Enhanced file signature validation dengan lebih banyak patterns
const FILE_SIGNATURES: { [key: string]: number[][] } = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]], // JPEG
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], // PNG
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], // DOC
  
  // ZIP signatures - ZIP bisa memiliki beberapa header yang berbeda
  'application/zip': [
    [0x50, 0x4B, 0x03, 0x04], // Standard ZIP
    [0x50, 0x4B, 0x05, 0x06], // Empty ZIP
    [0x50, 0x4B, 0x07, 0x08], // Spanned ZIP
    [0x50, 0x4B, 0x01, 0x02], // ZIP with central directory
  ],
  'application/x-zip': [
    [0x50, 0x4B, 0x03, 0x04],
    [0x50, 0x4B, 0x05, 0x06],
    [0x50, 0x4B, 0x07, 0x08],
  ],
  'application/x-zip-compressed': [
    [0x50, 0x4B, 0x03, 0x04],
    [0x50, 0x4B, 0x05, 0x06],
    [0x50, 0x4B, 0x07, 0x08],
  ],
  
  // RAR signatures - RAR memiliki beberapa versi dengan header berbeda
  'application/x-rar-compressed': [
    [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00], // RAR 1.5 to 4.0
    [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00], // RAR 5.0+
  ],
  'application/x-rar': [
    [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00],
    [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00],
  ],
  'application/rar': [
    [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00],
    [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00],
  ],
  
  // DOCX juga menggunakan ZIP format
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4B, 0x03, 0x04],
    [0x50, 0x4B, 0x05, 0x06],
    [0x50, 0x4B, 0x07, 0x08],
  ],
};

// Rate limiter for upload attempts
const uploadRateLimiter = new EnhancedRateLimiter('upload_revision', {
  maxAttempts: 3,
  windowMinutes: 60,
  lockoutMinutes: 120,
  progressiveDelay: true
});

// Email rate limiter to prevent mail bombs
const emailRateLimiter = new EnhancedRateLimiter('email_notification', {
  maxAttempts: 5,
  windowMinutes: 60,
  lockoutMinutes: 240,
  progressiveDelay: false
});

// Define the attachment interface
interface EmailAttachment {
  filename: string;
  path: string;
  cid?: string;
}

// Import logo path
const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'logo', 'logo_email.png');

// Email translation content for revision notification
interface EmailTranslations {
  adminSubject: string;
  adminTitle: string;
  adminMessage: string;
  customerSubject: string;
  customerTitle: string;
  customerMessage: string;
  statusUpdateMessage: string;
  documentReceivedMessage: string;
  footerMessage: string;
}

const translations: Record<string, EmailTranslations> = {
  en: {
    adminSubject: "Document Revision Received - ",
    adminTitle: "Document Revision Received",
    adminMessage: "A customer has uploaded a revised document for their order.",
    customerSubject: "Document Revision Received - ",
    customerTitle: "Document Revision Received",
    customerMessage: "Thank you for uploading your revised document. Our team will review it shortly.",
    statusUpdateMessage: "Your order status has been updated to document verification.",
    documentReceivedMessage: "We have received your revised document and will continue processing your order.",
    footerMessage: "This message was sent automatically, please do not reply to this email."
  },
  id: {
    adminSubject: "Revisi Dokumen Diterima - ",
    adminTitle: "Revisi Dokumen Diterima",
    adminMessage: "Pelanggan telah mengunggah dokumen revisi untuk pesanan mereka.",
    customerSubject: "Revisi Dokumen Diterima - ",
    customerTitle: "Revisi Dokumen Diterima",
    customerMessage: "Terima kasih telah mengunggah dokumen revisi Anda. Tim kami akan segera mereviewnya.",
    statusUpdateMessage: "Status pesanan Anda telah diperbarui menjadi verifikasi dokumen.",
    documentReceivedMessage: "Kami telah menerima dokumen revisi Anda dan akan melanjutkan pemrosesan pesanan Anda.",
    footerMessage: "Pesan ini dikirim secara otomatis, mohon jangan membalas email ini."
  }
};

// Utility function to get client IP
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  return 'unknown';
}

// Enhanced rate limiting check function with proper error handling
async function checkRateLimit(clientIp: string, rateLimiter: EnhancedRateLimiter, context?: any): Promise<{
  success: boolean;
  message?: string;
  status: number;
  retryAfter?: number;
}> {
  try {
    const rateLimitResult = await rateLimiter.checkAndLimit(clientIp);
    
    if (!rateLimitResult.success) {
      // Record the failed attempt
      try {
        await rateLimiter.recordAttempt(clientIp, false, { 
          reason: 'rate_limited',
          timestamp: new Date().toISOString(),
          ...context
        });
      } catch (recordError) {
        console.error('Failed to record rate limit attempt:', recordError);
        // Continue with rate limit response even if recording fails
      }
      
      const waitTime = rateLimitResult.nextAttemptDelay || rateLimitResult.lockoutDuration || 0;
      const waitMinutes = Math.ceil(waitTime / 60);
      
      return {
        success: false,
        message: `Too many attempts. Please wait ${waitMinutes} minutes before trying again.`,
        status: 429, // Too Many Requests
        retryAfter: waitTime
      };
    }
    
    return { success: true, status: 200 };
    
  } catch (error) {
    console.error('Rate limiting error:', error);
    
    // If rate limiting system fails, allow the request but log the error
    // This prevents rate limiting issues from breaking the entire system
    return { 
      success: true, 
      status: 200 
    };
  }
}

// Enhanced file validation function
async function validateFile(file: File, fileBuffer: Buffer): Promise<{ isValid: boolean; message?: string }> {
  // Size validation
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, message: 'File size exceeds 10MB limit' };
  }

  if (file.size === 0) {
    return { isValid: false, message: 'File is empty' };
  }

  // MIME type validation
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { isValid: false, message: 'File type not allowed' };
  }

  // File name validation
  const nameValidation = SecurityValidator.validateAndSanitize(file.name, {
    maxLength: 255,
    checkXSS: true,
    checkPathTraversal: true
  });

  if (!nameValidation.isValid) {
    return { isValid: false, message: 'Invalid file name detected' };
  }

  // File signature validation (magic bytes)
  const signatures = FILE_SIGNATURES[file.type];
  if (signatures) {
    const isValidSignature = signatures.some(signature => {
      return signature.every((byte, index) => {
        return index < fileBuffer.length && fileBuffer[index] === byte;
      });
    });

    if (!isValidSignature) {
      return { isValid: false, message: 'File content does not match file type' };
    }
  }

  // Additional content validation for potential threats
  const fileContent = fileBuffer.toString('utf8', 0, Math.min(1024, fileBuffer.length));
  
  // Check for embedded scripts or suspicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    /eval\s*\(/i,
    /document\.write/i,
    /window\.location/i,
    /%3Cscript/i, // URL encoded <script
    /%3Ciframe/i  // URL encoded <iframe
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fileContent)) {
      return { isValid: false, message: 'Suspicious content detected in file' };
    }
  }

  return { isValid: true };
}

// Enhanced order validation function (without rate limiting)
async function validateOrderUpload(orderId: string): Promise<{ isValid: boolean; message?: string; order?: any }> {
  try {
    // Validate order ID format
    const orderValidation = SecurityValidator.validateAndSanitize(orderId, {
      maxLength: 50,
      checkXSS: true,
      checkSQLInjection: true,
      checkPathTraversal: true
    });

    if (!orderValidation.isValid) {
      return { isValid: false, message: 'Invalid order ID format' };
    }

    // Get order data with exact match
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderValidation.sanitized)
      .single();
      
    if (orderError || !orderData) {
      return { isValid: false, message: 'Order not found' };
    }

    // Check if order allows document upload
    if (orderData.status !== 'pending_document') {
      return { isValid: false, message: 'Order is not in a state that allows document upload' };
    }

    // Check if there are too many uploads for this order (prevent spam)
    const { data: uploadCount, error: countError } = await supabaseAdmin
      .from('document_uploads')
      .select('id', { count: 'exact' })
      .eq('order_id', orderValidation.sanitized)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (!countError && uploadCount && uploadCount.length >= MAX_FILES_PER_ORDER) {
      return { isValid: false, message: 'Too many files uploaded for this order today' };
    }

    return { isValid: true, order: orderData };
  } catch (error) {
    console.error('Order validation error:', error);
    return { isValid: false, message: 'Validation failed' };
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let tempFilePath: string | null = null;
  
  try {
    // 1. FIRST PRIORITY: Get client IP and check rate limiting
    const clientIp = getClientIp(req);
    console.log(`Upload attempt from IP: ${clientIp}`);
    
    // Check upload rate limiting immediately (before any processing)
    const rateLimitCheck = await checkRateLimit(clientIp, uploadRateLimiter, {
      endpoint: 'upload_revision',
      userAgent: req.headers.get('user-agent') || 'unknown'
    });
    
    if (!rateLimitCheck.success) {
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      
      const response = NextResponse.json({
        success: false,
        message: rateLimitCheck.message,
        code: 'RATE_LIMIT_EXCEEDED'
      }, { 
        status: rateLimitCheck.status,
        headers: rateLimitCheck.retryAfter ? {
          'Retry-After': rateLimitCheck.retryAfter.toString(),
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Date.now() + (rateLimitCheck.retryAfter * 1000)).toString()
        } : {}
      });
      
      return response;
    }

    // 2. Parse the form data with size limit
    const formData = await req.formData();
    
    // 3. Get the order ID
    const orderId = formData.get('orderId') as string;
    if (!orderId) {
      await uploadRateLimiter.recordAttempt(clientIp, false, { 
        reason: 'missing_order_id',
        endpoint: 'upload_revision'
      });
      
      return NextResponse.json({ 
        success: false, 
        message: 'Order ID is required',
        code: 'MISSING_ORDER_ID'
      }, { status: 400 });
    }

    // 4. Validate order (without rate limiting - already done above)
    const orderValidation = await validateOrderUpload(orderId);
    if (!orderValidation.isValid) {
      await uploadRateLimiter.recordAttempt(clientIp, false, { 
        reason: 'invalid_order',
        orderId,
        validation_message: orderValidation.message
      });
      
      return NextResponse.json({ 
        success: false, 
        message: orderValidation.message,
        code: 'INVALID_ORDER'
      }, { status: 400 });
    }

    const orderData = orderValidation.order;
    
    // 5. Get the file
    const file = formData.get('file') as File;
    if (!file) {
      await uploadRateLimiter.recordAttempt(clientIp, false, { 
        reason: 'no_file',
        orderId 
      });
      return NextResponse.json({ 
        success: false, 
        message: 'No file provided',
        code: 'NO_FILE'
      }, { status: 400 });
    }

    // 6. Convert file to buffer for validation
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // 7. Enhanced file validation
    const fileValidation = await validateFile(file, fileBuffer);
    if (!fileValidation.isValid) {
      await uploadRateLimiter.recordAttempt(clientIp, false, { 
        reason: 'invalid_file',
        orderId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        validation: fileValidation.message 
      });
      return NextResponse.json({ 
        success: false, 
        message: fileValidation.message,
        code: 'INVALID_FILE'
      }, { status: 400 });
    }

    // 8. Create a temporary directory for the file
    const tempDir = join(os.tmpdir(), 'evisa-revisions', uuidv4());
    await mkdir(tempDir, { recursive: true });
    
    // 9. Save the file to disk with secure naming
    const sanitizedFileName = SecurityValidator.validateAndSanitize(file.name, {
      maxLength: 255,
      checkXSS: true,
      checkPathTraversal: true
    }).sanitized;
    
    tempFilePath = join(tempDir, sanitizedFileName);
    await writeFile(tempFilePath, fileBuffer);
    
    // 10. Get language from order record
    const orderLanguage = orderData.language || 'en';
    const t = translations[orderLanguage] || translations.en;
    
    // 11. Generate a unique filename with consistent path structure
    const timestamp = Date.now();
    const fileExtension = path.extname(sanitizedFileName);
    const baseName = path.basename(sanitizedFileName, fileExtension);
    const secureFileName = `${baseName}_${timestamp}${fileExtension}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `revisi/${orderId}_revision_${timestamp}_${secureFileName}`;
    
    // 12. Check if encryption is enabled
    const encryptionEnabled = process.env.ENABLE_DOCUMENT_ENCRYPTION === 'true';
    let encryptionMetadata: string | null = null;
    let fileToUpload: Buffer;
    
    if (encryptionEnabled) {
      try {
        // Encrypt the file
        const encryptedData = encryptFile(fileBuffer, orderId);
        
        // Convert to JSON and encode as base64 for storage
        encryptionMetadata = Buffer.from(JSON.stringify(encryptedData)).toString('base64');
        
        // Prepare placeholder file with encrypted data
        fileToUpload = Buffer.from(encryptedData.data, 'base64');
      } catch (encryptionError) {
        console.error('Encryption error:', encryptionError);
        await uploadRateLimiter.recordAttempt(clientIp, false, { 
          reason: 'encryption_failed',
          orderId,
          error: encryptionError instanceof Error ? encryptionError.message : 'Unknown encryption error'
        });
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to encrypt document',
          code: 'ENCRYPTION_FAILED',
          error: encryptionError instanceof Error ? encryptionError.message : 'Unknown encryption error'
        }, { status: 500 });
      }
    } else {
      // No encryption, use original file
      fileToUpload = fileBuffer;
    }
    
    // 13. Upload the file to Supabase Storage with retry logic
    let uploadResult;
    let uploadAttempts = 0;
    const maxUploadAttempts = 3;
    
    while (uploadAttempts < maxUploadAttempts) {
      try {
        uploadAttempts++;
        
        // Set the correct content type
        const contentType = file.type || 'application/octet-stream';
        
        uploadResult = await supabaseAdmin
          .storage
          .from('documents')
          .upload(storagePath, fileToUpload, {
            contentType: contentType,
            upsert: true,
            cacheControl: '3600'
          });
          
        if (uploadResult.error) {
          if (uploadAttempts >= maxUploadAttempts) {
            throw new Error(`Storage upload failed after ${maxUploadAttempts} attempts: ${uploadResult.error.message}`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempts));
          continue;
        }
        
        // Upload successful, break the loop
        break;
        
      } catch (uploadError) {
        console.error(`Upload attempt ${uploadAttempts} failed:`, uploadError);
        
        if (uploadAttempts >= maxUploadAttempts) {
          await uploadRateLimiter.recordAttempt(clientIp, false, { 
            reason: 'storage_upload_failed',
            orderId,
            attempts: uploadAttempts,
            error: uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
          });
          return NextResponse.json({
            success: false,
            message: 'Failed to upload document to storage after multiple attempts',
            code: 'STORAGE_UPLOAD_FAILED',
            error: uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
          }, { status: 500 });
        }
      }
    }
    
    // 14. Update the order status and document path
    const pathToStore = uploadResult?.data?.path || storagePath;
    console.log('Updating order with document path:', pathToStore);
    
    const updateData: any = {
      document_path: pathToStore,
      status: 'document_verification', 
      revision_message: null,
      updated_at: new Date().toISOString()
    };
    
    // Add encryption metadata if encryption was used
    if (encryptionEnabled && encryptionMetadata) {
      updateData.encryption_metadata = encryptionMetadata;
      updateData.encryption_version = 1;
    }
    
    const updateResult = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
      
    if (updateResult.error) {
      console.error('Order update error details:', updateResult.error);
      await uploadRateLimiter.recordAttempt(clientIp, false, { 
        reason: 'order_update_failed',
        orderId,
        error: updateResult.error.message
      });
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to update order status',
        code: 'ORDER_UPDATE_FAILED',
        error: updateResult.error?.message || 'Unknown update error'
      }, { status: 500 });
    }

    // 15. Record upload in tracking table
    try {
      await supabaseAdmin
        .from('document_uploads')
        .insert({
          order_id: orderId,
          file_name: sanitizedFileName,
          file_size: file.size,
          file_type: file.type,
          storage_path: pathToStore,
          client_ip: clientIp,
          created_at: new Date().toISOString()
        });
    } catch (trackingError) {
      console.warn('Failed to record upload tracking:', trackingError);
      // Non-critical, continue
    }
    
    // 16. Send email notifications with rate limiting
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        // Check email rate limiting
        const emailRateCheck = await checkRateLimit(clientIp, emailRateLimiter, {
          orderId,
          emailType: 'revision_notification'
        });
        
        if (emailRateCheck.success) {
          // Set up attachments - logo file
          let logoAttachment;
          try {
            if (fs.existsSync(LOGO_PATH)) {
              logoAttachment = {
                filename: 'logo.png',
                path: LOGO_PATH,
                cid: 'company-logo'
              };
            }
          } catch (logoError) {
            console.warn('Error checking for logo file:', logoError);
          }
          
          // Prepare email attachments (don't attach customer documents to admin email for security)
          const attachments: EmailAttachment[] = [];
          if (logoAttachment) {
            attachments.push(logoAttachment as EmailAttachment);
          }
          
          // Get configured email addresses
          const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@evisa-service.com';
          const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@evisa-service.com';
          
          // Sanitize email addresses for security
          const sanitizedCustomerEmail = SecurityValidator.validateAndSanitize(orderData.email, {
            maxLength: 254,
            checkXSS: true
          }).sanitized;
          
          const sanitizedCustomerName = SecurityValidator.validateAndSanitize(orderData.name, {
            maxLength: 100,
            checkXSS: true
          }).sanitized;

          // Send email to admin (without customer document attachment)
          await sendMail({
            from: `"E-Visa Service" <${fromEmail}>`,
            to: adminEmail,
            subject: `${t.adminSubject}${sanitizedCustomerName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f0f7ff; padding: 20px; text-align: center;">
                  ${logoAttachment ? `<img src="cid:company-logo" alt="E-Visa Service Logo" style="max-height: 60px; margin-bottom: 15px;">` : ''}
                  <h2 style="color: #2563eb; margin: 0;">${t.adminTitle}</h2>
                </div>
                
                <div style="padding: 20px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none;">
                  <p>${t.adminMessage}</p>
                  <p><strong>Order ID:</strong> ${orderId}</p>
                  <p><strong>Customer:</strong> ${sanitizedCustomerName}</p>
                  <p><strong>Email:</strong> ${sanitizedCustomerEmail}</p>
                  <p><strong>Service:</strong> ${orderData.service_name}</p>
                  <p style="margin-top: 20px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">Document uploaded and ready for review.</p>
                </div>
              </div>
            `,
            attachments
          });
          
          // Send confirmation to customer
          await sendMail({
            from: `"E-Visa Service" <${fromEmail}>`,
            to: sanitizedCustomerEmail,
            subject: `${t.customerSubject}${orderData.service_name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Logo -->
                <div style="background-color: #f0f7ff; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                  ${logoAttachment ? `<img src="cid:company-logo" alt="E-Visa Service Logo" style="max-height: 70px; margin-bottom: 15px;">` : ''}
                  <h2 style="color: #2563eb; margin: 0; font-size: 24px;">${t.customerTitle}</h2>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 30px; background-color: #ffffff;">
                  <p style="font-size: 16px; margin-bottom: 25px;">Hello <strong>${sanitizedCustomerName}</strong>,</p>
                  
                  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 25px;">
                    <p style="margin: 0; font-size: 16px;">${t.customerMessage}</p>
                  </div>
                  
                  <p style="font-size: 16px; line-height: 1.6;">${t.statusUpdateMessage}</p>
                  <p style="font-size: 16px; line-height: 1.6;">${t.documentReceivedMessage}</p>
                </div>
                
                <!-- Footer -->
                <div style="padding: 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="color: #64748b; font-size: 13px; margin: 0;">${t.footerMessage}</p>
                </div>
              </div>
            `,
            attachments
          });

          // Record successful email sending
          await emailRateLimiter.recordAttempt(clientIp, true, {
            orderId,
            emailType: 'revision_notification'
          });
        } else {
          console.warn('Email rate limit exceeded for IP:', clientIp);
          // Don't fail the upload if email rate limited
        }
      } catch (emailError) {
        // Record failed email attempt
        await emailRateLimiter.recordAttempt(clientIp, false, {
          orderId,
          error: emailError instanceof Error ? emailError.message : 'Unknown email error'
        });
        
        console.error('Error sending email notifications:', emailError);
        // Continue with the response even if email sending fails
      }
    }
    
    // 17. Record successful upload
    await uploadRateLimiter.recordAttempt(clientIp, true, {
      orderId,
      fileName: sanitizedFileName,
      fileSize: file.size,
      fileType: file.type
    });
    
    // 18. Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Document revision uploaded successfully',
      data: {
        path: pathToStore,
        encrypted: encryptionEnabled,
        orderId: orderId,
        fileName: sanitizedFileName
      }
    });
    
  } catch (error) {
    console.error('Error processing document revision:', error);
    
    // Record failed attempt if we have the necessary info
    try {
      const clientIp = getClientIp(req);
      await uploadRateLimiter.recordAttempt(clientIp, false, {
        error: error instanceof Error ? error.message : 'Unknown processing error',
        stack: error instanceof Error ? error.stack : undefined
      });
    } catch (rateLimitError) {
      console.error('Failed to record rate limit attempt:', rateLimitError);
    }
    
    // Enhanced error response without exposing internal details
    const errorMessage = error instanceof Error 
      ? (error.message.includes('ENOSPC') 
          ? 'Server storage temporarily full' 
          : 'Failed to process document revision')
      : 'Unknown error occurred';
    
    return NextResponse.json({ 
      success: false, 
      message: errorMessage,
      code: 'PROCESSING_ERROR'
    }, { status: 500 });
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        if (fs.existsSync(tempFilePath)) {
          await unlink(tempFilePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
        // This is non-critical, so continue
      }
    }
  }
}