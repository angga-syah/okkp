// app/api/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OrderStatus } from '@/lib/order';
import { sendMail } from '@/lib/mail';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/sb_admin';
import crypto from 'crypto';

// Import logo as file path instead of direct import
const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'logo', 'logo_email.png');

// Rate limiting storage (in-memory for Vercel hobby plan)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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

// Security: Input validation and sanitization
function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  // Remove potentially dangerous characters
  return input.replace(/[<>\"'&]/g, '').trim().slice(0, 255);
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function validateOrderId(orderId: string): boolean {
  // Allow only alphanumeric, hyphens, and underscores
  return /^[a-zA-Z0-9_-]{1,50}$/.test(orderId);
}

// Security: Rate limiting function
function checkRateLimit(identifier: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const key = identifier;
  
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// Security: Enhanced signature verification
function verifyXenditSignature(req: NextRequest, body: string): boolean {
  try {
    const xenditSignature = req.headers.get('x-callback-token');
    const XENDIT_WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN;
    
    if (!xenditSignature || !XENDIT_WEBHOOK_TOKEN) {
      return false;
    }
    
    // Use crypto.timingSafeEqual to prevent timing attacks
    const expectedSignature = Buffer.from(XENDIT_WEBHOOK_TOKEN, 'utf8');
    const receivedSignature = Buffer.from(xenditSignature, 'utf8');
    
    if (expectedSignature.length !== receivedSignature.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expectedSignature, receivedSignature);
  } catch (error) {
    console.error('Error verifying Xendit signature:', error);
    return false;
  }
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
  const startTime = Date.now();
  
  try {
    // Security: Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Security: Rate limiting
    if (!checkRateLimit(clientIP, 50, 60000)) { // 50 requests per minute per IP
      return NextResponse.json({ message: 'Rate limit exceeded' }, { status: 429 });
    }
    
    // Security: Request size validation (prevent document bomb)
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
      return NextResponse.json({ message: 'Request too large' }, { status: 413 });
    }
    
    // Security: Timeout protection (prevent slowloris attacks)
    const timeout = setTimeout(() => {
      throw new Error('Request timeout');
    }, 30000); // 30 seconds timeout
    
    // Capture the raw body first for logging
    const text = await req.text();
    clearTimeout(timeout);
    
    // Security: Additional size check after reading
    if (text.length > 1024 * 1024) { // 1MB limit
      return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    // Security: Verify webhook signature
    const isValidSignature = verifyXenditSignature(req, text);
    if (!isValidSignature) {
      console.warn('Invalid webhook signature from IP:', clientIP);
      
      // Reject invalid signatures in production
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      
      // In development, log the issue but continue processing
      console.warn('Invalid webhook signature, but continuing for development environment');
    }

    // Security: Validate payload structure
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ message: 'Invalid payload structure' }, { status: 400 });
    }

    // Handle different formats of Xendit webhooks
    if (payload.id && payload.status) {
      if (payload.status === "PAID") {
        await handleInvoicePaid(payload);
      } else if (payload.status === "EXPIRED") {
        await handleInvoiceExpired(payload);
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
          console.log(`Unhandled webhook event: ${payload.event || 'unknown'}`);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`Webhook processed in ${processingTime}ms`);
    
    // Return success to Xendit
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Security: Don't expose internal error details
    const isProduction = process.env.NODE_ENV === 'production';
    const errorMessage = isProduction ? 'Internal server error' : String(error);
    
    return NextResponse.json(
      { message: errorMessage }, 
      { status: 500 }
    );
  }
}

// Enhanced handleInvoicePaid with payment success email and security improvements
async function handleInvoicePaid(payload: WebhookPayload) {
  try {
    // Security: Input validation and sanitization
    const invoice_id = sanitizeString(payload.id || payload.invoice_id);
    if (!invoice_id) {
      throw new Error('Invalid invoice ID');
    }

    // Check if this is the standard invoice format
    const isStandardFormat = payload.status === "PAID";
    
    // Extract payment details with proper validation
    const paid_amount = (isStandardFormat ? payload.paid_amount : (payload.paid_amount || payload.amount)) ?? 0;
    const payment_method = sanitizeString(payload.payment_method) || "UNKNOWN";
    const payment_channel = sanitizeString(payload.payment_channel) || "UNKNOWN";
    
    // Handle the date with proper validation
    const paid_at_raw = sanitizeString(payload.paid_at) || new Date().toISOString();
    let paid_at: string;
    try {
      paid_at = new Date(paid_at_raw).toISOString();
    } catch {
      paid_at = new Date().toISOString();
    }
    
    // Get metadata or external_id to find the order
    const metadata = payload.metadata || {};
    const external_id = sanitizeString(payload.external_id);
  
    // Extract the order ID with validation
    let orderId = sanitizeString(metadata?.order_id) || '';
    
    if (!orderId && external_id && external_id.startsWith('order-')) {
      const orderIdMatch = external_id.match(/order-([a-zA-Z0-9_-]+)/);
      if (orderIdMatch && orderIdMatch[1] && validateOrderId(orderIdMatch[1])) {
        orderId = orderIdMatch[1];
      }
    }
    
    // If external_id format is INV-numbertimestamp, try to extract order from database
    if (!orderId && external_id && external_id.startsWith('INV-')) {
      // Security: Use parameterized query to prevent SQL injection
      const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('invoice_id', external_id)
        .limit(1);
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      if (orders && orders.length > 0 && validateOrderId(orders[0].id)) {
        orderId = orders[0].id;
      }
    }
    
    if (!orderId) {
      // Security: Use parameterized query
      const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select('id, name, email, service_name, language')
        .eq('invoice_id', invoice_id)
        .limit(1);
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      if (!orders || orders.length === 0) {
        console.log('No order found for invoice:', invoice_id);
        return;
      }
      
      const order = orders[0];
      if (!validateOrderId(order.id) || !validateEmail(order.email)) {
        console.error('Invalid order data:', order.id, order.email);
        return;
      }
      
      orderId = order.id;
      
      // Send payment confirmation email with sanitized data
      await sendPaymentSuccessEmail({
        customerName: sanitizeString(order.name),
        customerEmail: order.email,
        serviceName: sanitizeString(order.service_name),
        invoiceId: invoice_id,
        paidAmount: paid_amount,
        paymentMethod: `${payment_method}${payment_channel !== "UNKNOWN" ? ` (${payment_channel})` : ''}`,
        paidAt: new Date(paid_at).toLocaleString(),
        orderId: orderId,
        language: sanitizeString(order.language) || 'en'
      });
    } else {
      // We have orderId but need to get customer details
      const { data: orderDetails, error } = await supabaseAdmin
        .from('orders')
        .select('name, email, service_name, language')
        .eq('id', orderId)
        .single();
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      if (orderDetails && validateEmail(orderDetails.email)) {
        await sendPaymentSuccessEmail({
          customerName: sanitizeString(orderDetails.name),
          customerEmail: orderDetails.email,
          serviceName: sanitizeString(orderDetails.service_name),
          invoiceId: invoice_id,
          paidAmount: paid_amount,
          paymentMethod: `${payment_method}${payment_channel !== "UNKNOWN" ? ` (${payment_channel})` : ''}`,
          paidAt: new Date(paid_at).toLocaleString(),
          orderId: orderId,
          language: sanitizeString(orderDetails.language) || 'en'
        });
      }
    }
    
    // Security: Validate orderId before database update
    if (!validateOrderId(orderId)) {
      throw new Error('Invalid order ID for update');
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
      console.error('Database update error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error in handleInvoicePaid:', error);
    throw error;
  }
}

// Function to send payment success email with enhanced security
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
    // Security: Input validation
    if (!validateEmail(customerEmail)) {
      console.error('Invalid email address:', customerEmail);
      return false;
    }
    
    if (!validateOrderId(orderId)) {
      console.error('Invalid order ID:', orderId);
      return false;
    }

    // Check if required environment variables are set for email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email configuration missing. Payment success email not sent.');
      return false;
    }

    // Security: Rate limiting for email sending (prevent mail bomb)
    const emailKey = `email_${customerEmail}_${Date.now().toString().slice(0, -4)}`; // 10-second window
    if (!checkRateLimit(emailKey, 1, 10000)) { // 1 email per 10 seconds per customer
      console.warn('Email rate limit exceeded for:', customerEmail);
      return false;
    }

    // Get translations for specified language or default to English
    const allowedLanguages = ['en', 'id'];
    const safeLanguage = allowedLanguages.includes(language) ? language : 'en';
    const t = translations[safeLanguage];

    // Security: Sanitize all user inputs for email content
    const safeName = sanitizeString(customerName);
    const safeServiceName = sanitizeString(serviceName);
    const safeInvoiceId = sanitizeString(invoiceId);
    const safePaymentMethod = sanitizeString(paymentMethod);
    const safePaidAt = sanitizeString(paidAt);

    // Format the amount with currency symbol if it's a number
    let formattedAmount: string;
    try {
      formattedAmount = typeof paidAmount === 'number' 
        ? new Intl.NumberFormat(safeLanguage === 'id' ? 'id-ID' : 'en-US', { 
            style: 'currency', 
            currency: 'IDR',
            minimumFractionDigits: 0 
          }).format(paidAmount)
        : sanitizeString(String(paidAmount));
    } catch {
      formattedAmount = String(paidAmount);
    }

    // Base URL for tracking link with proper encoding
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
    } catch (error) {
      console.warn('Logo file not accessible:', error);
    }

    // Prepare email attachments (logo only)
    const attachments: MailAttachment[] = [];
    if (logoAttachment) {
      attachments.push(logoAttachment);
    }

    // Get configured email addresses
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@evisa-service.com';

    // Create email content for payment success with sanitized data
    const paymentSuccessEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header with Logo -->
        <div style="background-color: #f0f7ff; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
          ${logoAttachment ? `<img src="cid:company-logo" alt="E-Visa Service Logo" style="max-height: 70px; margin-bottom: 15px;">` : ''}
          <h2 style="color: #2563eb; margin: 0; font-size: 24px;">${t.paymentSuccessEmailTitle}</h2>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; margin-bottom: 25px;">${t.paymentSuccessGreeting}<strong>${safeName}</strong>,</p>
          
          <!-- Success Message with Icon -->
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 25px;">
            <div style="display: flex; align-items: center;">
              <div style="background-color: #10b981; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="color: white; font-weight: bold;">✓</span>
              </div>
              <p style="margin: 0; font-size: 16px;">${t.paymentSuccessThankYou}<strong>${safeServiceName}</strong> ${safeLanguage === 'id' ? 'telah berhasil diterima.' : 'has been successfully received.'}</p>
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
                <td style="padding: 8px 0; text-align: right;">${safePaymentMethod}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">${t.paymentSuccessTime}</td>
                <td style="padding: 8px 0; text-align: right;">${safePaidAt}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Invoice ID:</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; background-color: #f0f7ff; border-radius: 4px; display: inline-block; float: right; padding: 2px 6px;">${safeInvoiceId}</td>
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
            <a href="${baseUrl}?email=${encodeURIComponent(customerEmail)}&invoiceId=${encodeURIComponent(safeInvoiceId)}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; transition: background-color 0.3s ease;">${t.trackOrder}</a>
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
      subject: `${t.paymentSuccessEmailSubject}${safeServiceName}`,
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

// Handle expired invoice events with security improvements
async function handleInvoiceExpired(payload: WebhookPayload) {
  try {
    // Security: Input validation
    const invoice_id = sanitizeString(payload.id || payload.invoice_id);
    if (!invoice_id) {
      console.error('Missing or invalid invoice ID in expired webhook payload');
      return;
    }
    
    const external_id = sanitizeString(payload.external_id);
    console.log(`Processing expired invoice: ${invoice_id}, external_id: ${external_id}`);
    
    let orderId = "";
    let orderFound = false;
    
    // Approach 1: Check if order exists with invoice_id exactly matching the Xendit invoice id
    const { data: exactOrders, error: exactError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('invoice_id', invoice_id)
      .limit(1);
    
    if (exactError) {
      console.error('Error looking up order by exact invoice_id:', exactError);
      throw exactError;
    }
    
    if (exactOrders && exactOrders.length > 0 && validateOrderId(exactOrders[0].id)) {
      orderFound = true;
      orderId = exactOrders[0].id;
      console.log(`Found order ${orderId} with exact invoice_id match`);
    }
    
    // Approach 2: If external_id is in INV-number format, try that as invoice_id
    if (!orderFound && external_id && external_id.startsWith('INV-')) {
      const { data: extIdOrders, error: extIdError } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('invoice_id', external_id)
        .limit(1);
      
      if (extIdError) {
        console.error('Error looking up order by external_id as invoice_id:', extIdError);
        throw extIdError;
      }
      
      if (extIdOrders && extIdOrders.length > 0 && validateOrderId(extIdOrders[0].id)) {
        orderFound = true;
        orderId = extIdOrders[0].id;
        console.log(`Found order ${orderId} with external_id as invoice_id match`);
      }
    }
    
    if (!orderFound || !orderId || !validateOrderId(orderId)) {
      console.log('Could not find valid matching order for expired invoice, skipping update');
      return;
    }
    
    console.log(`Updating order ${orderId} to payment_expired status`);
    
    // Update order to show payment expired
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'payment_expired' as OrderStatus,
        updated_at: new Date().toISOString(),
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