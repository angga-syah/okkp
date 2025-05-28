// src/lib/enhanced-security.ts
import { supabaseAdmin } from '@/lib/sb_admin';

export interface SecurityConfig {
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes: number;
  progressiveDelay: boolean;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  isLocked: boolean;
  lockoutDuration?: number;
  nextAttemptDelay?: number;
}

export class EnhancedRateLimiter {
  private prefix: string;
  private config: SecurityConfig;

  constructor(prefix: string, config: SecurityConfig) {
    this.prefix = prefix;
    this.config = config;
  }

  async checkAndLimit(identifier: string, userId?: string): Promise<RateLimitResult> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - (this.config.windowMinutes * 60 * 1000));
      
      // Get recent attempts
      const { data: attempts, error } = await supabaseAdmin
        .from('security_attempts')
        .select('*')
        .eq('identifier', identifier)
        .eq('attempt_type', this.prefix)
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Rate limiter error:', error);
        // Fail secure - allow but log
        await this.logSecurityEvent('rate_limiter_error', identifier, { error: error.message });
        return {
          success: true,
          remaining: this.config.maxAttempts - 1,
          resetTime: now.getTime() + (this.config.windowMinutes * 60 * 1000),
          isLocked: false
        };
      }

      const recentAttempts = attempts || [];
      const failedAttempts = recentAttempts.filter(attempt => !attempt.success);

      // Check if account is locked
      const lockoutThreshold = new Date(now.getTime() - (this.config.lockoutMinutes * 60 * 1000));
      const recentFailures = failedAttempts.filter(attempt => 
        new Date(attempt.created_at) > lockoutThreshold
      );

      if (recentFailures.length >= this.config.maxAttempts) {
        const lastFailure = new Date(recentFailures[0].created_at);
        const lockoutEnd = new Date(lastFailure.getTime() + (this.config.lockoutMinutes * 60 * 1000));
        
        if (now < lockoutEnd) {
          await this.logSecurityEvent('account_locked', identifier, {
            attempts: recentFailures.length,
            lockoutEnd: lockoutEnd.toISOString()
          });

          return {
            success: false,
            remaining: 0,
            resetTime: lockoutEnd.getTime(),
            isLocked: true,
            lockoutDuration: Math.ceil((lockoutEnd.getTime() - now.getTime()) / 1000)
          };
        }
      }

      // Calculate progressive delay
      let nextAttemptDelay = 0;
      if (this.config.progressiveDelay && failedAttempts.length > 0) {
        // Exponential backoff: 2^attempts seconds (max 60 seconds)
        nextAttemptDelay = Math.min(Math.pow(2, failedAttempts.length), 60);
        
        const lastAttempt = new Date(recentAttempts[0]?.created_at || 0);
        const timeSinceLastAttempt = (now.getTime() - lastAttempt.getTime()) / 1000;
        
        if (timeSinceLastAttempt < nextAttemptDelay) {
          return {
            success: false,
            remaining: this.config.maxAttempts - recentAttempts.length,
            resetTime: lastAttempt.getTime() + (nextAttemptDelay * 1000),
            isLocked: false,
            nextAttemptDelay: Math.ceil(nextAttemptDelay - timeSinceLastAttempt)
          };
        }
      }

      // Check rate limit
      if (recentAttempts.length >= this.config.maxAttempts) {
        return {
          success: false,
          remaining: 0,
          resetTime: windowStart.getTime() + (this.config.windowMinutes * 60 * 1000),
          isLocked: false
        };
      }

      return {
        success: true,
        remaining: this.config.maxAttempts - recentAttempts.length - 1,
        resetTime: windowStart.getTime() + (this.config.windowMinutes * 60 * 1000),
        isLocked: false,
        nextAttemptDelay: this.config.progressiveDelay ? nextAttemptDelay : 0
      };

    } catch (error) {
      console.error('Rate limiter unexpected error:', error);
      await this.logSecurityEvent('rate_limiter_critical_error', identifier, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      // Fail secure
      return {
        success: false,
        remaining: 0,
        resetTime: Date.now() + (this.config.windowMinutes * 60 * 1000),
        isLocked: true,
        lockoutDuration: this.config.lockoutMinutes * 60
      };
    }
  }

  async recordAttempt(identifier: string, success: boolean, metadata?: any): Promise<void> {
    try {
      await supabaseAdmin
        .from('security_attempts')
        .insert({
          identifier,
          attempt_type: this.prefix,
          success,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to record security attempt:', error);
    }
  }

  private async logSecurityEvent(eventType: string, identifier: string, metadata?: any): Promise<void> {
    try {
      await supabaseAdmin
        .from('security_logs')
        .insert({
          event_type: eventType,
          ip_address: identifier,
          user_agent: 'system',
          message: `Security event: ${eventType}`,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

// Input validation and sanitization
export class SecurityValidator {
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|EXEC|DECLARE|SCRIPT)(\s|'|"|$|\*|\\)/i,
    /(\s|^)(FROM|WHERE)(\s+)(users|accounts|passwords|admin)(\s|'|"|$|\*|\\)/i,
    /(\s|^)(--|;--|\*\*|#|\/\*|\*\/|@@)(\s|'|"|$|\*|\\)/i,
    /'(\s)*(or|and)(\s)*'.*'(\s)*=/i,
    /1(\s)*=(\s)*1/i,
    /admin'(\s)*--/i
  ];

  private static readonly XSS_PATTERNS = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript\s*:/gi,
    /on(load|click|mouseover|mouseout|submit|focus|blur|change|select|keydown|keyup|keypress)\s*=/gi,
    /<iframe[^>]*>/gi,
    /<img[^>]*onerror/gi,
    /<svg[^>]*onload/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /expression\s*\(/gi
  ];

  private static readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\.\//g,
    /\.\.\\+/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\0/g // null bytes
  ];

  static validateAndSanitize(input: string, options: {
    maxLength?: number;
    allowHTML?: boolean;
    checkSQLInjection?: boolean;
    checkXSS?: boolean;
    checkPathTraversal?: boolean;
  } = {}): { isValid: boolean; sanitized: string; violations: string[] } {
    const violations: string[] = [];
    let sanitized = input || '';

    // Length check
    if (options.maxLength && sanitized.length > options.maxLength) {
      violations.push(`Input exceeds maximum length of ${options.maxLength}`);
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // SQL Injection check
    if (options.checkSQLInjection !== false) {
      for (const pattern of this.SQL_INJECTION_PATTERNS) {
        if (pattern.test(sanitized)) {
          violations.push('Potential SQL injection detected');
          break;
        }
      }
    }

    // XSS check
    if (options.checkXSS !== false) {
      for (const pattern of this.XSS_PATTERNS) {
        if (pattern.test(sanitized)) {
          violations.push('Potential XSS attack detected');
          sanitized = sanitized.replace(pattern, '');
        }
      }
    }

    // Path traversal check
    if (options.checkPathTraversal !== false) {
      for (const pattern of this.PATH_TRAVERSAL_PATTERNS) {
        if (pattern.test(sanitized)) {
          violations.push('Path traversal attempt detected');
          sanitized = sanitized.replace(pattern, '');
        }
      }
    }

    // HTML sanitization
    if (!options.allowHTML) {
      sanitized = sanitized
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    // Additional suspicious pattern detection
    const suspiciousPatterns = [
      /eval\s*\(/gi,
      /document\.cookie/gi,
      /document\.write/gi,
      /window\.location/gi,
      /alert\s*\(/gi,
      /confirm\s*\(/gi,
      /prompt\s*\(/gi
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        violations.push('Suspicious script pattern detected');
        sanitized = sanitized.replace(pattern, '');
      }
    }

    return {
      isValid: violations.length === 0,
      sanitized: sanitized.trim(),
      violations
    };
  }

  static validateEmail(email: string): boolean {
    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
      return false;
    }

    // Additional checks
    if (email.length > 254) return false; // RFC limit
    if (email.includes('..')) return false; // Consecutive dots
    if (email.startsWith('.') || email.endsWith('.')) return false;

    return true;
  }
//username.length <(jumlah) panjang username allowed
  static validateUsername(username: string): { isValid: boolean; message?: string } {
    if (!username || username.length < 1) {
      return { isValid: false, message: 'Username must be at least 3 characters' };
    }

    if (username.length > 50) {
      return { isValid: false, message: 'Username must be less than 50 characters' };
    }

    // Only allow alphanumeric and underscore
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /admin/i,
      /root/i,
      /system/i,
      /null/i,
      /undefined/i,
      /test/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(username)) {
        return { isValid: false, message: 'Username contains restricted words' };
      }
    }

    return { isValid: true };
  }

  static validatePassword(password: string): { 
    isValid: boolean; 
    score: number; 
    feedback: string[];
    requirements: { [key: string]: boolean };
  } {
    const feedback: string[] = [];
    const requirements = {
      length: password.length >= 8, // panjang password
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /[0-9]/.test(password),
      symbols: /[^A-Za-z0-9]/.test(password),
      noCommon: !this.isCommonPassword(password),
    };

    let score = 0;
    
    if (requirements.length) score += 2;
    else feedback.push('Password must be at least 8 characters long');
    
    if (requirements.lowercase) score += 1;
    else feedback.push('Password must contain lowercase letters');
    
    if (requirements.uppercase) score += 1;
    else feedback.push('Password must contain uppercase letters');
    
    if (requirements.numbers) score += 1;
    else feedback.push('Password must contain numbers');
    
    if (requirements.symbols) score += 2;
    else feedback.push('Password must contain special characters');
    
    if (requirements.noCommon) score += 2;
    else feedback.push('Password is too common or easily guessable');

    // Check for patterns
    if (this.hasRepeatingPatterns(password)) {
      score -= 2;
      feedback.push('Password should not have repeating patterns');
    }

    if (this.hasSequentialChars(password)) {
      score -= 1;
      feedback.push('Password should not have sequential characters');
    }

    return {
      isValid: score >= 8 && Object.values(requirements).every(req => req),
      score: Math.max(0, Math.min(10, score)),
      feedback,
      requirements
    };
  }

  private static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123', 
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      'dragon', 'sunshine', 'princess', '654321', 'master'
    ];
    
    const lowerPassword = password.toLowerCase();
    return commonPasswords.some(common => 
      lowerPassword.includes(common) || common.includes(lowerPassword)
    );
  }

  private static containsPersonalInfo(password: string): boolean {
    // This is a simplified check - in real applications, you'd check against user's personal info
    const personalPatterns = [
      /admin/i,
      /user/i,
      /test/i,
      /demo/i,
      /\d{4}/, // year patterns
      /(123|abc|qwe|asd|zxc)/i // keyboard patterns
    ];

    return personalPatterns.some(pattern => pattern.test(password));
  }

  private static hasRepeatingPatterns(password: string): boolean {
    // Check for 3+ repeating characters
    if (/(.)\1{2,}/.test(password)) return true;
    
    // Check for repeating patterns like "abcabc"
    for (let i = 2; i <= password.length / 2; i++) {
      const pattern = password.substring(0, i);
      const repeated = pattern.repeat(Math.floor(password.length / i));
      if (password.startsWith(repeated) && repeated.length >= 6) {
        return true;
      }
    }
    
    return false;
  }

  private static hasSequentialChars(password: string): boolean {
    // Check for 4+ sequential characters (ascending or descending)
    for (let i = 0; i <= password.length - 4; i++) {
      const slice = password.substring(i, i + 4);
      
      // Check if 4 consecutive chars are sequential
      let isSequential = true;
      for (let j = 1; j < slice.length; j++) {
        if (slice.charCodeAt(j) !== slice.charCodeAt(j - 1) + 1) {
          isSequential = false;
          break;
        }
      }
      
      if (isSequential) return true;
      
      // Check descending
      isSequential = true;
      for (let j = 1; j < slice.length; j++) {
        if (slice.charCodeAt(j) !== slice.charCodeAt(j - 1) - 1) {
          isSequential = false;
          break;
        }
      }
      
      if (isSequential) return true;
    }
    
    return false;
  }
}