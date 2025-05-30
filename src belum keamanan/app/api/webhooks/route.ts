// app/api/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OrderStatus } from '@/lib/order';
import { sendMail } from '@/lib/mail';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/sb_admin';

// Import logo as file path instead of direct import
const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'logo', 'logo_email.png');

// Define nodemailer attachment type
interface MailAttachment {
  filename: string;
  path: string;
  cid?: string;
}

// Email translation content
interface EmailTranslations {
  paymentSuccessEmailSubject: string;
  paymentSuccessEmailTitle: string;
  paymentSuccessGreeting: string;
  paymentSuccessThankYou: string;
  paymentSuccessDetails: string;
  paymentSuccessAmount: string;
  paymentSuccessMethod: string;
  paymentSuccessTime: string;
  whatHappensNext: string;
  processingSteps: string;
  trackOrder: string;
  customerEmailSupport: string;
  customerEmailFooter: string;
}

// Define translations for payment success email
const translations: Record<string, EmailTranslations> = {
  en: {
    paymentSuccessEmailSubject: "Payment Successful for ",
    paymentSuccessEmailTitle: "Thank You for Your Payment",
    paymentSuccessGreeting: "Hello ",
    paymentSuccessThankYou: "Your payment for ",
    paymentSuccessDetails: "Payment Details:",
    paymentSuccessAmount: "Amount Paid:",
    paymentSuccessMethod: "Payment Method:",
    paymentSuccessTime: "Payment Date:",
    whatHappensNext: "What happens next?",
    processingSteps: "Our team will now verify your documents and process your e-visa application. You will receive updates as your application progresses.",
    trackOrder: "Track Order",
    customerEmailSupport: "If you have any questions, please contact our support team via email or WhatsApp listed on our website.",
    customerEmailFooter: "This message was sent automatically, please do not reply to this email."
  },
  id: {
    paymentSuccessEmailSubject: "Pembayaran Berhasil untuk ",
    paymentSuccessEmailTitle: "Terima Kasih atas Pembayaran Anda",
    paymentSuccessGreeting: "Halo ",
    paymentSuccessThankYou: "Pembayaran Anda untuk ",
    paymentSuccessDetails: "Detail Pembayaran:",
    paymentSuccessAmount: "Jumlah Dibayar:",
    paymentSuccessMethod: "Metode Pembayaran:",
    paymentSuccessTime: "Tanggal Pembayaran:",
    whatHappensNext: "Apa langkah selanjutnya?",
    processingSteps: "Tim kami akan memverifikasi dokumen Anda dan memproses aplikasi e-visa Anda. Anda akan menerima pembaruan seiring dengan kemajuan aplikasi Anda.",
    trackOrder: "Lacak Pesanan",
    customerEmailSupport: "Jika Anda memiliki pertanyaan, silakan hubungi tim dukungan kami melalui email atau WhatsApp yang tercantum di website.",
    customerEmailFooter: "Pesan ini dikirim secara otomatis, mohon jangan membalas email ini."
  }
};

// Define webhook payload interface to replace 'any'
interface WebhookPayload {
  id?: string;
  status?: string;
  event?: string;
  paid_amount?: number | string;
  payment_method?: string;
  payment_channel?: string;
  paid_at?: string;
  metadata?: {
    order_id?: string;
    [key: string]: unknown;
  };
  external_id?: string;
  invoice_id?: string;
  amount?: number | string;
  [key: string]: unknown;
}

// Add OPTIONS handler for CORS support
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-callback-token'
    }
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
 
  try {
    // Capture the raw body first for logging
    const text = await req.text();

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(text);
    } catch (_) {
      return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    // Verify webhook signature for security
    const isValidSignature = verifyXenditSignature(req);
    if (!isValidSignature) {
      req.headers.forEach(() => {
        // Just enumerate headers without using parameters
      });
      
      // Reject invalid signatures in production
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
      }
      
      // In development, log the issue but continue processing
      console.warn('Invalid webhook signature, but continuing for development environment');
    }

    // Handle different formats of Xendit webhooks
    if (payload.id && payload.status) {
      if (payload.status === "PAID") {
        await handleInvoicePaid(payload);
      } else if (payload.status === "EXPIRED") {
        await handleInvoiceExpired(payload);
      } else {
        // No additional action needed for other statuses
      }
    } else {
      // Fallback to checking event property for newer webhook format
      switch (payload.event) {
        case 'invoice.paid':
          await handleInvoicePaid(payload);
          break;
        case 'invoice.expired':
          await handleInvoiceExpired(payload);
          break;
        default:
          // No action for other events
          console.log(`Unhandled webhook event: ${payload.event || 'unknown'}`);
      }
    }

    // Return success to Xendit
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// Function to verify Xendit webhook signature
function verifyXenditSignature(req: NextRequest): boolean {
  try {
    // Get the Xendit signature from headers
    const xenditSignature = req.headers.get('x-callback-token');
    
    // Your webhook verification token from Xendit dashboard 
    const XENDIT_WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN;
    
    // Headers inspection logic (removed the unused parameters)
    req.headers.forEach(() => {
      // Just enumerate headers without using parameters
    });
    
    if (!xenditSignature || !XENDIT_WEBHOOK_TOKEN) {
      return false;
    }
    
    // Compare the signature with your token
    const isValid = xenditSignature === XENDIT_WEBHOOK_TOKEN;
    return isValid;
  } catch (error) {
    console.error('Error verifying Xendit signature:', error);
    return false;
  }
}

// Enhanced handleInvoicePaid with payment success email
async function handleInvoicePaid(payload: WebhookPayload) {
  try {
    // Check if this is the standard invoice format
    const isStandardFormat = payload.status === "PAID";
    
    // Extract the invoice ID with nullish coalescing to ensure a string value
    const invoice_id = (isStandardFormat ? payload.id : payload.id || payload.invoice_id) ?? "";
    
    // Extract payment details with proper fallbacks
    const paid_amount = (isStandardFormat ? payload.paid_amount : (payload.paid_amount || payload.amount)) ?? 0;
    const payment_method = (isStandardFormat ? payload.payment_method : (payload.payment_method || "UNKNOWN")) ?? "UNKNOWN";
    const payment_channel = (isStandardFormat ? payload.payment_channel : (payload.payment_channel || "UNKNOWN")) ?? "UNKNOWN";
    
    // Handle the date with proper null check before passing to Date constructor
    const paid_at_raw = (isStandardFormat ? payload.paid_at : payload.paid_at) ?? new Date().toISOString();
    const paid_at = paid_at_raw ? new Date(paid_at_raw).toISOString() : new Date().toISOString();
    
    // Get metadata or external_id to find the order
    const metadata = payload.metadata || {};
    const external_id = payload.external_id || "";
  
    // Extract the order ID from metadata, external_id, or lookup by invoice_id
    let orderId = metadata?.order_id ?? "";
    
    if (!orderId && external_id && external_id.startsWith('order-')) {
      // Try to extract order ID from external_id if it follows a pattern like 'order-123'
      const orderIdMatch = external_id.match(/order-([a-zA-Z0-9-_]+)/);
      if (orderIdMatch && orderIdMatch[1]) {
        orderId = orderIdMatch[1];
      }
    }
    
    // If external_id format is INV-numbertimestamp, try to extract order from database
    if (!orderId && external_id && external_id.startsWith('INV-')) {
      // Don't use single() which throws error if no records found
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('invoice_id', external_id);
      
      if (orders && orders.length > 0) {
        orderId = orders[0].id;
      } else {
        orderId = ""; // Ensure orderId is a string, not undefined
      }
    }
    
    if (!orderId) {
      // Don't use single() which throws error if no records found
      const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select('id, name, email, service_name, language')
        .eq('invoice_id', invoice_id);
      
      if (error) {
        throw error;
      }
      
      if (!orders || orders.length === 0) {
        return;
      }
      
      orderId = orders[0].id;
      
      // Send payment confirmation email to customer with guaranteed non-nullable values
      await sendPaymentSuccessEmail({
        customerName: orders[0].name,
        customerEmail: orders[0].email,
        serviceName: orders[0].service_name,
        invoiceId: invoice_id,
        paidAmount: paid_amount,
        paymentMethod: `${payment_method}${payment_channel !== "UNKNOWN" ? ` (${payment_channel})` : ''}`,
        paidAt: new Date(paid_at).toLocaleString(),
        orderId: orderId,
        language: orders[0].language || 'en' // Use language from order or default to English
      });
    } else {
      // We have orderId but need to get customer details
      const { data: orderDetails } = await supabaseAdmin
        .from('orders')
        .select('name, email, service_name, language')
        .eq('id', orderId)
        .single();
      
      if (orderDetails) {
        // Send payment confirmation email to customer
        await sendPaymentSuccessEmail({
          customerName: orderDetails.name,
          customerEmail: orderDetails.email,
          serviceName: orderDetails.service_name,
          invoiceId: invoice_id,
          paidAmount: paid_amount,
          paymentMethod: `${payment_method}${payment_channel !== "UNKNOWN" ? ` (${payment_channel})` : ''}`,
          paidAt: new Date(paid_at).toLocaleString(),
          orderId: orderId,
          language: orderDetails.language || 'en' // Use language from order or default to English
        });
      }
    }
    
    // Update order status to document_verification directly after payment
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'document_verification' as OrderStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) {
      throw error;
    }

  } catch (error) {
    throw error;
  }
}

// Function to send payment success email with Nodemailer
async function sendPaymentSuccessEmail({
  customerName,
  customerEmail,
  serviceName,
  invoiceId,
  paidAmount,
  paymentMethod,
  paidAt,
  orderId,
  language = 'en'
}: {
  customerName: string,
  customerEmail: string,
  serviceName: string,
  invoiceId: string,
  paidAmount: string | number,
  paymentMethod: string,
  paidAt: string,
  orderId: string,
  language?: string
}) {
  try {
    // Check if required environment variables are set for email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email configuration missing. Payment success email not sent.');
      return false;
    }

    // Get translations for specified language or default to English
    const t = translations[language] || translations.en;

    // Format the amount with currency symbol if it's a number
    const formattedAmount = typeof paidAmount === 'number' 
      ? new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', { 
          style: 'currency', 
          currency: 'IDR',
          minimumFractionDigits: 0 
        }).format(paidAmount)
      : paidAmount;

    // Base URL for tracking link
    const baseUrl = process.env.NEXT_PUBLIC_TRACK_URL || 'https://demo.fortunasadanioga.com/track';
    
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

    // Get configured email addresses
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@evisa-service.com';

    // Create email content for payment success with beautiful design
    const paymentSuccessEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header with Logo -->
        <div style="background-color: #f0f7ff; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
          ${logoAttachment ? `<img src="cid:company-logo" alt="E-Visa Service Logo" style="max-height: 70px; margin-bottom: 15px;">` : ''}
          <h2 style="color: #2563eb; margin: 0; font-size: 24px;">${t.paymentSuccessEmailTitle}</h2>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; margin-bottom: 25px;">${t.paymentSuccessGreeting}<strong>${customerName}</strong>,</p>
          
          <!-- Success Message with Icon -->
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 25px;">
            <div style="display: flex; align-items: center;">
              <div style="background-color: #10b981; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="color: white; font-weight: bold;">✓</span>
              </div>
              <p style="margin: 0; font-size: 16px;">${t.paymentSuccessThankYou}<strong>${serviceName}</strong> ${language === 'id' ? 'telah berhasil diterima.' : 'has been successfully received.'}</p>
            </div>
          </div>
          
          <!-- Payment Details Box -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
            <h3 style="margin-top: 0; color: #334155; font-size: 18px;">${t.paymentSuccessDetails}</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">${t.paymentSuccessAmount}</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">${t.paymentSuccessMethod}</td>
                <td style="padding: 8px 0; text-align: right;">${paymentMethod}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">${t.paymentSuccessTime}</td>
                <td style="padding: 8px 0; text-align: right;">${paidAt}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Invoice ID:</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; background-color: #f0f7ff; border-radius: 4px; display: inline-block; float: right; padding: 2px 6px;">${invoiceId}</td>
              </tr>
            </table>
          </div>
          
          <!-- What Happens Next Section -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #334155; font-size: 18px;">${t.whatHappensNext}</h3>
            <p style="color: #334155; line-height: 1.6;">${t.processingSteps}</p>
          </div>
          
          <!-- Track Order Button -->
          <div style="text-align: center; margin: 30px 0 10px 0;">
            <a href="${baseUrl}?email=${encodeURIComponent(customerEmail)}&invoiceId=${encodeURIComponent(invoiceId)}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; transition: background-color 0.3s ease;">${t.trackOrder}</a>
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

    // Send payment success email to customer
    const info = await sendMail({
      from: `"E-Visa Service" <${fromEmail}>`,
      to: customerEmail,
      subject: `${t.paymentSuccessEmailSubject}${serviceName}`,
      html: paymentSuccessEmailContent,
      attachments: attachments
    });
    
    console.log('Payment success email sent to customer:', info.messageId);
    return true;
  } catch (emailError) {
    console.error('Error sending payment success email:', emailError);
    return false;
  }
}

// Handle expired invoice events - enhanced to catch both webhook formats and fix invoice lookup issues
async function handleInvoiceExpired(payload: WebhookPayload) {
  try {
    // Log the received expired payload for debugging
    console.log('Processing expired invoice webhook:', JSON.stringify(payload, null, 2));
    
    // Handle both webhook formats (older status-based and newer event-based)
    const isStandardFormat = payload.status === "EXPIRED";
    
    // Extract the invoice ID with nullish coalescing
    const invoice_id = (isStandardFormat ? payload.id : payload.id || payload.invoice_id) ?? "";
    
    if (!invoice_id) {
      console.error('Missing invoice ID in expired webhook payload');
      return;
    }
    
    // Get external_id which often contains the INV-number format
    const external_id = payload.external_id || "";
    console.log(`Processing expired invoice: ${invoice_id}, external_id: ${external_id}`);
    
    // IMPORTANT: Try multiple approaches to find the order
    let orderId = "";
    let orderFound = false;
    
    // Approach 1: Check if order exists with invoice_id exactly matching the Xendit invoice id
    console.log(`Approach 1: Looking up order by invoice_id exact match: ${invoice_id}`);
    const { data: exactOrders, error: exactError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('invoice_id', invoice_id);
    
    if (exactError) {
      console.error('Error looking up order by exact invoice_id:', exactError);
    } else if (exactOrders && exactOrders.length > 0) {
      orderFound = true;
      orderId = exactOrders[0].id;
      console.log(`Found order ${orderId} with exact invoice_id match`);
    }
    
    // Approach 2: If external_id is in INV-number format, try that as invoice_id
    if (!orderFound && external_id && external_id.startsWith('INV-')) {
      console.log(`Approach 2: Looking up order by external_id as invoice_id: ${external_id}`);
      const { data: extIdOrders, error: extIdError } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('invoice_id', external_id);
      
      if (extIdError) {
        console.error('Error looking up order by external_id as invoice_id:', extIdError);
      } else if (extIdOrders && extIdOrders.length > 0) {
        orderFound = true;
        orderId = extIdOrders[0].id;
        console.log(`Found order ${orderId} with external_id as invoice_id match`);
      }
    }
    
    // Approach 3: Try checking for partial invoice_id match (substring search)
    if (!orderFound) {
      console.log(`Approach 3: Looking up orders with invoice_id containing: ${invoice_id.substring(0, 10)}`);
      const { data: partialOrders, error: partialError } = await supabaseAdmin
        .from('orders')
        .select('id, status, invoice_id')
        .ilike('invoice_id', `%${invoice_id.substring(0, 10)}%`)
        .limit(5);
      
      if (partialError) {
        console.error('Error looking up order by partial invoice_id:', partialError);
      } else if (partialOrders && partialOrders.length > 0) {
        // Log all potential matches for debugging
        console.log(`Found ${partialOrders.length} potential partial matches:`, 
          partialOrders.map(o => ({ id: o.id, invoice_id: o.invoice_id })));
        
        // Use the first match
        orderFound = true;
        orderId = partialOrders[0].id;
        console.log(`Using first partial match order ${orderId} with invoice_id ${partialOrders[0].invoice_id}`);
      }
    }
    
    // Add one more approach for handling older format
    if (!orderFound && external_id) {
      // Sometimes orders just store the external_id directly 
      console.log(`Approach 4: Looking up orders where any field contains external_id: ${external_id}`);
      
      // Try to extract any potential order reference from the external_id
      let potentialOrderId = "";
      if (external_id.includes("order-")) {
        const orderMatch = external_id.match(/order-([a-zA-Z0-9-_]+)/);
        if (orderMatch && orderMatch[1]) {
          potentialOrderId = orderMatch[1];
          console.log(`Extracted potential order ID: ${potentialOrderId} from external_id`);
          
          // Try direct lookup by ID
          const { data: directOrders, error: directError } = await supabaseAdmin
            .from('orders')
            .select('id, status')
            .eq('id', potentialOrderId);
          
          if (directError) {
            console.error('Error looking up by extracted order ID:', directError);
          } else if (directOrders && directOrders.length > 0) {
            orderFound = true;
            orderId = directOrders[0].id;
            console.log(`Found order directly by ID: ${orderId}`);
          }
        }
      }
    }
    
    // Approach 5: Last resort - check recent pending orders
    if (!orderFound) {
      console.log('Approach 5: Looking up recent pending orders as last resort');
      
      // Calculate time 24 hours ago
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      const { data: recentOrders, error: recentError } = await supabaseAdmin
        .from('orders')
        .select('id, status, created_at, invoice_id')
        .in('status', ['pending_payment', 'pending'])
        .gt('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recentError) {
        console.error('Error looking up recent orders:', recentError);
      } else if (recentOrders && recentOrders.length > 0) {
        console.log(`Found ${recentOrders.length} recent pending orders to check:`, 
          recentOrders.map(o => ({ id: o.id, invoice_id: o.invoice_id, created_at: o.created_at })));
        
        // Use the most recent pending order
        orderFound = true;
        orderId = recentOrders[0].id;
        console.log(`Using most recent pending order ${orderId} with invoice_id ${recentOrders[0].invoice_id}`);
      }
    }
    
    if (!orderFound || !orderId) {
      console.log('Could not find any matching order for expired invoice, skipping update');
      return;
    }
    
    console.log(`Updating order ${orderId} to payment_expired status`);
    
    // Update order to show payment expired - use the OrderStatus type for type safety
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'payment_expired' as OrderStatus,
        updated_at: new Date().toISOString(),
        // Add the invoice_id if it was updated to ensure future lookups work
        invoice_id: invoice_id 
      })
      .eq('id', orderId);
    
    if (error) {
      console.error(`Error updating order ${orderId} to payment_expired:`, error);
      throw error;
    }
    
    console.log(`Successfully updated order ${orderId} to payment_expired status`);
  } catch (error) {
    console.error('Error in handleInvoiceExpired:', error);
    throw error;
  }
}