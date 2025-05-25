// app/api/upload-result/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/mail';
import { supabaseAdmin } from '@/lib/sb_admin';
import { encryptFile, createAccessToken, generateDownloadPassword } from '@/lib/encryption';
import path from 'path';
import fs from 'fs';
import { getServerSession } from 'next-auth/next';
import { ROLE_PERMISSIONS } from '@/lib/roles';

// Import logo path for email
const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'logo', 'logo_email.png');

// Define attachment type
interface MailAttachment {
  filename: string;
  path: string;
  cid?: string;
}

// Send email to customer about their available result
async function sendResultEmail(to: string, subject: string, html: string, attachments: MailAttachment[] = []) {
  try {
    // Verify we have the required environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return { success: false, error: 'Missing email configuration' };
    }
    
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@evisa-service.com';
    
    // Send email using our sendMail helper
    const result = await sendMail({
      from: `"E-Visa Service" <${fromEmail}>`,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments
    });
    
    return result;
  } catch (error) {
    return { success: false, error };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the user session directly using getServerSession
    const session = await getServerSession();
    
    // Check if the session exists and the user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    // Parse formData with error handling
    let formData;
    try {
      formData = await request.formData();
    } catch (_) {
      return NextResponse.json(
        { error: 'Gagal membaca data formulir' },
        { status: 400 }
      );
    }
    
    const file = formData.get('file') as File | null;
    const orderId = formData.get('orderId') as string | null;
    const shouldSendEmail = formData.get('sendEmail') === 'true';
    
    if (!file || !orderId) {
      return NextResponse.json(
        { error: 'File dan ID Pesanan diperlukan' },
        { status: 400 }
      );
    }

    // Get order data to have customer information
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('email, name, service_name, language')
      .eq('id', orderId)
      .single();
      
    if (orderError || !orderData) {
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Generate download password for this order
    const downloadPassword = generateDownloadPassword(orderId);

    // Generate a unique filename
    const timestamp = new Date().getTime();
    const fileExtension = getFileExtension(file.type);
    const filename = `result_${orderId}_${timestamp}${fileExtension}`;
    const filePath = `results/${orderId}/${filename}`;
    
    // Convert file to buffer for upload - with error handling
    let fileBuffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (_) {
      return NextResponse.json(
        { error: 'Gagal memproses file' },
        { status: 500 }
      );
    }
    
    // Create the directory structure first if it doesn't exist
    try {
      await supabaseAdmin.storage
        .from('documents')
        .upload(`results/${orderId}/.keep`, new Uint8Array(0), {
          upsert: true
        });
    } catch (_) {
      // Ignore error - this is just to ensure the directory exists
    }
    
    // Check if encryption is enabled
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
    let uploadError;
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
      .eq('id', orderId);
      
    if (updateError) {
      return NextResponse.json(
        { error: 'Gagal memperbarui pesanan', details: updateError.message },
        { status: 500 }
      );
    }
    
    // Send email to customer if requested
    if (shouldSendEmail && orderData.email) {
      // Create secure access URL for the result file
      const secureToken = createAccessToken(orderId, 604800); // 7 days
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
      } catch (_) {
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
      
      try {
        // Send email with Nodemailer including download password
        await sendResultEmail(
          orderData.email,
          isEnglish ? `Your ${orderData.service_name} Result is Available` : `Hasil Layanan ${orderData.service_name} Anda Sudah Tersedia`,
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
                  ${isEnglish ? 'Hello' : 'Halo'} <strong>${orderData.name}</strong>,
                </p>
                
                <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 25px;">
                  <p style="margin: 0; font-size: 16px;">
                    ${isEnglish
                      ? `Your order for <strong>${orderData.service_name}</strong> has been processed successfully.`
                      : `Pesanan Anda untuk layanan <strong>${orderData.service_name}</strong> telah selesai diproses.`
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
          attachments
        );
      } catch (_) {
        // Continue even if email sending fails - don't block the upload success response
      }
    }
    
    return NextResponse.json({
      success: true,
      filePath: filePath,
      encrypted: encryptionEnabled,
      downloadPassword: downloadPassword,
      message: 'File hasil berhasil diunggah'
    });
  } catch (error) {
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
    'image/png': '.png',
    'application/zip': '.zip',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
  };

  return mimeToExt[mimeType] || '.bin';
}