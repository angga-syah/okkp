// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/sb_admin";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { User } from "next-auth";
import { EnhancedRateLimiter, SecurityValidator } from "@/lib/enhanced-security";
import { authOptions } from "@/lib/auth-config";

// Enhanced rate limiter with progressive delays
const loginRateLimiter = new EnhancedRateLimiter("login", {
  maxAttempts: 5,
  windowMinutes: 15,
  lockoutMinutes: 30,
  progressiveDelay: true
});

const handler = NextAuth(authOptions);

// Enhanced auth logger with security metrics
const logAuthEvent = async (event: {
  type: string;
  email: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  message?: string;
  metadata?: any;
}) => {
  try {
    await supabaseAdmin.from("auth_logs").insert([
      {
        event_type: event.type,
        email: event.email,
        ip_address: event.ip || "unknown",
        user_agent: event.userAgent || "unknown",
        success: event.success,
        message: event.message || "",
        metadata: event.metadata || {},
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    console.error("Failed to log auth event:", error);
  }
};

// Enhanced client info extraction with security validation
async function getClientInfo(req: NextRequest | Request | undefined) {
  if (!req) {
    return { ip: 'unknown', userAgent: 'unknown', fingerprint: 'unknown' };
  }

  let ip = 'unknown';
  let userAgent = 'unknown';
  let fingerprint = 'unknown';

  if (req.headers instanceof Headers) {
    // Extract IP with multiple fallbacks
    const xForwardedFor = req.headers.get('x-forwarded-for');
    const xRealIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare
    
    if (xForwardedFor) {
      ip = xForwardedFor.split(',').shift()?.trim() || 'unknown';
    } else if (cfConnectingIp) {
      ip = cfConnectingIp;
    } else if (xRealIp) {
      ip = xRealIp;
    }
    
    userAgent = req.headers.get('user-agent') || 'unknown';
    fingerprint = req.headers.get('x-client-fingerprint') || 'unknown';
  } else if (typeof req.headers === 'object') {
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const forwardedFor = headers['x-forwarded-for'];
    ip = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor?.[0]) || 
         (headers['x-real-ip'] as string) || 
         (headers['cf-connecting-ip'] as string) ||
         'unknown';
    userAgent = (headers['user-agent'] as string) || 'unknown';
    fingerprint = (headers['x-client-fingerprint'] as string) || 'unknown';
  }

  // Validate and sanitize extracted data
  const ipValidation = SecurityValidator.validateAndSanitize(ip, { maxLength: 45 });
  const uaValidation = SecurityValidator.validateAndSanitize(userAgent, { maxLength: 500 });
  const fpValidation = SecurityValidator.validateAndSanitize(fingerprint, { maxLength: 100 });

  return { 
    ip: ipValidation.sanitized, 
    userAgent: uaValidation.sanitized,
    fingerprint: fpValidation.sanitized
  };
}

// Enhanced user interfaces
interface ExtendedUser extends User {
  role?: string;
}

interface ExtendedJWT extends JWT {
  role?: string;
  lastVerified?: number;
  loginAttempts?: number;
  securityLevel?: string;
}

interface ExtendedSession extends Session {
  user: {
    id: string;
    email: string;
    role?: string;
  };
  lastVerified?: number;
  securityLevel?: string;
}

interface DBUser {
  id: string;
  email: string;
  password: string;
  role: string;
  username?: string;
  is_locked?: boolean;
  failed_attempts?: number;
  last_login?: string;
  security_level?: string;
}

// Enhanced security checks
const performSecurityChecks = async (
  identifier: string, 
  clientInfo: { ip: string; userAgent: string; fingerprint: string }
): Promise<{ passed: boolean; reason?: string; action?: string }> => {
  
  // Check for suspicious patterns in identifier
  const identifierValidation = SecurityValidator.validateAndSanitize(identifier, {
    maxLength: 100,
    checkSQLInjection: true,
    checkXSS: true
  });

  if (!identifierValidation.isValid) {
    await logAuthEvent({
      type: "security_violation",
      email: identifier,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      success: false,
      message: `Security validation failed: ${identifierValidation.violations.join(', ')}`,
      metadata: { fingerprint: clientInfo.fingerprint, violations: identifierValidation.violations }
    });

    return { 
      passed: false, 
      reason: "Input validation failed", 
      action: "block_request" 
    };
  }

  // Check for suspicious user agent patterns
  const suspiciousUAPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /wget/i,
    /curl/i,
    /python/i,
    /script/i
  ];

  if (suspiciousUAPatterns.some(pattern => pattern.test(clientInfo.userAgent))) {
    await logAuthEvent({
      type: "suspicious_user_agent",
      email: identifier,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      success: false,
      message: "Suspicious user agent detected",
      metadata: { fingerprint: clientInfo.fingerprint }
    });

    return { 
      passed: false, 
      reason: "Suspicious user agent", 
      action: "progressive_delay" 
    };
  }

  // Check for rapid requests from same fingerprint
  try {
    const { data: recentAttempts } = await supabaseAdmin
      .from('auth_logs')
      .select('created_at')
      .eq('ip_address', clientInfo.ip)
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
      .order('created_at', { ascending: false });

    if (recentAttempts && recentAttempts.length > 10) {
      await logAuthEvent({
        type: "rapid_requests",
        email: identifier,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        success: false,
        message: `Rapid requests detected: ${recentAttempts.length} in last minute`,
        metadata: { fingerprint: clientInfo.fingerprint, requestCount: recentAttempts.length }
      });

      return { 
        passed: false, 
        reason: "Too many rapid requests", 
        action: "temporary_ban" 
      };
    }
  } catch (error) {
    console.error("Error checking recent attempts:", error);
  }

  return { passed: true };
};

export { handler as GET, handler as POST };