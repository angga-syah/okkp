// lib/security.ts
import { supabaseAdmin } from '@/lib/sb';

// Interface for security event log
export interface SecurityEvent {
  type: string;
  path: string;
  ip: string;
  userAgent: string;
  userId?: string;
  message?: string;
   metadata?: Record<string, any>;
}

/**
 * Logs a security event to the database
 * @param event Security event to log
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    // Log to Supabase security_logs table
    await supabaseAdmin.from('security_logs').insert({
      event_type: event.type,
      path: event.path,
      ip_address: event.ip,
      user_agent: event.userAgent,
      user_id: event.userId || null,
      message: event.message || '',
      metadata: event.metadata || {},
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Sanitizes user input to prevent XSS and injection attacks
 * @param input User input to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Basic sanitization - remove script tags and other potentially harmful content
  return input
    .replace(/<(script|iframe|object|embed|applet|base)/gi, '&lt;$1')
    .replace(/(on\w+\s*=\s*["']?[^"']*["']?)/gi, '')
    .trim();
}

/**
 * Validates if a string contains any suspicious patterns
 * @param input String to validate
 * @returns True if the string is clean, false if it contains suspicious patterns
 */
export function validateStringForSuspiciousPatterns(input: string): boolean {
  if (!input) return true;
  
  // Check for SQL injection attempts
  const sqlPatterns = [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|EXEC|DECLARE|SCRIPT)(\s|'|"|$|\*|\\)/i,
    /(\s|^)(FROM|WHERE)(\s+)(users|accounts|passwords|admin)(\s|'|"|$|\*|\\)/i,
    /(\s|^)(--|;--|\*\*|#|\/\*|\*\/|@@)(\s|'|"|$|\*|\\)/i
  ];
  
  // Check for XSS attempts
  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/i,
    /javascript\s*:/i,
    /on(load|click|mouseover|mouseout|submit|focus|blur|change)\s*=/i,
    /<iframe[^>]*>/i,
    /<img[^>]*onerror/i
  ];
  
  // Check for path traversal attempts
  const pathTraversalPatterns = [
    /\.\.\//g,
    /\.\.\\+/g
  ];
  
  // Combine all patterns for checking
  const allPatterns = [...sqlPatterns, ...xssPatterns, ...pathTraversalPatterns];
  
  // Return true if none of the patterns match (string is clean)
  return !allPatterns.some(pattern => pattern.test(input));
}

/**
 * Validates if a filename is safe
 * @param filename Filename to validate
 * @returns True if the filename is safe, false otherwise
 */
export function validateFilename(filename: string): boolean {
  if (!filename) return false;
  
  // Check for potentially dangerous or executable extensions
  const dangerousExtensions = /\.(php|phtml|asp|aspx|jsp|jspx|cgi|pl|py|exe|bat|cmd|sh|vbs|dll)$/i;
  if (dangerousExtensions.test(filename)) {
    return false;
  }
  
  // Check for path traversal attempts
  if (filename.includes('../') || filename.includes('..\\')) {
    return false;
  }
  
  // Check for null bytes (common in specific injection attacks)
  if (filename.includes('\0')) {
    return false;
  }
  
  return true;
}

/**
 * Generates a secure random string for use as a token or identifier
 * @param length Length of the string to generate
 * @returns Secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Compares two strings in constant time to prevent timing attacks
 * @param a First string
 * @param b Second string
 * @returns True if strings are equal, false otherwise
 */
export function secureCompare(a: string, b: string): boolean {
  const crypto = require('crypto');
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf8'),
    Buffer.from(b, 'utf8')
  );
}

/**
 * Validates turnstile token with Cloudflare
 * @param token Turnstile token to validate
 * @param ip Client IP address
 * @returns Object with success flag and error message if any
 */
export async function validateTurnstileToken(token: string, ip: string): Promise<{success: boolean, error?: string}> {
  try {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.error('Missing TURNSTILE_SECRET_KEY');
      return { success: false, error: 'Missing Turnstile configuration' };
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: ip
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      return { 
        success: false, 
        error: `Turnstile validation failed: ${result['error-codes']?.join(', ') || 'Unknown error'}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Turnstile validation error:', error);
    return { success: false, error: 'Turnstile validation error' };
  }
}