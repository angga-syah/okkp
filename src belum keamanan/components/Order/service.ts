// components/Order/service.ts
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

// Sanitize user input to prevent XSS and injection attacks
function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Basic sanitization - remove script tags and other potentially harmful content
  return input
    .replace(/<(script|iframe|object|embed|applet|base)/gi, '&lt;$1')
    .replace(/(on\w+\s*=\s*["']?[^"']*["']?)/gi, '')
    .trim();
}

// Improved combined function with better error handling, timeout management, and input sanitization
export const createOrderComplete = async (
  formData: FormData,
  browserData: any = null,
  sessionId: string = '',
  language: string = 'en'
) => {
  try {
    // Sanitize text inputs to prevent injection attacks
    const sanitizedFormData = new FormData();
    
    // Copy and sanitize form data
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        // Sanitize string values
        sanitizedFormData.append(key, sanitizeInput(value));
      } else {
        // Keep file objects as-is
        sanitizedFormData.append(key, value);
      }
    }
    
    // Add language to sanitized formData if not already present
    if (!sanitizedFormData.has('language')) {
      sanitizedFormData.append('language', language);
    }
   
    // Use language from formData if not explicitly provided
    const languageToUse = language || sanitizedFormData.get('language') as string;
    
    // Request ID for tracking
    const requestId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
   
    // Create a controller for the fetch request
    const controller = new AbortController();
    const { signal } = controller;
    
    // Set a timeout to abort the request if it takes too long
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000); // 30 seconds timeout
    
    try {
      // Add security headers to protect against CSRF
      const securityHeaders = {
        "X-Session-ID": sessionId || sanitizedFormData.get('sessionId') as string,
        "X-Client-Fingerprint": btoa(JSON.stringify(browserData || { sessionId: sanitizedFormData.get('sessionId') })),
        "X-Preferred-Language": languageToUse,
        "X-Request-ID": requestId,
        "X-Requested-With": "XMLHttpRequest", // CSRF protection
      };
      
      const response = await fetch("/api/order-complete", {
        method: "POST",
        headers: securityHeaders,
        body: sanitizedFormData,
        signal,
        credentials: 'same-origin' // Include cookies for CSRF protection
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Check for rate limiting
        if (response.status === 429) {
          const rateLimitData = await response.json();
          const retryAfter = rateLimitData.retryAfter || 60;
          
          throw new Error(
            languageToUse === 'id' 
              ? `Terlalu banyak permintaan. Silakan coba lagi dalam ${retryAfter} detik.` 
              : `Too many requests. Please try again in ${retryAfter} seconds.`
          );
        }
        
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      // Clear the timeout if an error occurs
      clearTimeout(timeoutId);
      
      // Check if the request was aborted due to timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(
          languageToUse === 'id' 
            ? 'Permintaan membutuhkan waktu terlalu lama. Silakan coba lagi.' 
            : 'The request took too long. Please try again.'
        );
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Order complete error:', error);
    throw error;
  }
};

// Keep the old functions for backward compatibility with updated security
export const createInvoice = async (data: InvoiceData) => {
  console.warn("Warning: Using deprecated createInvoice function. Consider switching to createOrderComplete for better performance and security.");
  
  // Sanitize input data
  const sanitizedData = {
    ...data,
    customerName: sanitizeInput(data.customerName),
    customerEmail: sanitizeInput(data.customerEmail),
    serviceName: sanitizeInput(data.serviceName)
  };
  
  // Create a controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
  
  try {
    const response = await fetch("/api/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": data.sessionData?.sessionId || "",
        "X-Client-Fingerprint": btoa(JSON.stringify(data.sessionData || {})),
        "X-Preferred-Language": data.language || "en",
        "X-Requested-With": "XMLHttpRequest" // CSRF protection
      },
      body: JSON.stringify(sanitizedData),
      signal: controller.signal,
      credentials: 'same-origin' // Include cookies for CSRF protection
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Check for rate limiting
      if (response.status === 429) {
        const rateLimitData = await response.json();
        const retryAfter = rateLimitData.retryAfter || 60;
        
        throw new Error(
          data.language === 'id' 
            ? `Terlalu banyak permintaan. Silakan coba lagi dalam ${retryAfter} detik.` 
            : `Too many requests. Please try again in ${retryAfter} seconds.`
        );
      }
      
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Ensure the invoice URL is a simple string, not an array
    if (result.invoiceUrl && Array.isArray(result.invoiceUrl)) {
      result.invoiceUrl = result.invoiceUrl[0];
    }
    
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        data.language === 'id'
          ? 'Permintaan membutuhkan waktu terlalu lama. Silakan coba lagi.'
          : 'The request took too long. Please try again.'
      );
    }
    
    throw error;
  }
};

export const uploadDocuments = async (
  formData: FormData,
  browserData: any = null,
  sessionId: string = '',
  language: string = ''
) => {
  console.warn("Warning: Using deprecated uploadDocuments function. Consider switching to createOrderComplete for better performance and security.");
  
  // Sanitize text inputs to prevent injection attacks
  const sanitizedFormData = new FormData();
  
  // Copy and sanitize form data
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      // Sanitize string values
      sanitizedFormData.append(key, sanitizeInput(value));
    } else {
      // Keep file objects as-is
      sanitizedFormData.append(key, value);
    }
  }
  
  // Add language to sanitized formData if not already present
  if (!sanitizedFormData.has('language')) {
    sanitizedFormData.append('language', language);
  }
  
  // Use language from formData if not explicitly provided
  const languageToUse = language || sanitizedFormData.get('language') as string;
  
  // Create a controller for the fetch request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
  
  try {
    const response = await fetch("/api/upload-documents", {
      method: "POST",
      headers: {
        "X-Session-ID": sessionId || sanitizedFormData.get('sessionId') as string,
        "X-Client-Fingerprint": btoa(JSON.stringify(browserData || { sessionId: sanitizedFormData.get('sessionId') })),
        "X-Preferred-Language": languageToUse,
        "X-Requested-With": "XMLHttpRequest" // CSRF protection
      },
      body: sanitizedFormData,
      signal: controller.signal,
      credentials: 'same-origin' // Include cookies for CSRF protection
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Check for rate limiting
      if (response.status === 429) {
        const rateLimitData = await response.json();
        const retryAfter = rateLimitData.retryAfter || 60;
        
        throw new Error(
          languageToUse === 'id' 
            ? `Terlalu banyak permintaan. Silakan coba lagi dalam ${retryAfter} detik.` 
            : `Too many requests. Please try again in ${retryAfter} seconds.`
        );
      }
      
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        languageToUse === 'id'
          ? 'Permintaan membutuhkan waktu terlalu lama. Silakan coba lagi.'
          : 'The request took too long. Please try again.'
      );
    }
    
    throw error;
  }
};