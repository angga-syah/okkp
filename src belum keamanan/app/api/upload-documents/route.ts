// app/api/upload-documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/mail';
import path from 'path';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import { storeCustomerData } from '@/lib/sb';
import { getEmailTranslations } from '@/lib/translations';

// Import logo as file path instead of direct import
const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'logo', 'logo_email.png');

// Define our custom file interface to replace formidable's File
interface CustomFile {
  filepath: string;
  originalFilename: string;
  newFilename: string;
  mimetype: string;
  size: number;
}

// Define the types for parsed form data
interface FormFields {
  customerName: string;
  customerEmail: string;
  serviceId: string;
  serviceName: string;
  invoiceId?: string;
  paymentUrl?: string;
  sendPaymentLinkByEmail?: string;
  language?: string;
}

interface FormFiles {
  allRequirements: CustomFile | CustomFile[];
}

// Define a web File interface for explicit type casting
interface WebFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

// Define a type for database errors
type DatabaseError = Error | string | Record<string, unknown>;

// Memoized parseFormData function
const parseFormDataMemoized = (() => {
  const cache = new Map();
  
  return async function parseFormData(req: Request): Promise<{ fields: FormFields; files: FormFiles }> {
    // Create a simple cache key based on form data size
    const cacheKey = req.headers.get('content-length');
    if (cacheKey && cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    
    const formData = await req.formData();
    const fields: Partial<FormFields> = {};
    const files: Partial<FormFiles> = {};
    
    // Create temp directory for file storage
    const tempDir = join(os.tmpdir(), 'evisa-uploads', uuidv4());
    await mkdir(tempDir, { recursive: true });
    
    // Use Array.from instead of for...of to avoid iterator issues
    const entries = Array.from(formData.entries());
    
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      
      if (value instanceof File) {
        // Handle file uploads with explicit type casting
        if (key === 'allRequirements') {
          // Get web file properties
          const webFile = value as WebFile;
          
          // Create a temporary file path
          const filePath = join(tempDir, webFile.name);
          const buffer = Buffer.from(await webFile.arrayBuffer());
          await writeFile(filePath, buffer);
          
          // Create our custom File object with properties we need
          const customFile: CustomFile = {
            filepath: filePath,
            originalFilename: webFile.name,
            newFilename: webFile.name,
            mimetype: webFile.type,
            size: webFile.size
          };
          
          files.allRequirements = customFile;
        }
      } else {
        // Handle regular form fields
        if (isFieldKey(key)) {
          fields[key] = value as string;
        }
      }
    }
    
    const result = { 
      fields: fields as FormFields,
      files: files as FormFiles
    };
    
    // Cache the result
    if (cacheKey) {
      cache.set(cacheKey, result);
      
      // Clear cache after 1 minute to prevent memory issues
      setTimeout(() => cache.delete(cacheKey), 60000);
    }
    
    return result;
  };
})();

// Helper function to type check form field keys
function isFieldKey(key: string): key is keyof FormFields {
  return [
    'customerName',
    'customerEmail',
    'serviceId',
    'serviceName',
    'invoiceId',
    'paymentUrl',
    'sendPaymentLinkByEmail',
    'language'
  ].includes(key);
}

// Optimized email template renderer for iOS compatibility
function renderIOSCompatibleEmail(
  template: string, 
  buttonUrl: string, 
  buttonText: string
): string {
  // Make links iOS compatible by using two approaches:
  // 1. Use padding/margin to increase click area
  // 2. Ensure the link is displayed as a block element
  
  // Replace button style to be iOS compatible
  return template.replace(
    /<a href="([^"]+)"([^>]+)>(.*?)<\/a>/g, 
    (match, url, attrs, text) => {
      // For payment button or tracking button
      if (match.includes('display: inline-block') || match.includes('background-color:')) {
        return `<a href="${url}" ${attrs} style="display: block; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; background-color: #2563eb; color: white; text-align: center; margin: 10px auto; width: 80%; max-width: 300px;">${text}</a>`;
      }
      // For standard links
      return `<a href="${url}" ${attrs} style="color: #2563eb; display: inline-block; padding: 5px 0; word-break: break-all;">${text}</a>`;
    }
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = req.headers.get('x-request-id') || uuidv4();
  console.log(`[${requestId}] Starting upload-documents processing`);
  
  try {
    // Check if required environment variables are set for email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn(`[${requestId}] Email configuration missing. Email functionality may not work correctly.`);
    }

    // Get language from header first (most reliable method)
    const preferredLanguage = req.headers.get('x-preferred-language') || 'en';
    
    // Parse the form data using our memoized helper function
    console.time(`[${requestId}] parseFormData`);
    const { fields, files } = await parseFormDataMemoized(req);
    console.timeEnd(`[${requestId}] parseFormData`);
    
    // Get uploaded document - handle both single file and array cases
    const uploadedFile = Array.isArray(files.allRequirements) 
      ? files.allRequirements[0] 
      : files.allRequirements;

    // Check if file exists and has filepath property
    if (!uploadedFile || !uploadedFile.filepath) {
      return NextResponse.json({ 
        success: false, 
        message: preferredLanguage === 'id' ? 'File tidak ditemukan atau tidak valid' : 'File not found or invalid'
      }, { status: 400 });
    }

    // Get customer information
    const customerName = fields.customerName;
    const customerEmail = fields.customerEmail;
    const serviceId = fields.serviceId;
    const serviceName = fields.serviceName;
    const paymentUrl = fields.paymentUrl;
    const invoiceId = fields.invoiceId;
    const language = fields.language;

    // Determine language priority: header > form field > default
    const finalLanguage = preferredLanguage || language || 'en';

    // Get translations for specified language or default to English
    const t = getEmailTranslations(finalLanguage);

    // Create manual payment URL if not provided
    let finalPaymentUrl = paymentUrl;
    if (invoiceId && (!finalPaymentUrl || finalPaymentUrl === '')) {
      finalPaymentUrl = `https://checkout-staging.xendit.co/web/${invoiceId}`;
    }
    
    // Base URL for tracking link
    const baseUrl = process.env.NEXT_PUBLIC_TRACK_URL || 'https://demo.fortunasadanioga.com/track';
    
    console.time(`[${requestId}] storeCustomerData`);
    let supabaseResult: { 
      success: boolean; 
      id: string; 
      error: DatabaseError | null 
    } = { 
      success: false, 
      id: '', 
      error: null 
    };
    
    try {
      // Check if Supabase environment variables are set
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn(`[${requestId}] Supabase environment variables are missing. Database operations will be skipped.`);
        supabaseResult.error = 'Missing Supabase configuration';
      } else {
        // Read the file into a buffer instead of a FileBlob for better memory efficiency
        const fileBuffer = await require('fs/promises').readFile(uploadedFile.filepath);
        
        // MODIFIED: Update the storeCustomerData function call with custom storage path parameter
        const result = await storeCustomerData(
          {
            name: customerName,
            email: customerEmail,
            service_id: parseInt(serviceId),
            service_name: serviceName,
            invoice_id: invoiceId || undefined,
            payment_url: finalPaymentUrl || undefined,
            status: 'Pending Payment'
          },
          fileBuffer,
          // Pass a custom folder path to ensure consistency with revision uploads
          `documents/${invoiceId || uuidv4()}_${Date.now()}_${uploadedFile.originalFilename.replace(/\s+/g, '_')}`
        );
        
        // Explicitly handle the assignment to ensure type safety
        supabaseResult = {
          success: result.success,
          id: result.id || '',  // Set to empty string if undefined
          error: result.error || null
        };
        
        if (!supabaseResult.success) {
          console.warn(`[${requestId}] Warning: Failed to store in database, continuing with email flow:`, supabaseResult.error);
        } else {
          console.log(`[${requestId}] Successfully stored data in database with ID:`, supabaseResult.id);
        }
      }
    } catch (dbError) {
      console.error(`[${requestId}] Database storage error:`, dbError);
      supabaseResult.error = dbError as DatabaseError;
      // Continue with email flow even if database storage fails
    }
    console.timeEnd(`[${requestId}] storeCustomerData`);

    // Set up common attachments - logo file
    let logoAttachment: any | undefined;
    try {
      if (await require('fs/promises').access(LOGO_PATH).then(() => true).catch(() => false)) {
        logoAttachment = {
          filename: 'logo.png',
          path: LOGO_PATH,
          cid: 'company-logo'
        };
      } else {
        console.warn(`[${requestId}] Logo file not found at path:`, LOGO_PATH);
      }
    } catch (logoError) {
      console.warn(`[${requestId}] Error checking for logo file:`, logoError);
    }

// Create email content for admin with embedded logo using cid
    const adminEmailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f0f7ff; padding: 20px; text-align: center;">
        ${logoAttachment ? `<img src="cid:company-logo" alt="E-Visa Service Logo" style="max-height: 60px; margin-bottom: 15px;">` : ''}
        <h2 style="color: #2563eb; margin: 0;">${t.adminEmailTitle}</h2>
      </div>
      
      <div style="padding: 20px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none;">
        <p><strong>${t.nameLabel}</strong> ${customerName}</p>
        <p><strong>${t.emailLabel}</strong> ${customerEmail}</p>
        <p><strong>${t.serviceLabel}</strong> ${serviceName || `ID: ${serviceId}`}</p>
        ${invoiceId ? `<p><strong>${t.invoiceIdLabel}</strong> ${invoiceId}</p>` : ''}
        ${finalPaymentUrl ? `<p><strong>${t.paymentUrlLabel}</strong> <a href="${finalPaymentUrl}" style="color: #2563eb; display: inline-block; padding: 5px 0; word-break: break-all;">${finalPaymentUrl}</a></p>` : ''}
        <p style="margin-top: 20px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">${t.documentAttachedNote}</p>
        ${supabaseResult.success ? `<p>Stored in database with ID: ${supabaseResult.id}</p>` : ''}
        ${supabaseResult.error ? `<p style="color: #ef4444;">Database error: ${typeof supabaseResult.error === 'object' ? JSON.stringify(supabaseResult.error) : supabaseResult.error}</p>` : ''}
      </div>
    </div>
  `;
  
  // Prepare attachments for admin email
  const adminAttachments: any[] = [];
  if (logoAttachment) {
    adminAttachments.push(logoAttachment);
  }
  
  adminAttachments.push({
    filename: uploadedFile.originalFilename || 'document.pdf',
    path: uploadedFile.filepath,
  });
  
  // Get configured email addresses
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@evisa-service.com';
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@evisa-service.com';
  
  console.time(`[${requestId}] sendEmails`);
  
  // Process emails concurrently to improve performance
  const [adminEmailResult, customerEmailResult] = await Promise.all([
    // Send email to admin with attachment
    (async () => {
      try {
        return await sendMail({
          from: `"E-Visa Service" <${fromEmail}>`,
          to: adminEmail,
          subject: `${t.adminEmailSubject}${customerName}`,
          html: adminEmailContent,
          attachments: adminAttachments,
        });
      } catch (err) {
        console.error(`[${requestId}] Error sending admin email:`, err);
        return { success: false, error: err };
      }
    })(),
    
    // Send email to customer (either payment link or confirmation)
    (async () => {
      let customerEmailSent = false;
      try {
        // Prepare customer email attachments (logo only)
        const customerAttachments: any[] = [];
        if (logoAttachment) {
          customerAttachments.push(logoAttachment);
        }
        
        if (invoiceId && finalPaymentUrl) {
          // Create email content for customer with payment link - iOS compatible design
          let customerEmailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header with Logo -->
              <div style="background-color: #f0f7ff; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                ${logoAttachment ? `<img src="cid:company-logo" alt="E-Visa Service Logo" style="max-height: 70px; margin-bottom: 15px;">` : ''}
                <h2 style="color: #2563eb; margin: 0; font-size: 24px;">${t.customerEmailTitle}</h2>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 30px; background-color: #ffffff;">
                <p style="font-size: 16px; margin-bottom: 25px;">${t.customerEmailGreeting}<strong>${customerName}</strong>,</p>
                
                <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 25px;">
                  <p style="margin: 0; font-size: 16px;">${t.customerEmailOrderConfirmation}<strong>${serviceName}</strong> ${finalLanguage === 'id' ? 'telah berhasil dibuat dan dokumen Anda telah diterima.' : 'has been successfully created and your documents have been received.'}</p>
                </div>
                
                ${invoiceId ? `<p style="font-size: 16px; margin-bottom: 20px;"><strong>${t.invoiceIdLabel}</strong> <span style="background-color: #f0f7ff; padding: 3px 8px; border-radius: 4px;">${invoiceId}</span></p>` : ''}
                
                <p style="font-size: 16px; margin-bottom: 20px;">${t.customerEmailPaymentInstructions}</p>
                
                <!-- Payment Button - Made iOS compatible -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${finalPaymentUrl}" style="display: block; background-color: #2563eb; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; text-align: center; margin: 10px auto; width: 80%; max-width: 300px;">${t.customerEmailPaymentButton}</a>
                </div>
                
                <p style="font-size: 15px; color: #64748b; font-style: italic; margin-bottom: 25px;">${t.customerEmailIgnoreIfPaid}</p>
                
                <!-- Track Order Button - Made iOS compatible -->
                <div style="text-align: center; margin: 30px 0 10px 0;">
                  <a href="${baseUrl}?email=${encodeURIComponent(customerEmail)}&invoiceId=${encodeURIComponent(invoiceId)}" style="display: block; background-color: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; text-align: center; margin: 10px auto; width: 80%; max-width: 300px;">${t.trackOrder}</a>
                </div>
                
                <!-- Support Info -->
                <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin-top: 25px;">
                  <p style="margin: 0; font-size: 15px;">${t.customerEmailSupport}</p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="padding: 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="color: #64748b; font-size: 13px; margin: 0;">${t.customerEmailFooter}</p>
              </div>
            </div>
          `;
          
          // Apply iOS compatibility fixes to the email template
          customerEmailContent = renderIOSCompatibleEmail(
            customerEmailContent,
            finalPaymentUrl,
            t.customerEmailPaymentButton
          );
          
          // Send payment link email to customer
          const customerInfo = await sendMail({
            from: `"E-Visa Service" <${fromEmail}>`,
            to: customerEmail,
            subject: `${t.customerEmailSubject}${serviceName} - ${finalLanguage === 'id' ? 'Link Pembayaran' : 'Payment Link'}`,
            html: customerEmailContent,
            attachments: customerAttachments
          });
          
          console.log(`[${requestId}] Payment link email sent to customer:`, customerInfo.messageId);
          customerEmailSent = true;
          return customerInfo;
        } else {
          // Send confirmation email without payment link
          let confirmationEmailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header with Logo -->
              <div style="background-color: #f0f7ff; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                ${logoAttachment ? `<img src="cid:company-logo" alt="E-Visa Service Logo" style="max-height: 70px; margin-bottom: 15px;">` : ''}
                <h2 style="color: #2563eb; margin: 0; font-size: 24px;">${t.confirmationEmailTitle}</h2>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 30px; background-color: #ffffff;">
                <p style="font-size: 16px; margin-bottom: 25px;">${t.confirmationEmailGreeting}<strong>${customerName}</strong>,</p>
                
                <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 25px;">
                  <p style="margin: 0; font-size: 16px;">${t.confirmationEmailThankYou}<strong>${serviceName}</strong>.</p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6;">${t.confirmationEmailProcessing}</p>
                
                <!-- Track Order Button - Made iOS compatible -->
                <div style="text-align: center; margin: 30px 0 10px 0;">
                  <a href="${baseUrl}?email=${encodeURIComponent(customerEmail)}&invoiceId=${encodeURIComponent(invoiceId || '')}" style="display: block; background-color: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; text-align: center; margin: 10px auto; width: 80%; max-width: 300px;">${t.trackOrder}</a>
                </div>
                
                <!-- Support Info -->
                <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin-top: 25px;">
                  <p style="margin: 0; font-size: 15px;">${t.customerEmailSupport}</p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="padding: 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="color: #64748b; font-size: 13px; margin: 0;">${t.customerEmailFooter}</p>
              </div>
            </div>
          `;
          
          // Apply iOS compatibility fixes
          confirmationEmailContent = renderIOSCompatibleEmail(
            confirmationEmailContent, 
            `${baseUrl}?email=${encodeURIComponent(customerEmail)}&invoiceId=${encodeURIComponent(invoiceId || '')}`,
            t.trackOrder
          );
          
          // Send confirmation email to customer
          const confirmationEmailResult = await sendMail({
            from: `"E-Visa Service" <${fromEmail}>`,
            to: customerEmail,
            subject: `${t.confirmationEmailSubject}${serviceName}`,
            html: confirmationEmailContent,
            attachments: customerAttachments
          });
          
          if (confirmationEmailResult.success) {
            console.log(`[${requestId}] Confirmation email sent to customer:`, confirmationEmailResult.messageId);
            customerEmailSent = true;
          } else {
            console.warn(`[${requestId}] Failed to send confirmation email:`, confirmationEmailResult.error);
          }
          
          return confirmationEmailResult;
        }
      } catch (emailError) {
        console.error(`[${requestId}] Error sending email to customer:`, emailError);
        return { success: false, error: emailError, customerEmailSent };
      }
    })()
  ]);
  
  console.timeEnd(`[${requestId}] sendEmails`);
  
  // Delete temporary file after email is sent - with proper error handling
  try {
    if (uploadedFile && uploadedFile.filepath) {
      await unlink(uploadedFile.filepath);
    }
  } catch (fileError) {
    console.error(`[${requestId}] Error deleting temporary file:`, fileError);
    // Continue execution - this is not a critical error
  }
  
  return NextResponse.json({ 
    success: true, 
    message: finalLanguage === 'id' ? 'Dokumen berhasil diunggah dan dikirim via email' : 'Document successfully uploaded and sent via email',
    messageId: adminEmailResult.messageId,
    customerEmailSent: customerEmailResult.success,
    paymentUrl: finalPaymentUrl,
    storedInDatabase: supabaseResult.success,
    databaseId: supabaseResult.id || null,
    databaseError: supabaseResult.error ? (process.env.NODE_ENV === 'development' ? JSON.stringify(supabaseResult.error) : 'Database error occurred') : null
  }, { status: 200 });
  
  } catch (error) {
    console.error('Error in upload-documents:', error);
    // Get language from request headers as fallback since formdata might not be parseable in error case
    let language = 'en';
    
    if (req.headers.get('x-preferred-language')) {
      language = req.headers.get('x-preferred-language') as string;
    }
    
    return NextResponse.json({ 
      success: false, 
      message: language === 'id' ? 'Gagal mengunggah dokumen' : 'Failed to upload document',
      error: process.env.NODE_ENV === 'development' ? String(error) : 'Server error'
    }, { status: 500 });
  }
}