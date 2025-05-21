// app/api/upload-revision/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/sb_client';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { sendMail } from '@/lib/mail';
import path from 'path';
import { supabaseAdmin } from '@/lib/sb_admin';
import fs from 'fs';
import { encryptFile } from '@/lib/encryption';

// Define the attachment interface
interface EmailAttachment {
  filename: string;
  path: string;
  cid?: string;
}

// Import logo path similar to upload-documents route
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse the form data
    const formData = await req.formData();
    
    // Get the order ID
    const orderId = formData.get('orderId') as string;
    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order ID is required' 
      }, { status: 400 });
    }
    
    // Get the file
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        message: 'No file provided' 
      }, { status: 400 });
    }
    
    // Create a temporary directory for the file
    const tempDir = join(os.tmpdir(), 'evisa-revisions', uuidv4());
    await mkdir(tempDir, { recursive: true });
    
    // Save the file to disk
    const filePath = join(tempDir, file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);
    
    // Get order data from Supabase
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (orderError || !orderData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found',
        error: orderError?.message 
      }, { status: 404 });
    }
    
    // Get language from order record - use the language in the order, not from header
    const orderLanguage = orderData.language || 'en';
    const t = translations[orderLanguage] || translations.en;
    
    // Generate a unique filename with consistent path structure
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/\s+/g, '_');
    const storagePath = `revisi/${orderId}_revision_${timestamp}_${sanitizedFilename}`;
    
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
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to encrypt document',
          error: encryptionError instanceof Error ? encryptionError.message : 'Unknown encryption error'
        }, { status: 500 });
      }
    } else {
      // No encryption, use original file
      fileToUpload = fileBuffer;
    }
    
    // Upload the file to Supabase Storage
    let uploadResult;
    try {
      // Make sure we're setting the correct content type
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
        console.error('Storage upload error details:', uploadResult.error);
        
        // Try an alternative upload method if the direct method fails
        if (uploadResult.error.message.includes('permission') || uploadResult.error.statusCode === 400) {
          console.log('Attempting alternative upload method...');
          
          // Create a form data approach as fallback
          const formData = new FormData();
          formData.append('file', new Blob([fileToUpload], { type: contentType }), sanitizedFilename);
          
          // Try using the supabase createSignedUrl approach if available
          try {
            const { data: signedUrl, error: signedUrlError } = await supabaseAdmin
              .storage
              .from('documents')
              .createSignedUploadUrl(storagePath);
              
            if (signedUrlError) {
              throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
            }
            
            // Use the signed URL to upload
            const uploadResponse = await fetch(signedUrl.signedUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': contentType,
              },
              body: fileToUpload,
            });
            
            if (!uploadResponse.ok) {
              throw new Error(`Upload failed with status: ${uploadResponse.status}`);
            }
            
            // Successfully uploaded using signed URL
            uploadResult = { data: { path: storagePath }, error: null };
          } catch (fallbackError) {
            return NextResponse.json({ 
              success: false, 
              message: 'Failed to upload document to storage after multiple attempts',
              error: uploadResult.error?.message || 'Unknown storage error',
              fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error',
              details: JSON.stringify(uploadResult.error)
            }, { status: 500 });
          }
        } else {
          return NextResponse.json({ 
            success: false, 
            message: 'Failed to upload document to storage',
            error: uploadResult.error?.message || 'Unknown storage error',
            details: JSON.stringify(uploadResult.error)
          }, { status: 500 });
        }
      }
    } catch (error) {
      console.error('Exception during storage upload:', error);
      return NextResponse.json({
        success: false,
        message: 'Exception during document upload',
        error: error instanceof Error ? error.message : 'Unknown upload error',
        details: JSON.stringify(error)
      }, { status: 500 });
    }
    
    // Update the order status and document path with the new path if upload was successful
    const pathToStore = uploadResult?.data?.path || storagePath;
    console.log('Updating order with document path:', pathToStore);
    
    const updateData: any = {
      document_path: pathToStore, // Update to use the new document path
      status: 'document_verification', 
      revision_message: null,
      updated_at: new Date().toISOString()
    };
    
    // Add encryption metadata if encryption was used
    if (encryptionEnabled && encryptionMetadata) {
      updateData.encryption_metadata = encryptionMetadata;
      updateData.encryption_version = 1; // Version 1 of our encryption scheme
    }
    
    const updateResult = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
      
    // Add more detailed error logging
    if (updateResult.error) {
      console.error('Order update error details:', updateResult.error);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to update order status',
        error: updateResult.error?.message || 'Unknown update error',
        details: JSON.stringify(updateResult.error)
      }, { status: 500 });
    }
    
    // Send email notifications if email configuration exists
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
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
        
        // Prepare email attachments
        const attachments: EmailAttachment[] = [];
        if (logoAttachment) {
          attachments.push(logoAttachment as EmailAttachment);
        }
        
        // Also attach the revised document for admin
        const adminAttachments: EmailAttachment[] = [...attachments];
        adminAttachments.push({
          filename: file.name,
          path: filePath
        });
        
        // Get configured email addresses
        const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@evisa-service.com';
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@evisa-service.com';
        
        // Send email to admin
        await sendMail({
          from: `"E-Visa Service" <${fromEmail}>`,
          to: adminEmail,
          subject: `${t.adminSubject}${orderData.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;
            margin: 0 auto;">
              <div style="background-color: #f0f7ff; padding: 20px; text-align: center;">
                ${logoAttachment ? `<img src="cid:company-logo" alt="E-Visa Service Logo" style="max-height: 60px; margin-bottom: 15px;">` : ''}
                <h2 style="color: #2563eb; margin: 0;">${t.adminTitle}</h2>
              </div>
              
              <div style="padding: 20px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none;">
                <p>${t.adminMessage}</p>
                <p><strong>Order ID:</strong> ${orderData.id}</p>
                <p><strong>Customer:</strong> ${orderData.name}</p>
                <p><strong>Email:</strong> ${orderData.email}</p>
                <p><strong>Service:</strong> ${orderData.service_name}</p>
                <p style="margin-top: 20px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">Revised document attached.</p>
              </div>
            </div>
          `,
          attachments: adminAttachments
        });
        
        // Send confirmation to customer
        await sendMail({
          from: `"E-Visa Service" <${fromEmail}>`,
          to: orderData.email,
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
                <p style="font-size: 16px; margin-bottom: 25px;">Hello <strong>${orderData.name}</strong>,</p>
                
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
      } catch (emailError) {
        // Continue with the response even if email sending fails
        console.error('Error sending email notifications:', emailError);
      }
    }
    
    // Clean up temporary file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temporary file:', cleanupError);
      // This is non-critical, so continue
    }
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Document revision uploaded successfully',
      path: pathToStore,
      encrypted: encryptionEnabled
    });
    
  } catch (error) {
    console.error('Error processing document revision:', error);
    // More detailed error response
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to process document revision',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      details: JSON.stringify(error)
    }, { status: 500 });
  }
}