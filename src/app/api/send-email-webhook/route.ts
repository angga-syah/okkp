// app/api/send-email-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb';
import { sendMail } from '@/lib/mail';
import * as z from 'zod';
import { getEmailTranslations } from '@/lib/translations';

export const runtime = "nodejs";
export const maxDuration = 25; // Reduced to 25 seconds to avoid Vercel timeouts

// Schema validation for request webhook
const WebhookSchema = z.object({
  orderId: z.string(),
  documentPath: z.string(),
  customerInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    serviceName: z.string(),
    invoiceId: z.string().optional(),
    paymentUrl: z.string().optional(),
  }),
  language: z.string().default('en')
});

type WebhookData = z.infer<typeof WebhookSchema>;

// Verify webhook authentication
function verifyWebhookAuth(req: NextRequest): boolean {
  const apiKey = req.headers.get('x-api-key');
  const secretKey = process.env.WEBHOOK_SECRET_KEY;
    
  // Check if the key is valid
  return apiKey === secretKey;
}

// Render iOS compatible email template
function renderIOSCompatibleEmail(template: string): string {
  // Improve iOS compatibility
  return template.replace(
    /<a href="([^"]+)"([^>]+)style="([^"]+)"([^>]*)>(.*?)<\/a>/g,
    (match, url, attrs1, style, attrs2, text) => {
      // For buttons
      if (style.includes('background-color:') || style.includes('color: white')) {
        return `<a href="${url}"${attrs1}style="display: block; background-color: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; text-align: center; margin: 10px auto; width: 80%; max-width: 300px;"${attrs2}>${text}</a>`;
      }
      
      // For regular links
      return `<a href="${url}"${attrs1}style="color: #2563eb; display: inline-block; padding: 5px 0; word-break: break-all;"${attrs2}>${text}</a>`;
    }
  );
}

// Process webhook function now returns void
async function processWebhook(req: NextRequest): Promise<void> {
  const requestId = req.headers.get('x-request-id') || `webhook-${Date.now()}`;
  console.log(`[${requestId}] Processing webhook request`);
  
  try {
    // Parse and validate request body
    const body = await req.json();
  
    let data: WebhookData;
    try {
      data = WebhookSchema.parse(body);
    } catch (validationError) {
      console.error(`[${requestId}] Webhook data validation error:`, validationError);
      throw new Error(`Validation error: ${JSON.stringify(validationError)}`);
    }
    
    // Get translations based on language
    const t = getEmailTranslations(data.language);
    
    // Create base URL for tracking link
    const trackUrl = process.env.NEXT_PUBLIC_TRACK_URL || 'https://demo.fortunasadanioga.com/track';
    
    console.time(`[${requestId}] downloadFile`);
    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('documents')
      .download(data.documentPath);
      
    if (downloadError || !fileData) {
      console.error(`[${requestId}] Error downloading file from Supabase:`, downloadError);
      throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
    }
    console.timeEnd(`[${requestId}] downloadFile`);
     
    // Get filename from path
    const filename = data.documentPath.split('/').pop() || 'document.pdf';
    
    // Convert file to buffer for email attachment
    const arrayBuffer = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    // Use public URL for logo
    const logoUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/images/logo/logo_email.png`;
    
    // Build admin email HTML content
    const adminEmailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f0f7ff; padding: 20px; text-align: center;">
        <img src="${logoUrl}" alt="E-Visa Service Logo" style="max-height: 60px; margin-bottom: 15px;">
        <h2 style="color: #2563eb; margin: 0;">${t.adminEmailTitle}</h2>
      </div>
      
      <div style="padding: 20px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none;">
        <p><strong>${t.nameLabel}</strong> ${data.customerInfo.name}</p>
        <p><strong>${t.emailLabel}</strong> ${data.customerInfo.email}</p>
        <p><strong>${t.serviceLabel}</strong> ${data.customerInfo.serviceName}</p>
        ${data.customerInfo.invoiceId ? `<p><strong>${t.invoiceIdLabel}</strong> ${data.customerInfo.invoiceId}</p>` : ''}
        ${data.customerInfo.paymentUrl ? `<p><strong>${t.paymentUrlLabel}</strong> <a href="${data.customerInfo.paymentUrl}" style="color: #2563eb; display: inline-block; padding: 5px 0; word-break: break-all;">${data.customerInfo.paymentUrl}</a></p>` : ''}
        <p style="margin-top: 20px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">${t.documentAttachedNote}</p>
        <p>Order ID: ${data.orderId}</p>
      </div>
    </div>
    `;
    
    // Verify we have the required environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error(`[${requestId}] Missing EMAIL_USER or EMAIL_PASSWORD environment variables`);
      throw new Error('Missing email configuration environment variables');
    }
    
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@evisa-service.com';
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@evisa-service.com';
    
    console.time(`[${requestId}] sendEmails`);
    
    // Send emails in parallel to improve performance
    await Promise.all([
      // Send admin email
      (async () => {
        try {
          const adminEmailResult = await sendMail({
            from: `"E-Visa Service" <${fromEmail}>`,
            to: adminEmail,
            subject: `${t.adminEmailSubject}${data.customerInfo.name}`,
            html: adminEmailContent,
            attachments: [
              {
                filename: filename,
                content: fileBuffer
              }
            ],
          });
          
          if (!adminEmailResult.success) {
            throw new Error(`Admin email error: ${adminEmailResult.error}`);
          } else {
            console.log(`[${requestId}] Admin email sent successfully`);
          }
        } catch (adminEmailError) {
          throw adminEmailError;
        }
      })(),
      
      // Send customer email
      (async () => {
        try {
          // Send customer email if payment URL exists
          if (data.customerInfo.invoiceId && data.customerInfo.paymentUrl) {
            let customerEmailContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Logo -->
                <div style="background-color: #f0f7ff; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                  <img src="${logoUrl}" alt="E-Visa Service Logo" style="max-height: 70px; margin-bottom: 15px;">
                  <h2 style="color: #2563eb; margin: 0; font-size: 24px;">${t.customerEmailTitle}</h2>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 30px; background-color: #ffffff;">
                  <p style="font-size: 16px; margin-bottom: 25px;">${t.customerEmailGreeting}<strong>${data.customerInfo.name}</strong>,</p>
                  
                  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 25px;">
                    <p style="margin: 0; font-size: 16px;">${t.customerEmailOrderConfirmation}<strong>${data.customerInfo.serviceName}</strong> ${data.language === 'id' ? 'telah berhasil dibuat dan dokumen Anda telah diterima.' : 'has been successfully created and your documents have been received.'}</p>
                  </div>
                  
                  ${data.customerInfo.invoiceId ? `<p style="font-size: 16px; margin-bottom: 20px;"><strong>${t.invoiceIdLabel}</strong> <span style="background-color: #f0f7ff; padding: 3px 8px; border-radius: 4px;">${data.customerInfo.invoiceId}</span></p>` : ''}
                  
                  <p style="font-size: 16px; margin-bottom: 20px;">${t.customerEmailPaymentInstructions}</p>
                  
                  <!-- Payment Button - iOS compatible -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${data.customerInfo.paymentUrl}" style="display: block; background-color: #2563eb; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; text-align: center; margin: 10px auto; width: 80%; max-width: 300px;">${t.customerEmailPaymentButton}</a>
                  </div>
                  
                  <p style="font-size: 15px; color: #64748b; font-style: italic; margin-bottom: 25px;">${t.customerEmailIgnoreIfPaid}</p>
                  
                  <!-- Track Order Button - iOS compatible -->
                  <div style="text-align: center; margin: 30px 0 10px 0;">
                    <a href="${trackUrl}?email=${encodeURIComponent(data.customerInfo.email)}&invoiceId=${encodeURIComponent(data.customerInfo.invoiceId || '')}" style="display: block; background-color: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; text-align: center; margin: 10px auto; width: 80%; max-width: 300px;">${t.trackOrder}</a>
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
            customerEmailContent = renderIOSCompatibleEmail(customerEmailContent);
            
            const customerEmailResult = await sendMail({
              from: `"E-Visa Service" <${fromEmail}>`,
              to: data.customerInfo.email,
              subject: `${t.customerEmailSubject}${data.customerInfo.serviceName} - ${data.language === 'id' ? 'Link Pembayaran' : 'Payment Link'}`,
              html: customerEmailContent
            });
            
            if (!customerEmailResult.success) {
              console.warn(`[${requestId}] Failed to send customer email:`, customerEmailResult.error);
            } else {
              console.log(`[${requestId}] Customer payment email sent successfully`);
            }
          } else {
            // Send confirmation email without payment link
            let confirmationEmailContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Logo -->
                <div style="background-color: #f0f7ff; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                  <img src="${logoUrl}" alt="E-Visa Service Logo" style="max-height: 70px; margin-bottom: 15px;">
                  <h2 style="color: #2563eb; margin: 0; font-size: 24px;">${t.confirmationEmailTitle}</h2>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 30px; background-color: #ffffff;">
                  <p style="font-size: 16px; margin-bottom: 25px;">${t.confirmationEmailGreeting}<strong>${data.customerInfo.name}</strong>,</p>
                  
                  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 25px;">
                    <p style="margin: 0; font-size: 16px;">${t.confirmationEmailThankYou}<strong>${data.customerInfo.serviceName}</strong>.</p>
                  </div>
                  
                  <p style="font-size: 16px; line-height: 1.6;">${t.confirmationEmailProcessing}</p>
                  
                  <!-- Track Order Button - iOS compatible -->
                  <div style="text-align: center; margin: 30px 0 10px 0;">
                    <a href="${trackUrl}?email=${encodeURIComponent(data.customerInfo.email)}&invoiceId=${encodeURIComponent(data.customerInfo.invoiceId || '')}" style="display: block; background-color: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; text-align: center; margin: 10px auto; width: 80%; max-width: 300px;">${t.trackOrder}</a>
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
            confirmationEmailContent = renderIOSCompatibleEmail(confirmationEmailContent);
            
            const confirmationEmailResult = await sendMail({
              from: `"E-Visa Service" <${fromEmail}>`,
              to: data.customerInfo.email,
              subject: `${t.confirmationEmailSubject}${data.customerInfo.serviceName}`,
              html: confirmationEmailContent
            });
            
            if (!confirmationEmailResult.success) {
              console.warn(`[${requestId}] Failed to send confirmation email:`, confirmationEmailResult.error);
            } else {
              console.log(`[${requestId}] Confirmation email sent successfully`);
            }
          }
        } catch (error) {
          // Continue even if customer email fails
          console.warn(`[${requestId}] Error attempting to send customer email:`, error);
        }
      })(),
      
      // Update database in parallel
      (async () => {
        try {
          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ email_sent: true })
            .eq('id', data.orderId);
          
          if (updateError) {
            console.warn(`[${requestId}] Failed to update order status in the database:`, updateError);
          } else {
            console.log(`[${requestId}] Order status updated successfully`);
          }
        } catch (error) {
          console.error(`[${requestId}] Error updating order status:`, error);
        }
      })()
    ]);
    
    console.timeEnd(`[${requestId}] sendEmails`);
    console.log(`[${requestId}] Webhook processing completed successfully`);
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[${requestId}] Process webhook error:`, error.message);
    }
    throw error; // Re-throw the error to be caught by the handler
  }
}

// Main handler now processes synchronously
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = req.headers.get('x-request-id') || `webhook-${Date.now()}`;
  
  // Check environment variables (used for logging purposes only)
  console.log(`[${requestId}] Environment check:`, {
    EMAIL_USER: process.env.EMAIL_USER ? '✓ Set' : '✗ Missing',
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? '✓ Set' : '✗ Missing',
    EMAIL_FROM: process.env.EMAIL_FROM || '✗ Missing (will use EMAIL_USER)',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || '✗ Missing (will use EMAIL_USER)',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '✗ Missing',
    WEBHOOK_SECRET_KEY: process.env.WEBHOOK_SECRET_KEY ? '✓ Set' : '✗ Missing',
  });
  
  // Verify authentication first
  if (!verifyWebhookAuth(req)) {
    console.warn(`[${requestId}] Unauthorized webhook request`);
    return NextResponse.json({ 
      success: false, 
      message: 'Unauthorized webhook request'
    }, { status: 401 });
  }
  
  // Process webhook synchronously
  try {
    await processWebhook(req);
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully'
    }, { status: 200 });
  } catch (error) {
    console.error(`[${requestId}] Webhook processing failed:`, error);
    return NextResponse.json({ 
      success: false, 
      message: 'Webhook processing failed',
      error: String(error)
    }, { status: 500 });
  }
}