// app/api/upload-result/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/mail';
import { supabaseAdmin } from '@/lib/sb_admin';
import { encryptFile, createAccessToken, generateDownloadPassword } from '@/lib/encryption';
import path from 'path';
import fs from 'fs';
import { getServerSession } from 'next-auth/next';
import { ROLE_PERMISSIONS } from '@/lib/roles';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';

// Rate limiters
const uploadLimiter = new EnhancedRateLimiter('upload_result', {
  maxAttempts: 10,
  windowMinutes: 60, // 1 hour window
  lockoutMinutes: 120, // 2 hour lockout
  progressiveDelay: true
});

const emailLimiter = new EnhancedRateLimiter('result_email', {
  maxAttempts: 5, // Strict limit for email sending
  windowMinutes: 60,
  lockoutMinutes: 180, // 3 hour lockout for email spam prevention
  progressiveDelay: true
});

// Import logo path for email
const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'logo', 'logo_email.png');

// Define attachment type
interface MailAttachment {
  filename: string;
  path: string;
  cid?: string;
}

// File security configuration
const FILE_SECURITY = {
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB limit for Vercel/Supabase free
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ],
  ALLOWED_EXTENSIONS: [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', 
    '.zip', '.doc', '.docx', '.xls', '.xlsx', '.txt'
  ]
};

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = forwarded?.split(',')[0] || realIP || 'unknown';
  return clientIP;
}

// Validate file security
function validateFileSecurity(file: File): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > FILE_SECURITY.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File too large. Maximum size is ${FILE_SECURITY.MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  // Check empty file
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'Empty file not allowed'
    };
  }

  // Check MIME type
  if (!FILE_SECURITY.ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not allowed'
    };
  }

  // Check file extension
  const filename = file.name.toLowerCase();
  const hasValidExtension = FILE_SECURITY.ALLOWED_EXTENSIONS.some(ext => 
    filename.endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      isValid: false,
      error: 'File extension not allowed'
    };
  }

  // Check for suspicious patterns in filename
  const suspiciousPatterns = [
    /\.\./,
    /[<>:"|?*]/,
    /\x00/,
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.jar$/i,
    /\.com$/i,
    /\.pif$/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filename)) {
      return {
        isValid: false,
        error: 'Suspicious filename detected'
      };
    }
  }

  return { isValid: true };
}

// Send email to customer about their available result with rate limiting
async function sendResultEmail(
  to: string, 
  subject: string, 
  html: string, 
  attachments: MailAttachment[] = [],
  clientIP: string
) {
  try {
    // Check email rate limit
    const emailRateLimit = await emailLimiter.checkAndLimit(clientIP);
    
    if (!emailRateLimit.success) {
      if (emailRateLimit.isLocked) {
        throw new Error(`Email rate limit exceeded. Locked for ${emailRateLimit.lockoutDuration} seconds.`);
      }
      throw new Error('Email rate limit exceeded. Please try again later.');
    }

    // Validate email address
    if (!SecurityValidator.validateEmail(to)) {
      await emailLimiter.recordAttempt(clientIP, false, { error: 'Invalid email format' });
      throw new Error('Invalid email address format');
    }

    // Verify we have the required environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      await emailLimiter.recordAttempt(clientIP, false, { error: 'Missing email config' });
      return { success: false, error: 'Missing email configuration' };
    }
    
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@evisa-service.com';
    
    // Validate and sanitize email content
    const sanitizedSubject = SecurityValidator.validateAndSanitize(subject, {
      maxLength: 200,
      allowHTML: false
    }).sanitized;

    // Basic HTML sanitization for email content
    const sanitizedHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                             .replace(/javascript:/gi, '')
                             .replace(/on\w+\s*=/gi, '');
    
    // Send email using our sendMail helper
    const result = await sendMail({
      from: `"E-Visa Service" <${fromEmail}>`,
      to: to,
      subject: sanitizedSubject,
      html: sanitizedHtml,
      attachments: attachments
    });
    
    if (result.success) {
      await emailLimiter.recordAttempt(clientIP, true, { 
        recipient: to,
        subject: sanitizedSubject.substring(0, 50)
      });
    } else {
      await emailLimiter.recordAttempt(clientIP, false, { 
        error: 'Send failed',
        recipient: to
      });
    }
    
    return result;
  } catch (error) {
    await emailLimiter.recordAttempt(clientIP, false, { 
      error: error instanceof Error ? error.message : String(error),
      recipient: to
    });
    return { success: false, error };
  }
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  let attemptLogged = false;

  try {
    // Rate limiting check
    const rateLimitResult = await uploadLimiter.checkAndLimit(clientIP);
    
    if (!rateLimitResult.success) {
      if (rateLimitResult.isLocked) {
        return NextResponse.json({
          error: 'Too many upload attempts. Please try again later.',
          lockoutDuration: rateLimitResult.lockoutDuration
        }, { status: 429 });
      }
      
      if (rateLimitResult.nextAttemptDelay) {
        return NextResponse.json({
          error: `Please wait ${rateLimitResult.nextAttemptDelay} seconds before trying again.`,
          retryAfter: rateLimitResult.nextAttemptDelay
        }, { status: 429 });
      }
      
      return NextResponse.json({
        error: 'Rate limit exceeded. Please try again later.',
        resetTime: new Date(rateLimitResult.resetTime).toISOString()
      }, { status: 429 });
    }

    // Get the user session directly using getServerSession
    const session = await getServerSession();
    
    // Check if the session exists and the user is authenticated
    if (!session || !session.user) {
      await uploadLimiter.recordAttempt(clientIP, false, { error: 'No authentication' });
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    attemptLogged = true;
    await uploadLimiter.recordAttempt(clientIP, false, { 
      stage: 'authenticated',
      userId: session.user.email
    });

    // Parse formData with error handling
    let formData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      await uploadLimiter.recordAttempt(clientIP, false, { 
        error: 'FormData parse failed',
        userId: session.user.email
      });
      return NextResponse.json(
        { error: 'Gagal membaca data formulir' },
        { status: 400 }
      );
    }
    
    const file = formData.get('file') as File | null;
    const orderId = formData.get('orderId') as string | null;
    const shouldSendEmail = formData.get('sendEmail') === 'true';
    
    if (!file || !orderId) {
      await uploadLimiter.recordAttempt(clientIP, false, { 
        error: 'Missing file or orderId',
        userId: session.user.email
      });
      return NextResponse.json(
        { error: 'File dan ID Pesanan diperlukan' },
        { status: 400 }
      );
    }

    // Validate and sanitize orderId
    const orderIdValidation = SecurityValidator.validateAndSanitize(orderId, {
      maxLength: 100,
      checkXSS: true,
      checkSQLInjection: true,
      checkPathTraversal: true
    });

    if (!orderIdValidation.isValid) {
      await uploadLimiter.recordAttempt(clientIP, false, { 
        error: 'Invalid orderId format',
        violations: orderIdValidation.violations,
        userId: session.user.email
      });
      return NextResponse.json(
        { error: 'ID Pesanan tidak valid' },
        { status: 400 }
      );
    }

    const sanitizedOrderId = orderIdValidation.sanitized;

    // Validate file security
    const fileValidation = validateFileSecurity(file);
    if (!fileValidation.isValid) {
      await uploadLimiter.recordAttempt(clientIP, false, { 
        error: 'File validation failed',
        reason: fileValidation.error,
        userId: session.user.email,
        orderId: sanitizedOrderId
      });
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    // Get order data to have customer information
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('email, name, service_name, language, status')
      .eq('id', sanitizedOrderId)
      .single();
      
    if (orderError || !orderData) {
      await uploadLimiter.recordAttempt(clientIP, false, { 
        error: 'Order not found',
        orderId: sanitizedOrderId,
        userId: session.user.email,
        dbError: orderError?.message
      });
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Allow re-upload for completed orders (admin can update results)
    // No status restriction for admin operations

    // Generate download password for this order
    const downloadPassword = generateDownloadPassword(sanitizedOrderId);

    // Generate a unique filename with proper sanitization
    const timestamp = new Date().getTime();
    const fileExtension = getFileExtension(file.type);
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.+/g, '.');
    
    // Extract original extension from filename if available
    const originalExtension = sanitizedOriginalName.includes('.') 
      ? '.' + sanitizedOriginalName.split('.').pop()?.toLowerCase() 
      : fileExtension;
    
    // Use proper extension based on MIME type or original filename
    const finalExtension = fileExtension !== '.bin' ? fileExtension : originalExtension;
    
    const filename = `result_${sanitizedOrderId}_${timestamp}${finalExtension}`;
    const filePath = `results/${sanitizedOrderId}/${filename}`;
    
    // Convert file to buffer for upload - with error handling
    let fileBuffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (bufferError) {
      await uploadLimiter.recordAttempt(clientIP, false, { 
        error: 'File buffer conversion failed',
        orderId: sanitizedOrderId,
        userId: session.user.email
      });
      return NextResponse.json(
        { error: 'Gagal memproses file' },
        { status: 500 }
      );
    }
    
    // Create the directory structure first if it doesn't exist
    try {
      await supabaseAdmin.storage
        .from('documents')
        .upload(`results/${sanitizedOrderId}/.keep`, new Uint8Array(0), {
          upsert: true
        });
    } catch (dirError) {
      // Ignore error - this is just to ensure the directory exists
    }
    
    // Check if encryption is enabled
    const encryptionEnabled = process.env.ENABLE_DOCUMENT_ENCRYPTION === 'true';
    let encryptionMetadata: string | null = null;
    let fileToUpload: Buffer;
    
    if (encryptionEnabled) {
      try {
        // Encrypt the file
        const encryptedData = encryptFile(fileBuffer, sanitizedOrderId);
        
        // Add original file metadata to encryption data
        const encryptionMetadataWithType = {
          ...encryptedData,
          originalContentType: file.type,
          originalFilename: file.name,
          originalSize: file.size
        };
        
        // Convert to JSON and encode as base64 for storage
        encryptionMetadata = Buffer.from(JSON.stringify(encryptionMetadataWithType)).toString('base64');
        
        // Prepare placeholder file with encrypted data
        fileToUpload = Buffer.from(encryptedData.data, 'base64');
      } catch (encryptionError) {
        console.error('Encryption error:', encryptionError);
        await uploadLimiter.recordAttempt(clientIP, false, { 
          error: 'Encryption failed',
          orderId: sanitizedOrderId,
          userId: session.user.email
        });
        return NextResponse.json(
          { error: 'Failed to encrypt result file' },
          { status: 500 }
        );
      }
    } else {
      // No encryption, use original file
      fileToUpload = fileBuffer;
    }
    
    // Upload file to Supabase Storage with retry mechanism
    let uploadError: any = null;
    let retries = 0;
    const maxRetries = 2;
    
    while (retries < maxRetries) {
      const uploadResult = await supabaseAdmin.storage
        .from('documents')
        .upload(filePath, fileToUpload, {
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
          upsert: true
        });
      
      uploadError = uploadResult.error;
      
      if (!uploadError) break;
      retries++;
      
      // Wait a bit before retrying
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
      
    if (uploadError) {
      await uploadLimiter.recordAttempt(clientIP, false, { 
        error: 'Storage upload failed',
        orderId: sanitizedOrderId,
        userId: session.user.email,
        storageError: uploadError.message
      });
      return NextResponse.json(
        { error: 'Gagal mengunggah file', details: uploadError.message },
        { status: 500 }
      );
    }
    
    // Update order with result file path, encryption metadata, and download password
    const updateData: any = { 
      result_file_path: filePath,
      status: 'completed', // Update status to completed
      download_password: downloadPassword // Store the download password
    };
    
    // Add encryption metadata if encryption was used
    if (encryptionEnabled && encryptionMetadata) {
      updateData.result_encryption_metadata = encryptionMetadata;
      updateData.result_encryption_version = 1; // Version 1 of our encryption scheme
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', sanitizedOrderId);
      
    if (updateError) {
      await uploadLimiter.recordAttempt(clientIP, false, { 
        error: 'Database update failed',
        orderId: sanitizedOrderId,
        userId: session.user.email,
        dbError: updateError.message
      });
      return NextResponse.json(
        { error: 'Gagal memperbarui pesanan', details: updateError.message },
        { status: 500 }
      );
    }
    
    // Send email to customer if requested
    if (shouldSendEmail && orderData.email) {
      // Validate customer email
      if (!SecurityValidator.validateEmail(orderData.email)) {
        // Log but don't fail the upload
        console.warn('Invalid customer email address:', orderData.email);
      } else {
        try {
          // Create secure access URL for the result file
          const secureToken = createAccessToken(sanitizedOrderId, 604800); // 7 days
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
          const downloadUrl = `${baseUrl}/download/${encodeURIComponent(secureToken)}`;
          
          // Set up logo attachment if available
          let logoAttachment: MailAttachment | undefined;
          try {
            if (fs.existsSync(LOGO_PATH)) {
              logoAttachment = {
                filename: 'logo.png',
                path: LOGO_PATH,
                cid: 'company-logo'
              };
            }
          } catch (logoError) {
            // Continue without logo if there's an error
          }
          
          // Prepare email attachments (logo only)
          const attachments: MailAttachment[] = [];
          if (logoAttachment) {
            attachments.push(logoAttachment);
          }
          
          // Determine language for email content
          const language = orderData.language || 'id'; // Default to Indonesian
          const isEnglish = language === 'en';
          
          // Sanitize customer data for email
          const sanitizedCustomerName = SecurityValidator.validateAndSanitize(orderData.name || '', {
            maxLength: 255,
            allowHTML: false
          }).sanitized;
          
          const sanitizedServiceName = SecurityValidator.validateAndSanitize(orderData.service_name || '', {
            maxLength: 255,
            allowHTML: false
          }).sanitized;
          
          // Send email with Nodemailer including download password
          await sendResultEmail(
            orderData.email,
            isEnglish ? `Your ${sanitizedServiceName} Result is Available` : `Hasil Layanan ${sanitizedServiceName} Anda Sudah Tersedia`,
            `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Logo -->
                <div style="background-color: #f0f7ff; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                  ${logoAttachment ? `<img src="cid:company-logo" alt="E-Visa Service Logo" style="max-height: 70px; margin-bottom: 15px;">` : ''}
                  <h2 style="color: #2563eb; margin: 0; font-size: 24px;">
                    ${isEnglish ? 'Your Service Result is Available' : 'Hasil Layanan Anda Sudah Tersedia'}
                  </h2>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 30px; background-color: #ffffff;">
                  <p style="font-size: 16px; margin-bottom: 25px;">
                    ${isEnglish ? 'Hello' : 'Halo'} <strong>${sanitizedCustomerName}</strong>,
                  </p>
                  
                  <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 25px;">
                    <p style="margin: 0; font-size: 16px;">
                      ${isEnglish
                        ? `Your order for <strong>${sanitizedServiceName}</strong> has been processed successfully.`
                        : `Pesanan Anda untuk layanan <strong>${sanitizedServiceName}</strong> telah selesai diproses.`
                      }
                    </p>
                  </div>
                  
                  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    ${isEnglish
                      ? 'Your service result document is now available for download. To access your document, you will need the download password below:'
                      : 'Dokumen hasil layanan Anda sudah tersedia untuk diunduh. Untuk mengakses dokumen Anda, gunakan password download di bawah ini:'
                    }
                  </p>
                  
                  <!-- Download Password -->
                  <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                    <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">
                      ${isEnglish ? 'Download Password' : 'Password Download'}
                    </h3>
                    <div style="font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; color: #92400e; letter-spacing: 2px; background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #f59e0b;">
                      ${downloadPassword}
                    </div>
                    <p style="font-size: 12px; color: #92400e; margin: 10px 0 0 0; font-style: italic;">
                      ${isEnglish ? 'Keep this password safe - you will need it to download your document' : 'Simpan password ini dengan aman - Anda memerlukan password ini untuk mengunduh dokumen'}
                    </p>
                  </div>
                  
                  <!-- Download Button -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${downloadUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; transition: background-color 0.3s ease;" target="_blank">
                      ${isEnglish ? 'Download Result' : 'Unduh Hasil'}
                    </a>
                  </div>
                  
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 25px 0;">
                    <p style="margin: 0; font-size: 14px; color: #991b1b;">
                      <strong>${isEnglish ? 'Important:' : 'Penting:'}</strong>
                      ${isEnglish 
                        ? 'This download link is valid for 7 days. Please download your document as soon as possible.' 
                        : 'Link download ini berlaku selama 7 hari. Mohon unduh dokumen Anda sesegera mungkin.'
                      }
                    </p>
                  </div>
                  
                  <!-- Support Info -->
                  <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin-top: 25px;">
                    <p style="margin: 0; font-size: 15px;">
                      ${isEnglish
                        ? 'If you have any questions or need assistance with downloading, please contact our support team via email or WhatsApp listed on our website.'
                        : 'Jika Anda memiliki pertanyaan atau memerlukan bantuan untuk mengunduh, silakan hubungi tim dukungan kami melalui email atau WhatsApp yang tercantum di website.'
                      }
                    </p>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="padding: 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="color: #64748b; font-size: 13px; margin: 0;">
                    ${isEnglish
                      ? 'Thank you for using our service.'
                      : 'Terima kasih telah menggunakan layanan kami.'
                    }
                  </p>
                </div>
              </div>
            `,
            attachments,
            clientIP
          );
        } catch (emailError) {
          // Continue even if email sending fails - don't block the upload success response
          console.warn('Email sending failed:', emailError);
        }
      }
    }

    // Log successful upload
    await supabaseAdmin
      .from('security_logs')
      .insert({
        event_type: 'result_uploaded',
        ip_address: clientIP,
        user_agent: request.headers.get('user-agent') || 'unknown',
        message: `Result file uploaded for order: ${sanitizedOrderId}`,
        metadata: {
          orderId: sanitizedOrderId,
          fileName: filename,
          fileSize: file.size,
          fileType: file.type,
          encrypted: encryptionEnabled,
          emailSent: shouldSendEmail,
          userId: session.user.email
        },
        created_at: new Date().toISOString()
      })
      .then(() => {}) // Ignore logging errors
      .catch(() => {});

    // Record successful attempt  
    await uploadLimiter.recordAttempt(clientIP, true, { 
      orderId: sanitizedOrderId,
      fileSize: file.size,
      userId: session.user.email
    });
    
    return NextResponse.json({
      success: true,
      filePath: filePath,
      encrypted: encryptionEnabled,
      downloadPassword: downloadPassword,
      message: 'File hasil berhasil diunggah'
    });
  } catch (error) {
    console.error('Upload result error:', error);
    
    if (!attemptLogged) {
      await uploadLimiter.recordAttempt(clientIP, false, { 
        error: 'Server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan server', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/zip': '.zip',
    'application/x-zip-compressed': '.zip',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
    'application/rtf': '.rtf'
  };

  return mimeToExt[mimeType] || '';
}