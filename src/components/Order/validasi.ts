// components/Order/validasi.ts - Enhanced Security Version
// Enhanced security configuration
const SECURITY_CONFIG = {
  MIN_FORM_TIME: 2000, // Minimum 2 seconds to fill form
  MAX_FORM_TIME: 3600000, // Maximum 1 hour
  MAX_INPUT_LENGTHS: {
    name: 100,
    email: 254
  },
  SUSPICIOUS_PATTERNS: {
    SQL_INJECTION: [
      /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|EXEC|DECLARE|SCRIPT)(\s|'|"|$|\*|\\)/i,
      /(\s|^)(FROM|WHERE)(\s+)(users|accounts|passwords|admin)(\s|'|"|$|\*|\\)/i,
      /(\s|^)(--|;--|\*\*|#|\/\*|\*\/|@@)(\s|'|"|$|\*|\\)/i,
      /'(\s)*(or|and)(\s)*'.*'(\s)*=/i,
      /1(\s)*=(\s)*1/i,
      /admin'(\s)*--/i
    ],
    XSS: [
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /javascript\s*:/gi,
      /on(load|click|mouseover|mouseout|submit|focus|blur|change|select|keydown|keyup|keypress)\s*=/gi,
      /<iframe[^>]*>/gi,
      /<img[^>]*onerror/gi,
      /<svg[^>]*onload/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /expression\s*\(/gi
    ],
    MALICIOUS_KEYWORDS: [
      /admin/i,
      /root/i,
      /system/i,
      /null/i,
      /undefined/i,
      /eval\s*\(/gi,
      /document\.cookie/gi,
      /document\.write/gi,
      /window\.location/gi,
      /alert\s*\(/gi,
      /confirm\s*\(/gi,
      /prompt\s*\(/gi
    ]
  }
} as const;

// Enhanced session ID generation with crypto-random values
export const generateSessionId = (): string => {
  const timestamp = Date.now();
  const randomBytes = new Uint8Array(16);
  
  // Use crypto.getRandomValues for better randomness
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for older browsers
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  
  const randomString = Array.from(randomBytes)
    .map(byte => byte.toString(36))
    .join('')
    .substring(0, 15);
    
  return `session_${timestamp}_${randomString}`;
};

// Enhanced suspicious submission detection
export const isSuspiciousSubmission = (
  formStartTime: number,
  additionalChecks?: {
    fieldCount?: number;
    mouseMovements?: number;
    keystrokes?: number;
    focusEvents?: number;
  }
): boolean => {
  const now = Date.now();
  const completionTime = now - formStartTime;
  
  // Basic timing check
  if (completionTime < SECURITY_CONFIG.MIN_FORM_TIME) {
    console.warn('Suspicious: Form completed too quickly');
    return true;
  }
  
  if (completionTime > SECURITY_CONFIG.MAX_FORM_TIME) {
    console.warn('Suspicious: Form session too long');
    return true;
  }
  
  // Additional behavioral checks if provided
  if (additionalChecks) {
    const { fieldCount = 0, mouseMovements = 0, keystrokes = 0, focusEvents = 0 } = additionalChecks;
    
    // Bot-like behavior detection
    if (mouseMovements === 0 && keystrokes > 10) {
      console.warn('Suspicious: No mouse movements with many keystrokes');
      return true;
    }
    
    if (focusEvents === 0 && fieldCount > 2) {
      console.warn('Suspicious: No focus events on multiple fields');
      return true;
    }
    
    // Extremely fast typing (inhuman speed)
    const typingSpeed = keystrokes / (completionTime / 1000); // keystrokes per second
    if (typingSpeed > 15) { // More than 15 keys per second
      console.warn('Suspicious: Inhuman typing speed');
      return true;
    }
  }
  
  return false;
};

// Enhanced name validation with security checks
export const validateName = (name: string): boolean => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  const trimmedName = name.trim();
  
  // Length validation
  if (trimmedName.length < 2 || trimmedName.length > SECURITY_CONFIG.MAX_INPUT_LENGTHS.name) {
    return false;
  }
  
  // Security pattern checks
  for (const patternGroup of Object.values(SECURITY_CONFIG.SUSPICIOUS_PATTERNS)) {
    for (const pattern of patternGroup) {
      if (pattern.test(trimmedName)) {
        console.warn('Suspicious pattern detected in name:', pattern);
        return false;
      }
    }
  }
  
  // Allow international names but prevent malicious content
  const nameRegex = /^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF\u0100-\u017F\u0180-\u024F\u1EA0-\u1EF9'-]+$/;
  if (!nameRegex.test(trimmedName)) {
    return false;
  }
  
  // Additional suspicious patterns specific to names
  const suspiciousNamePatterns = [
    /test/i,
    /admin/i,
    /null/i,
    /undefined/i,
    /[0-9]{4,}/, // Too many consecutive numbers
    /(.)\1{3,}/, // Too many repeated characters
    /^[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\u0100-\u017F\u0180-\u024F\u1EA0-\u1EF9]/, // Must start with letter
    /[^a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF\u0100-\u017F\u0180-\u024F\u1EA0-\u1EF9'-]$/ // Must end with letter or common punctuation
  ];
  
  for (const pattern of suspiciousNamePatterns) {
    if (pattern.test(trimmedName)) {
      return false;
    }
  }
  
  return true;
};

// Enhanced email validation with comprehensive security checks
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const trimmedEmail = email.trim().toLowerCase();
  
  // Length validation
  if (trimmedEmail.length === 0 || trimmedEmail.length > SECURITY_CONFIG.MAX_INPUT_LENGTHS.email) {
    return false;
  }
  
  // Security pattern checks
  for (const patternGroup of Object.values(SECURITY_CONFIG.SUSPICIOUS_PATTERNS)) {
    for (const pattern of patternGroup) {
      if (pattern.test(trimmedEmail)) {
        console.warn('Suspicious pattern detected in email:', pattern);
        return false;
      }
    }
  }
  
  // RFC 5322 compliant email regex (simplified for security)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return false;
  }
  
  // Additional email security checks
  const [localPart, domain] = trimmedEmail.split('@');
  
  if (!localPart || !domain) {
    return false;
  }
  
  // Local part validation
  if (localPart.length > 64) { // RFC limit
    return false;
  }
  
  // Domain validation
  if (domain.length > 253) { // RFC limit
    return false;
  }
  
  // Check for suspicious email patterns
  const suspiciousEmailPatterns = [
    /\.{2,}/, // Consecutive dots
    /^\./, // Starts with dot
    /\.$/, // Ends with dot
    /@{2,}/, // Multiple @ symbols
    /\+{2,}/, // Multiple + symbols
    /test.*test/i, // Test emails
    /admin.*admin/i, // Admin emails
    /^(no-?reply|noreply)@/i, // Noreply emails (suspicious for customer orders)
    /temp.*mail/i, // Temporary email services
    /10.*minute.*mail/i, // 10 minute mail services
    /guerrilla.*mail/i, // Guerrilla mail
    /mail.*drop/i, // Maildrop services
  ];
  
  for (const pattern of suspiciousEmailPatterns) {
    if (pattern.test(trimmedEmail)) {
      return false;
    }
  }
  
  // Check for suspicious domain patterns
  const suspiciousDomains = [
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'temp-mail.org',
    'getairmail.com',
    'maildrop.cc',
    'yopmail.com',
    'throwaway.email'
  ];
  
  for (const suspiciousDomain of suspiciousDomains) {
    if (domain.includes(suspiciousDomain)) {
      return false;
    }
  }
  
  return true;
};

// Enhanced browser data collection with security metadata
export const collectBrowserData = () => {
  const timestamp = Date.now();
  
  try {
    // Basic browser information
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const languages = navigator.languages?.join(',') || language;
    const platform = navigator.platform;
    
    // Screen and viewport information
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const viewportSize = `${window.innerWidth}x${window.innerHeight}`;
    const colorDepth = window.screen.colorDepth;
    const pixelDepth = window.screen.pixelDepth;
    
    // Timezone information
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneOffset = new Date().getTimezoneOffset();
    
    // Memory information (if available)
    const deviceMemory = (navigator as any).deviceMemory || 'unknown';
    const hardwareConcurrency = navigator.hardwareConcurrency || 'unknown';
    
    // Connection information (if available)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const connectionType = connection?.effectiveType || 'unknown';
    const connectionSpeed = connection?.downlink || 'unknown';
    
    // Browser capabilities
    const cookieEnabled = navigator.cookieEnabled;
    const doNotTrack = navigator.doNotTrack;
    const onLine = navigator.onLine;
    
    // JavaScript environment checks
    const javaEnabled = typeof navigator.javaEnabled === 'function' ? navigator.javaEnabled() : false;
    const webdriver = (navigator as any).webdriver || false;
    
    // Security-related checks
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasWebGL = (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
      } catch {
        return false;
      }
    })();
    
    // Generate session ID
    const sessionId = generateSessionId();
    
    // Create fingerprint hash (simple version for client-side)
    const fingerprintData = [
      userAgent,
      language,
      screenResolution,
      timeZone,
      String(colorDepth),
      String(pixelDepth),
      String(cookieEnabled),
      String(hasTouch),
      String(hasWebGL),
      platform
    ].join('|');
    
    const fingerprint = btoa(fingerprintData).substring(0, 32);
    
    return {
      sessionId,
      fingerprint,
      timestamp,
      userAgent: userAgent.substring(0, 500), // Limit length for security
      language,
      languages,
      platform,
      timeZone,
      timezoneOffset,
      screenResolution,
      viewportSize,
      colorDepth,
      pixelDepth,
      deviceMemory,
      hardwareConcurrency,
      connectionType,
      connectionSpeed,
      cookieEnabled,
      doNotTrack,
      onLine,
      javaEnabled,
      webdriver,
      hasTouch,
      hasWebGL,
      formCompletionTime: 0, // Will be updated when form is submitted
      
      // Security metadata
      securityMetadata: {
        collectTime: timestamp,
        source: 'client',
        version: '2.0'
      }
    };
  } catch (error) {
    console.error('Error collecting browser data:', error);
    
    // Fallback data in case of errors
    return {
      sessionId: generateSessionId(),
      fingerprint: 'error',
      timestamp,
      userAgent: 'unknown',
      language: 'unknown',
      timeZone: 'unknown',
      screenResolution: 'unknown',
      formCompletionTime: 0,
      error: true,
      securityMetadata: {
        collectTime: timestamp,
        source: 'client',
        version: '2.0',
        hasError: true
      }
    };
  }
};

// Enhanced input sanitization function
export const sanitizeInput = (input: string, maxLength?: number): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input;
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove or encode potentially dangerous patterns
  sanitized = sanitized
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:text\/html/gi, '') // Remove data URLs
    .replace(/vbscript:/gi, '') // Remove vbscript
    .replace(/expression\s*\(/gi, ''); // Remove CSS expressions
  
  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Apply length limit
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

// File validation helper
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }
  
  // File size validation (10MB max for serverless optimization)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size too large (max 10MB)' };
  }
  
  if (file.size === 0) {
    return { isValid: false, error: 'Empty file not allowed' };
  }
  
  // File name validation
  const fileName = file.name;
  if (!fileName || fileName.length > 255) {
    return { isValid: false, error: 'Invalid file name length' };
  }
  
  // Check for malicious file extensions
  const extension = fileName.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'zip'];
  
  if (!extension || !allowedExtensions.includes(extension)) {
    return { isValid: false, error: 'File type not allowed' };
  }
  
  // Check for malicious file name patterns
  const maliciousPatterns = [
    /\.(exe|php|js|jsp|asp|aspx|bat|cmd|scr|pif|com|vbs|ps1)$/i,
    /[<>:"|?*\x00-\x1f]/,
    /^\./,
    /\.\./,
    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i // Windows reserved names
  ];
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(fileName)) {
      return { isValid: false, error: 'Potentially malicious file name' };
    }
  }
  
  // MIME type validation
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/zip',
    'application/x-zip-compressed'
  ];
  
  if (!allowedMimeTypes.includes(file.type)) {
    return { isValid: false, error: 'MIME type not allowed' };
  }
  
  return { isValid: true };
};

// Form security tracker for behavioral analysis
export class FormSecurityTracker {
  private mouseMovements: number = 0;
  private keystrokes: number = 0;
  private focusEvents: number = 0;
  private fieldInteractions: Set<string> = new Set();
  private formStartTime: number = Date.now();
  private lastInteractionTime: number = Date.now();
  
  constructor() {
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Track mouse movements
    document.addEventListener('mousemove', () => {
      this.mouseMovements++;
      this.lastInteractionTime = Date.now();
    }, { passive: true });
    
    // Track keystrokes
    document.addEventListener('keydown', () => {
      this.keystrokes++;
      this.lastInteractionTime = Date.now();
    }, { passive: true });
    
    // Track focus events
    document.addEventListener('focusin', (e) => {
      this.focusEvents++;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        this.fieldInteractions.add(e.target.id || e.target.name || 'unknown');
      }
      this.lastInteractionTime = Date.now();
    }, { passive: true });
  }
  
  public getSecurityMetrics(): {
    mouseMovements: number;
    keystrokes: number;
    focusEvents: number;
    fieldCount: number;
    formDuration: number;
    idleTime: number;
  } {
    const now = Date.now();
    return {
      mouseMovements: this.mouseMovements,
      keystrokes: this.keystrokes,
      focusEvents: this.focusEvents,
      fieldCount: this.fieldInteractions.size,
      formDuration: now - this.formStartTime,
      idleTime: now - this.lastInteractionTime
    };
  }
  
  public reset(): void {
    this.mouseMovements = 0;
    this.keystrokes = 0;
    this.focusEvents = 0;
    this.fieldInteractions.clear();
    this.formStartTime = Date.now();
    this.lastInteractionTime = Date.now();
  }
}

// Rate limiting helper for client-side
export class ClientRateLimiter {
  private attempts: Map<string, { count: number; windowStart: number; blocked: boolean }> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;
  
  constructor(maxAttempts: number = 5, windowMinutes: number = 5, blockDurationMinutes: number = 15) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMinutes * 60 * 1000;
    this.blockDurationMs = blockDurationMinutes * 60 * 1000;
  }
  
  public checkLimit(key: string): { allowed: boolean; remainingTime?: number; attemptsLeft?: number } {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record) {
      this.attempts.set(key, { count: 1, windowStart: now, blocked: false });
      return { allowed: true, attemptsLeft: this.maxAttempts - 1 };
    }
    
    // Check if block period has expired
    if (record.blocked && (now - record.windowStart) > this.blockDurationMs) {
      this.attempts.set(key, { count: 1, windowStart: now, blocked: false });
      return { allowed: true, attemptsLeft: this.maxAttempts - 1 };
    }
    
    // If still blocked
    if (record.blocked) {
      const remainingTime = this.blockDurationMs - (now - record.windowStart);
      return { allowed: false, remainingTime: Math.ceil(remainingTime / 1000) };
    }
    
    // Check if window has expired
    if ((now - record.windowStart) > this.windowMs) {
      this.attempts.set(key, { count: 1, windowStart: now, blocked: false });
      return { allowed: true, attemptsLeft: this.maxAttempts - 1 };
    }
    
    // Increment counter
    record.count++;
    
    // Check if limit exceeded
    if (record.count > this.maxAttempts) {
      record.blocked = true;
      const remainingTime = Math.ceil(this.blockDurationMs / 1000);
      return { allowed: false, remainingTime };
    }
    
    return { 
      allowed: true, 
      attemptsLeft: this.maxAttempts - record.count 
    };
  }
  
  public reset(key: string): void {
    this.attempts.delete(key);
  }
}