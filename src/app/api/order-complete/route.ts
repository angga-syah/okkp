// app/api/order-complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Invoice as InvoiceClient } from "xendit-node";
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import { sendMail } from '@/lib/mail';
import { getEmailTranslations } from '@/lib/translations';
import { supabaseAdmin, storeCustomerData } from '@/lib/sb';

// Define more specific error types
type ErrorType = Error | string | unknown;

// Define the proper return types
type WebhookResult = {
  success: boolean;
  error: ErrorType | null;
};

type EmailResult = {
  success: boolean;
  error: ErrorType | null;
  messageId?: string;
};

// Define our custom file interface
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
  amount: string;
  invoiceId?: string;
  paymentUrl?: string;
  sendPaymentLinkByEmail?: string;
  language?: string;
}

interface FormFiles {
  allRequirements: CustomFile | CustomFile[];
}

// Web File interface
interface WebFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

// Memoized form data parser
const parseFormDataMemoized = (() => {
  const cache = new Map();
  
  return async function parseFormData(req: Request): Promise<{ fields: FormFields; files: FormFiles }> {
    // Create a simple cache key based on content length
    const cacheKey = req.headers.get('content-length');
    if (cacheKey && cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    
    const formData = await req.formData();
    const fields: Partial<FormFields> = {};
    const files: Partial<FormFiles> = {};
    
    // Create temp directory in a more efficient way
    const tempDir = join(os.tmpdir(), 'evisa-uploads', uuidv4());
    await mkdir(tempDir, { recursive: true });
    
    // Use Array.from to avoid iterator issues
    const entries = Array.from(formData.entries());
    
    // Process all entries in a single loop for efficiency
    await Promise.all(entries.map(async ([key, value]) => {
      if (value instanceof File) {
        if (key === 'allRequirements') {
          const webFile = value as WebFile;
          
          // Validate file type
          const validMimeTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/zip',
            'application/x-zip-compressed'
          ];
          
          if (!validMimeTypes.includes(webFile.type)) {
            throw new Error(`Invalid file type: ${webFile.type}`);
          }
          
          // Validate file size (10MB max)
          const maxFileSize = 10 * 1024 * 1024; // 10MB
          if (webFile.size > maxFileSize) {
            throw new Error(`File too large: ${webFile.size} bytes. Maximum allowed: ${maxFileSize} bytes`);
          }
          
          // Create a temporary file path
          const filePath = join(tempDir, webFile.name);
          const buffer = Buffer.from(await webFile.arrayBuffer());
          await writeFile(filePath, buffer);
          
          // Create custom File object
          const customFile: CustomFile = {
            filepath: filePath,
            originalFilename: webFile.name,
            newFilename: webFile.name,
            mimetype: webFile.type,
            size: webFile.size
          };
          
          files.allRequirements = customFile;
        }
      } else if (isFieldKey(key)) {
        fields[key] = value as string;
      }
    }));
    
    const result = { 
      fields: fields as FormFields,
      files: files as FormFiles
    };
    
    // Cache the result
    if (cacheKey) {
      cache.set(cacheKey, result);
      
      // Clear cache after 30 seconds to prevent memory issues
      setTimeout(() => cache.delete(cacheKey), 30000);
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
    'amount',
    'invoiceId',
    'paymentUrl',
    'sendPaymentLinkByEmail',
    'language'
  ].includes(key);
}

// Function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegex.test(email.trim());
}

// Function to validate customer name
function isValidName(name: string): boolean {
  if (!name || name.trim().length < 2) return false;
  
  // Allow letters, spaces, hyphens, apostrophes, and common Unicode characters for international names
  const nameRegex = /^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF'-]+$/;
  return nameRegex.test(name.trim()) && name.trim().length <= 100;
}

// Function to validate a service against the database
async function validateService(
  serviceId: string, 
  serviceName: string, 
  requestedAmount: number
): Promise<{valid: boolean; message: string; expectedPrice?: number}> {
  try {
    // Try to get service details from database
    const { data: dbService, error } = await supabaseAdmin
      .from('services')
      .select('id, name, price')
      .eq('id', serviceId)
      .single();
    
    // If database query succeeds, use that data
    if (dbService && !error) {
      // Validate price
      if (requestedAmount !== dbService.price) {
        return {
          valid: false,
          message: 'Invalid price',
          expectedPrice: dbService.price
        };
      }

      // All validations passed
      return {
        valid: true,
        message: 'Service validated successfully',
        expectedPrice: dbService.price
      };
    } 
    
    // Fall back to static data
    console.warn('Database service lookup failed, using static validation');
    
    // Define static services
    const staticServices: Record<string, {name: string; price: number}> = {
      '1': { name: 'E-Visa Business Single Entry', price: 5000000 },
      '2': { name: 'E-Visa Business Multiple Entry', price: 7000000 }
    };
    
    const staticService = staticServices[serviceId];
    if (!staticService) {
      return {
        valid: false,
        message: 'Invalid service'
      };
    }
    
    // Validate price
    if (requestedAmount !== staticService.price) {
      return {
        valid: false,
        message: 'Invalid price',
        expectedPrice: staticService.price
      };
    }
    
    // All validations passed
    return {
      valid: true,
      message: 'Service validated successfully',
      expectedPrice: staticService.price
    };
  } catch (e) {
    console.error('Error validating service:', e);
    return {
      valid: false,
      message: 'Error validating service'
    };
  }
}

// Log security events to the database
async function logSecurityEvent(event: {
  event_type: string;
  path: string;
  ip_address: string;
  user_agent: string;
  message?: string;
}): Promise<void> {
  try {
    await supabaseAdmin
      .from('security_logs')
      .insert({
        ...event,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// More efficient webhook trigger function
async function triggerEmailWebhook(
  orderId: string,
  documentPath: string,
  customerInfo: {
    name: string;
    email: string;
    serviceName: string;
    invoiceId?: string;
    paymentUrl?: string;
  },
  language: string
): Promise<WebhookResult> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const secretKey = process.env.WEBHOOK_SECRET_KEY || '';
  
  if (!baseUrl) {
    console.error('Missing NEXT_PUBLIC_BASE_URL environment variable.');
    return { success: false, error: 'Missing NEXT_PUBLIC_BASE_URL' };
  }
  
  if (!secretKey) {
    return { success: false, error: 'Missing WEBHOOK_SECRET_KEY' };
  }
  
  const webhookUrl = `${baseUrl}/api/send-email-webhook`;
  
  const payload = {
    orderId,
    documentPath,
    customerInfo,
    language
  };
  
  try {
    // Use AbortController to add timeout for webhook requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': secretKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      await response.json();
      return { success: true, error: null }; 
    } else {
      const errorText = await response.text();
      console.error(`Webhook returned error status ${response.status}:`, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
  } catch (err) {
    // Handle AbortController timeout
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { success: false, error: 'Webhook request timed out' };
    }
    return { success: false, error: err };
  }
}

// Optimized direct email function
async function sendDirectEmail(
  customerInfo: {
    name: string;
    email: string;
    serviceName: string;
    invoiceId?: string;
    paymentUrl?: string;
  },
  language: string
): Promise<EmailResult> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Missing EMAIL_USER or EMAIL_PASSWORD, cannot send fallback email');
      return { success: false, error: 'Missing email configuration' };
    }

    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@evisa-service.com';
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@evisa-service.com';
    const t = getEmailTranslations(language);
    
    // iOS-compatible email template
    const result = await sendMail({
      from: `"E-Visa Service" <${fromEmail}>`,
      to: adminEmail,
      subject: `${t.adminEmailSubject}${customerInfo.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f0f7ff; padding: 20px; text-align: center;">
            <h2 style="color: #2563eb; margin: 0;">FALLBACK EMAIL - ${t.adminEmailTitle}</h2>
          </div>
          
          <div style="padding: 20px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none;">
            <p><strong>${t.nameLabel}</strong> ${customerInfo.name}</p>
            <p><strong>${t.emailLabel}</strong> ${customerInfo.email}</p>
            <p><strong>${t.serviceLabel}</strong> ${customerInfo.serviceName}</p>
            ${customerInfo.invoiceId ? `<p><strong>${t.invoiceIdLabel}</strong> ${customerInfo.invoiceId}</p>` : ''}
            ${customerInfo.paymentUrl ? `<p><strong>${t.paymentUrlLabel}</strong> <a href="${customerInfo.paymentUrl}" style="color: #2563eb; display: inline-block; word-break: break-all;">${customerInfo.paymentUrl}</a></p>` : ''}
            <p style="margin-top: 20px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">WARNING: This is a fallback email. The webhook or document upload may have failed. Please check the logs.</p>
          </div>
        </div>
      `
    });
    
    return result.success 
      ? { success: true, error: null, messageId: result.messageId } 
      : { success: false, error: result.error };
  } catch (fallbackError) {
    return { success: false, error: fallbackError };
  }
}

// Function to implement rate limiting
async function checkRateLimit(
  ip: string,
  action: string,
  limit: number = 10,
  windowMinutes: number = 1
): Promise<{ allowed: boolean; resetTime?: number }> {
  try {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const resetTime = now + windowMs;
    const path = `ratelimit:${action}`;
    
    // Get existing record
    const { data } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('path', path)
      .eq('ip_address', ip)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // If no record exists or it has expired, create a new one
    if (!data || now > data.reset_at) {
      // Insert new rate limit record
      await supabaseAdmin
        .from('rate_limits')
        .insert({
          id: uuidv4(),
          path,
          ip_address: ip,
          requests: 1,
          reset_at: resetTime
        });
      
      return { allowed: true };
    }
    
    // Check if limit is exceeded
    if (data.requests >= limit) {
      return { allowed: false, resetTime: data.reset_at };
    }
    
    // Update the counter
    await supabaseAdmin
      .from('rate_limits')
      .update({ requests: data.requests + 1 })
      .eq('id', data.id);
    
    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request
    return { allowed: true };
  }
}

// Main handler with optimized error handling
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Use X-Request-ID for tracing if available
  const requestId = req.headers.get('x-request-id') || uuidv4();
  console.log(`[${requestId}] Starting order-complete processing`);
  
  // Get IP for rate limiting and logging
  const clientIp = (req.headers.get('x-forwarded-for') || '')
    .split(',')[0]
    .trim() || 'unknown';
  
  try {
    // Apply rate limiting
    const rateLimit = await checkRateLimit(clientIp, 'create_order', 10, 1);
    if (!rateLimit.allowed) {
      // Log rate limit event
      await logSecurityEvent({
        event_type: 'rate_limit_exceeded',
        path: '/api/order-complete',
        ip_address: clientIp,
        user_agent: req.headers.get('user-agent') || 'unknown',
        message: `Rate limit exceeded for order creation. Reset at ${new Date(rateLimit.resetTime || 0).toISOString()}`
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(((rateLimit.resetTime || 0) - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(((rateLimit.resetTime || 0) - Date.now()) / 1000))
          }
        }
      );
    }
    
    // Check if required environment variables are set for email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn(`[${requestId}] Email configuration missing. Email functionality may not work correctly.`);
    }

    // Get language from header (most reliable method)
    const preferredLanguage = req.headers.get('x-preferred-language') || 'en';
 
    // Parse the form data using our optimized helper function
    console.time(`[${requestId}] parseFormData`);
    const { fields, files } = await parseFormDataMemoized(req);
    console.timeEnd(`[${requestId}] parseFormData`);
    
    // Get uploaded document - handle both single file and array cases
    const uploadedFile = Array.isArray(files.allRequirements) 
      ? files.allRequirements[0] 
      : files.allRequirements;

    // Check if file exists and has filepath property
    if (!uploadedFile || !uploadedFile.filepath) {
      console.error(`[${requestId}] No valid file found in request`);
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
    const requestedAmount = fields.amount ? Number(fields.amount) : 0;
    
    // Input validation
    if (!isValidName(customerName)) {
      return NextResponse.json({ 
        success: false, 
        message: preferredLanguage === 'id' ? 'Nama tidak valid' : 'Invalid name'
      }, { status: 400 });
    }
    
    if (!isValidEmail(customerEmail)) {
      return NextResponse.json({ 
        success: false, 
        message: preferredLanguage === 'id' ? 'Email tidak valid' : 'Invalid email'
      }, { status: 400 });
    }

    // Determine language priority: header > form field > default
    const finalLanguage: string = (preferredLanguage || fields.language || 'en') as string;
    
    // Validate service and price
    const serviceValidation = await validateService(serviceId, serviceName, requestedAmount);
    if (!serviceValidation.valid) {
      // Log price tampering attempt
      await logSecurityEvent({
        event_type: 'price_tampering_attempt',
        path: '/api/order-complete',
        ip_address: clientIp,
        user_agent: req.headers.get('user-agent') || 'unknown',
        message: `${serviceValidation.message}: serviceId=${serviceId}, serviceName=${serviceName}, requestedAmount=${requestedAmount}, expectedPrice=${serviceValidation.expectedPrice}`
      });
      
      return NextResponse.json({ 
        success: false, 
        message: finalLanguage === 'id' ? 'Harga tidak valid' : serviceValidation.message
      }, { status: 400 });
    }
    
    // Use the validated amount - will never be undefined because validation guarantees it
    const amount = serviceValidation.expectedPrice!;
 
    // Step 1: Create Xendit invoice - with error handling
    console.time(`[${requestId}] createXenditInvoice`);
    let invoiceId = '';
    let paymentUrl = '';
    let xenditError: ErrorType = null;

    try {
      if (!process.env.XENDIT_SECRET_KEY) {
        throw new Error("Missing Xendit API key");
      }

      const xenditInvoiceClient = new InvoiceClient({
        secretKey: process.env.XENDIT_SECRET_KEY,
      });

      const invoiceData = {
        externalId: `INV-${Date.now()}`,
        amount: amount,
        payerEmail: customerEmail.trim(),
        description: `Pembayaran untuk ${customerName.trim()}`,
        currency: "IDR",
        invoiceDuration: "90", //invoice expired
      };
      
      const invoice = await xenditInvoiceClient.createInvoice({
        data: invoiceData,
      });
      
      invoiceId = invoice.id || '';
      paymentUrl = invoice.invoiceUrl || '';
    } catch (error) {
      xenditError = error;
      console.error(`[${requestId}] Xendit invoice creation error:`, error);
    }
    console.timeEnd(`[${requestId}] createXenditInvoice`);
    
    // Step 2: Store data in Supabase with document
    console.time(`[${requestId}] storeCustomerData`);
    let supabaseResult: { 
      success: boolean; 
      id?: string; 
      error?: ErrorType;
      documentPath?: string; 
    } = { 
      success: false, 
      id: undefined, 
      error: null,
      documentPath: undefined
    };
    
    try {
      // Skip if Supabase environment variables are not set
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        supabaseResult.error = 'Missing Supabase configuration';
        console.warn(`[${requestId}] Missing Supabase configuration`);
      } else {
        // Read the file into a buffer
        const fileBuffer = await require('fs/promises').readFile(uploadedFile.filepath);
        
        // Generate custom storage path
        const storagePath = `documents/${invoiceId || uuidv4()}_${Date.now()}_${uploadedFile.originalFilename.replace(/\s+/g, '_')}`;
        
        // Store data in Supabase - customizing the object to match your interface
        const customerData = {
          name: customerName,
          email: customerEmail,
          service_id: parseInt(serviceId),
          service_name: serviceName,
          invoice_id: invoiceId || undefined,
          payment_url: paymentUrl || undefined,
          status: 'Pending Payment',
          language: finalLanguage
        };
        
        // Additional data for logging but not including in the storeCustomerData function
        const extraData = {
          ip_address: clientIp,
          user_agent: req.headers.get('user-agent') || 'unknown'
        };
        
        const result = await storeCustomerData(
          customerData,
          fileBuffer,
          storagePath
        );
        
        // Assign the result
        supabaseResult = {
          ...result,
          documentPath: storagePath
        };
        
        if (!supabaseResult.success) {
          console.warn(`[${requestId}] Warning: Failed to store in database, continuing with email flow:`, supabaseResult.error);
        }
        
        // If successful, log the extra data separately
        if (supabaseResult.success && supabaseResult.id) {
          try {
            // Log additional data to avoid modifying storeCustomerData interface
            await supabaseAdmin
              .from('order_metadata')
              .insert({
                order_id: supabaseResult.id,
                ip_address: clientIp,
                user_agent: req.headers.get('user-agent') || 'unknown',
                created_at: new Date().toISOString()
              });
          } catch (metaError) {
            console.warn(`[${requestId}] Failed to store order metadata:`, metaError);
          }
        }
      }
    } catch (dbError) {
      supabaseResult.error = dbError;
      console.error(`[${requestId}] Database error:`, dbError);
    }
    console.timeEnd(`[${requestId}] storeCustomerData`);
    
    // Step 3: Create customer info object
    const customerInfo = {
      name: customerName,
      email: customerEmail,
      serviceName: serviceName,
      invoiceId: invoiceId,
      paymentUrl: paymentUrl
    };
    
    // Step 4: Trigger email sending via webhook in parallel with cleanup
    console.time(`[${requestId}] emailProcessing`);
    let webhookResult: WebhookResult = { success: false, error: null };
    let fallbackEmailResult: EmailResult = { success: false, error: null };
    
    // Using Promise.all to run in parallel
    const [webhookPromiseResult, cleanupPromiseResult] = await Promise.all([
      // Email webhook/fallback processing
      (async () => {
        if (supabaseResult.success && supabaseResult.id && supabaseResult.documentPath) {
          try {
            webhookResult = await triggerEmailWebhook(
              supabaseResult.id,
              supabaseResult.documentPath,
              customerInfo,
              finalLanguage
            );
            
            if (!webhookResult.success) {
              console.warn(`[${requestId}] Webhook failed, trying direct email as fallback`);
              fallbackEmailResult = await sendDirectEmail(customerInfo, finalLanguage);
            }
          } catch (webhookError) {
            webhookResult = { success: false, error: webhookError };
            console.error(`[${requestId}] Webhook error:`, webhookError);
            
            // Try fallback email on webhook error
            fallbackEmailResult = await sendDirectEmail(customerInfo, finalLanguage);
          }
        } else {
          console.warn(`[${requestId}] Skipping email webhook because of incomplete database data`);
          
          // Send fallback email if storage failed
          fallbackEmailResult = await sendDirectEmail(customerInfo, finalLanguage);
        }
        return { webhookResult, fallbackEmailResult };
      })(),
      
      // Cleanup temporary files
      (async () => {
        try {
          if (uploadedFile && uploadedFile.filepath) {
            await require('fs/promises').unlink(uploadedFile.filepath).catch(() => {});
          }
        } catch (cleanupError) {
          console.error(`[${requestId}] Error cleaning up temporary file:`, cleanupError);
        }
        return true;
      })()
    ]);
    console.timeEnd(`[${requestId}] emailProcessing`);

    // If Xendit invoice creation failed, return error
    if (xenditError) {
      return NextResponse.json({ 
        success: false, 
        message: finalLanguage === 'id' ? 'Gagal membuat invoice' : 'Failed to create invoice',
        error: process.env.NODE_ENV === 'development' ? String(xenditError) : 'Payment service error',
        documentUploaded: supabaseResult.success
      }, { status: 500 });
    }
    
    // Log successful order creation
    await logSecurityEvent({
      event_type: 'order_created',
      path: '/api/order-complete',
      ip_address: clientIp,
      user_agent: req.headers.get('user-agent') || 'unknown',
      message: `Order created: serviceId=${serviceId}, serviceName=${serviceName}, amount=${amount}, invoiceId=${invoiceId}`
    });
    
    // Return successful response
    console.log(`[${requestId}] Order complete processing finished successfully`);
    return NextResponse.json({ 
      success: true, 
      message: finalLanguage === 'id' ? 'Dokumen berhasil diunggah dan pesanan dibuat' : 'Document successfully uploaded and order created',
      paymentUrl: paymentUrl,
      invoiceId: invoiceId,
      storedInDatabase: supabaseResult.success,
      databaseId: supabaseResult.id || null,
      documentPath: supabaseResult.documentPath || null,
      emailStatus: webhookResult.success ? 'webhook_sent' : (fallbackEmailResult.success ? 'fallback_sent' : 'failed')
    }, { status: 200 });

  } catch (error) {
    console.error(`[${requestId}] Unhandled error in order-complete:`, error);
    
    // Log error
    await logSecurityEvent({
      event_type: 'order_error',
      path: '/api/order-complete',
      ip_address: clientIp,
      user_agent: req.headers.get('user-agent') || 'unknown',
      message: `Error in order-complete: ${error instanceof Error ? error.message : String(error)}`
    });
    
    // Get language from request headers as fallback
    let language = 'en';
    const preferredLanguage = req.headers.get('x-preferred-language');
    if (preferredLanguage) {
      language = preferredLanguage;
    }
    
    return NextResponse.json({ 
      success: false, 
      message: language === 'id' ? 'Gagal memproses pesanan' : 'Failed to process order',
      error: process.env.NODE_ENV === 'development' ? String(error) : 'Server error'
    }, { status: 500 });
  }
}