// components/Order/service.ts - Single API Version (Fixed)
export interface InvoiceData {
  amount: number;
  customerName: string;
  customerEmail: string;
  serviceId: number;
  serviceName: string;
  turnstileToken: string;
  sessionData: any;
  submissionAttempts: number;
  sendPaymentLinkByEmail: boolean;
  language: string;
}

// Enhanced security configuration
const SECURITY_CONFIG = {
  MAX_INPUT_LENGTH: {
    name: 100,
    email: 254,
    serviceName: 200
  },
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['pdf', 'jpg', 'jpeg', 'png', 'zip'],
  API_TIMEOUT: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second base delay
};

// Enhanced input sanitization with XSS protection
function sanitizeInput(input: string, maxLength?: number): string {
  if (!input) return '';
  
  let sanitized = input;
  
  // Length validation
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // XSS protection - more comprehensive
  sanitized = sanitized
    // Remove script tags and event handlers
    .replace(/<(script|iframe|object|embed|applet|base|link|meta|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*(on\w+|javascript:|data:text\/html|vbscript:)[^>]*>/gi, '')
    // Remove dangerous attributes
    .replace(/(on\w+\s*=\s*["']?[^"']*["']?)/gi, '')
    // Encode HTML entities
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
    
  return sanitized;
}

// Enhanced email validation
function validateEmail(email: string): boolean {
  if (!email || email.length > SECURITY_CONFIG.MAX_INPUT_LENGTH.email) return false;
  
  // RFC 5322 compliant regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;
  
  // Additional security checks
  const localPart = email.split('@')[0];
  const domain = email.split('@')[1];
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /script/i,
    /javascript/i,
    /vbscript/i,
    /onload/i,
    /onerror/i,
    /<|>/,
    /\.\./,
    /^\.|\.$/ // starts or ends with dot
  ];
  
  return !suspiciousPatterns.some(pattern => 
    pattern.test(localPart) || pattern.test(domain)
  );
}

// Enhanced name validation
function validateName(name: string): boolean {
  if (!name || name.length < 2 || name.length > SECURITY_CONFIG.MAX_INPUT_LENGTH.name) {
    return false;
  }
  
  // Allow international names but prevent XSS
  const nameRegex = /^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF\u0100-\u017F\u0180-\u024F'-]+$/;
  
  if (!nameRegex.test(name)) return false;
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:text/i,
    /vbscript:/i
  ];
  
  return !suspiciousPatterns.some(pattern => pattern.test(name));
}

// Rate limiting tracker (client-side)
class ClientRateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number; blocked: boolean }> = new Map();
  private readonly maxAttempts = 5;
  private readonly windowMs = 60000; // 1 minute
  private readonly blockDurationMs = 300000; // 5 minutes
  
  checkLimit(key: string): { allowed: boolean; remainingTime?: number } {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record) {
      this.attempts.set(key, { count: 1, lastAttempt: now, blocked: false });
      return { allowed: true };
    }
    
    // Check if block period has expired
    if (record.blocked && (now - record.lastAttempt) > this.blockDurationMs) {
      this.attempts.set(key, { count: 1, lastAttempt: now, blocked: false });
      return { allowed: true };
    }
    
    // If still blocked
    if (record.blocked) {
      const remainingTime = this.blockDurationMs - (now - record.lastAttempt);
      return { allowed: false, remainingTime: Math.ceil(remainingTime / 1000) };
    }
    
    // Check if window has expired
    if ((now - record.lastAttempt) > this.windowMs) {
      this.attempts.set(key, { count: 1, lastAttempt: now, blocked: false });
      return { allowed: true };
    }
    
    // Increment counter
    record.count++;
    record.lastAttempt = now;
    
    // Check if limit exceeded
    if (record.count > this.maxAttempts) {
      record.blocked = true;
      return { allowed: false, remainingTime: Math.ceil(this.blockDurationMs / 1000) };
    }
    
    return { allowed: true };
  }
}

const rateLimiter = new ClientRateLimiter();

// Enhanced retry logic with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = SECURITY_CONFIG.MAX_RETRY_ATTEMPTS,
  baseDelay: number = SECURITY_CONFIG.RETRY_DELAY
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        const nonRetryableErrors = ['400', '401', '403', '404', '413', '429'];
        if (nonRetryableErrors.some(code => error.message.includes(code))) {
          throw error;
        }
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff: baseDelay * 2^attempt + random jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Main API function - Enhanced createOrderComplete (SINGLE API)
export const createOrderComplete = async (
  formData: FormData,
  browserData: any = null,
  sessionId: string = '',
  language: string = 'en'
): Promise<any> => {
  // Client-side rate limiting check
  const clientKey = `${browserData?.sessionId || sessionId}_order`;
  const rateLimitCheck = rateLimiter.checkLimit(clientKey);
  
  if (!rateLimitCheck.allowed) {
    throw new Error(
      language === 'id' 
        ? `Terlalu banyak percobaan. Coba lagi dalam ${rateLimitCheck.remainingTime} detik.`
        : `Too many attempts. Try again in ${rateLimitCheck.remainingTime} seconds.`
    );
  }
  
  try {
    // Enhanced input validation and sanitization
    const sanitizedFormData = new FormData();
    const processedFields = new Set<string>();
    
    // Process and validate form data
    for (const [key, value] of formData.entries()) {
      if (processedFields.has(key)) continue; // Prevent duplicate processing
      processedFields.add(key);
      
      if (typeof value === 'string') {
        let sanitized = '';
        let maxLength = 500; // default
        
        switch (key) {
          case 'customerName':
            if (!validateName(value)) {
              throw new Error(
                language === 'id' 
                  ? 'Nama tidak valid. Gunakan hanya huruf dan karakter umum.'
                  : 'Invalid name. Use only letters and common characters.'
              );
            }
            sanitized = sanitizeInput(value, SECURITY_CONFIG.MAX_INPUT_LENGTH.name);
            break;
            
          case 'customerEmail':
            if (!validateEmail(value)) {
              throw new Error(
                language === 'id' 
                  ? 'Email tidak valid.'
                  : 'Invalid email address.'
              );
            }
            sanitized = sanitizeInput(value, SECURITY_CONFIG.MAX_INPUT_LENGTH.email);
            break;
            
          case 'serviceName':
            sanitized = sanitizeInput(value, SECURITY_CONFIG.MAX_INPUT_LENGTH.serviceName);
            break;
            
          case 'serviceId':
          case 'amount':
            // Validate numeric values
            if (!/^\d+$/.test(value)) {
              throw new Error(
                language === 'id' 
                  ? 'Data numerik tidak valid.'
                  : 'Invalid numeric data.'
              );
            }
            sanitized = value;
            break;
            
          default:
            sanitized = sanitizeInput(value, maxLength);
        }
        
        sanitizedFormData.append(key, sanitized);
      } else if (value instanceof File) {
        // Enhanced file validation
        if (value.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
          throw new Error(
            language === 'id' 
              ? 'Ukuran file terlalu besar. Maksimal 10MB.'
              : 'File too large. Maximum 10MB allowed.'
          );
        }
        
        // Check file extension
        const extension = value.name.split('.').pop()?.toLowerCase();
        if (!extension || !SECURITY_CONFIG.ALLOWED_FILE_TYPES.includes(extension)) {
          throw new Error(
            language === 'id' 
              ? 'Tipe file tidak didukung.'
              : 'File type not supported.'
          );
        }
        
        // Check for malicious file names
        const maliciousPatterns = [
          /\.(exe|php|js|jsp|asp|aspx|bat|cmd|scr|pif|com)$/i,
          /[<>:"|?*]/,
          /^\./,
          /\.\./
        ];
        
        if (maliciousPatterns.some(pattern => pattern.test(value.name))) {
          throw new Error(
            language === 'id' 
              ? 'Nama file tidak valid.'
              : 'Invalid file name.'
          );
        }
        
        sanitizedFormData.append(key, value);
      }
    }
    
    // Add validated language
    if (!sanitizedFormData.has('language')) {
      const validLanguages = ['en', 'id'];
      const validatedLanguage = validLanguages.includes(language) ? language : 'en';
      sanitizedFormData.append('language', validatedLanguage);
    }
    
    // Request ID for tracking
    const requestId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Enhanced security headers
    const securityHeaders: Record<string, string> = {
      "X-Session-ID": sessionId || sanitizedFormData.get('sessionId') as string || '',
      "X-Client-Fingerprint": btoa(JSON.stringify(browserData || { sessionId: sanitizedFormData.get('sessionId') })),
      "X-Preferred-Language": sanitizedFormData.get('language') as string || 'en',
      "X-Request-ID": requestId,
      "X-Requested-With": "XMLHttpRequest", // CSRF protection
      "X-Client-Version": "2.0.0", // Updated version
      "X-Timestamp": Date.now().toString() // Add timestamp
    };
    
    // Retry with exponential backoff
    return await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.API_TIMEOUT);
      
      try {
        const response = await fetch("/api/order-complete", {
          method: "POST",
          headers: securityHeaders,
          body: sanitizedFormData,
          signal: controller.signal,
          credentials: 'same-origin'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          
          if (response.status === 429) {
            const retryAfter = errorData.retryAfter || 60;
            throw new Error(
              language === 'id' 
                ? `Terlalu banyak permintaan. Silakan coba lagi dalam ${retryAfter} detik.`
                : `Too many requests. Please try again in ${retryAfter} seconds.`
            );
          }
          
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error(
            language === 'id' 
              ? 'Permintaan membutuhkan waktu terlalu lama. Silakan coba lagi.'
              : 'Request timed out. Please try again.'
          );
        }
        
        throw error;
      }
    });
    
  } catch (error) {
    console.error('Order complete error:', error);
    throw error;
  }
};

// DEPRECATED: Legacy functions for backward compatibility (will be removed in future versions)
export const createInvoice = async (data: InvoiceData) => {
  console.warn("🚨 createInvoice is DEPRECATED and will be removed. Use createOrderComplete instead.");
  throw new Error("This function has been deprecated. Please use createOrderComplete instead.");
};

export const uploadDocuments = async (
  formData: FormData,
  browserData: any = null,
  sessionId: string = '',
  language: string = ''
) => {
  console.warn("🚨 uploadDocuments is DEPRECATED and will be removed. Use createOrderComplete instead.");
  throw new Error("This function has been deprecated. Please use createOrderComplete instead.");
};