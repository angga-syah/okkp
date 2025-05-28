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

// Enhanced rate limiter with progressive delays
const loginRateLimiter = new EnhancedRateLimiter("login", {
  maxAttempts: 5,
  windowMinutes: 15,
  lockoutMinutes: 30,
  progressiveDelay: true
});

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

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email atau Username", type: "text" },
        password: { label: "Password", type: "password" },
        fingerprint: { label: "Fingerprint", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        try {
          const clientInfo = await getClientInfo(req as unknown as Request)
            .catch(() => ({ ip: 'unknown', userAgent: 'unknown', fingerprint: 'unknown' }));

          const { ip, userAgent, fingerprint } = clientInfo;

          // Enhanced security checks
          const securityCheck = await performSecurityChecks(credentials.identifier, clientInfo);
          if (!securityCheck.passed) {
            if (securityCheck.action === "block_request") {
              throw new Error("SECURITY_VIOLATION:Request blocked due to security policy");
            } else if (securityCheck.action === "progressive_delay") {
              throw new Error("PROGRESSIVE_DELAY:10");
            } else if (securityCheck.action === "temporary_ban") {
              throw new Error("TOO_MANY_REQUESTS:" + (Date.now() + 300000)); // 5 minutes
            }
          }

          // Enhanced rate limiting
          const rateLimitResult = await loginRateLimiter.checkAndLimit(ip);
          
          if (!rateLimitResult.success) {
            await logAuthEvent({
              type: "login_ratelimited",
              email: credentials.identifier,
              ip,
              userAgent,
              success: false,
              message: `Rate limit exceeded. Remaining: ${rateLimitResult.remaining}, Reset: ${new Date(rateLimitResult.resetTime).toISOString()}`,
              metadata: { 
                fingerprint,
                isLocked: rateLimitResult.isLocked,
                lockoutDuration: rateLimitResult.lockoutDuration
              }
            });

            if (rateLimitResult.isLocked) {
              throw new Error(`ACCOUNT_LOCKED:${rateLimitResult.lockoutDuration}`);
            } else if (rateLimitResult.nextAttemptDelay) {
              throw new Error(`PROGRESSIVE_DELAY:${rateLimitResult.nextAttemptDelay}`);
            } else {
              throw new Error(`TOO_MANY_REQUESTS:${rateLimitResult.resetTime}`);
            }
          }

          // Validate and sanitize input
          const identifierValidation = SecurityValidator.validateAndSanitize(credentials.identifier, {
            maxLength: 100,
            checkSQLInjection: true,
            checkXSS: true
          });

          const passwordValidation = SecurityValidator.validateAndSanitize(credentials.password, {
            maxLength: 200,
            checkSQLInjection: true,
            checkXSS: true
          });

          if (!identifierValidation.isValid || !passwordValidation.isValid) {
            await rateLimitResult && rateLimitResult.success && 
              loginRateLimiter.recordAttempt(ip, false, { 
                reason: "validation_failed",
                violations: [...identifierValidation.violations, ...passwordValidation.violations]
              });

            throw new Error("VALIDATION_ERROR:Invalid input format");
          }

          const sanitizedIdentifier = identifierValidation.sanitized.toLowerCase();
          const sanitizedPassword = passwordValidation.sanitized;

          // Determine if it's email or username
          const isEmail = SecurityValidator.validateEmail(sanitizedIdentifier);
          let user: DBUser | null = null;

          if (isEmail) {
            // Search by email
            const { data: userByEmail, error: emailError } = await supabaseAdmin
              .from("users")
              .select("*")
              .ilike("email", sanitizedIdentifier)
              .maybeSingle();

            if (emailError) throw emailError;
            user = userByEmail as DBUser;
          } else {
            // Validate username format
            const usernameValidation = SecurityValidator.validateUsername(sanitizedIdentifier);
            if (!usernameValidation.isValid) {
              await rateLimitResult && rateLimitResult.success && 
                loginRateLimiter.recordAttempt(ip, false, { reason: "invalid_username" });
              
              throw new Error("VALIDATION_ERROR:Invalid username format");
            }

            // Search by username
            const { data: userByUsername, error: usernameError } = await supabaseAdmin
              .from("users")
              .select("*")
              .ilike("username", sanitizedIdentifier)
              .maybeSingle();

            if (usernameError) throw usernameError;
            user = userByUsername as DBUser;
          }

          // User not found
          if (!user) {
            await rateLimitResult && rateLimitResult.success && 
              loginRateLimiter.recordAttempt(ip, false, { reason: "user_not_found" });

            await logAuthEvent({
              type: "login_failed",
              email: sanitizedIdentifier,
              ip,
              userAgent,
              success: false,
              message: "User not found",
              metadata: { fingerprint, searchType: isEmail ? 'email' : 'username' }
            });

            return null;
          }

          // Check if user account is locked
          if (user.is_locked) {
            await rateLimitResult && rateLimitResult.success && 
              loginRateLimiter.recordAttempt(ip, false, { reason: "account_locked" });

            await logAuthEvent({
              type: "login_blocked",
              email: user.email,
              ip,
              userAgent,
              success: false,
              message: "Account is locked",
              metadata: { fingerprint, userId: user.id }
            });

            throw new Error("ACCOUNT_LOCKED:indefinite");
          }

          // Enhanced password verification with timing attack protection
          const passwordStartTime = Date.now();
          const passwordMatch = await bcrypt.compare(sanitizedPassword, user.password);
          const passwordEndTime = Date.now();

          // Add minimum processing time to prevent timing attacks
          const minProcessingTime = 100; // 100ms minimum
          const actualProcessingTime = passwordEndTime - passwordStartTime;
          if (actualProcessingTime < minProcessingTime) {
            await new Promise(resolve => setTimeout(resolve, minProcessingTime - actualProcessingTime));
          }

          if (!passwordMatch) {
            await rateLimitResult && rateLimitResult.success && 
              loginRateLimiter.recordAttempt(ip, false, { 
                reason: "invalid_password",
                userId: user.id 
              });

            // Increment failed attempts counter
            try {
              await supabaseAdmin
                .from("users")
                .update({ 
                  failed_attempts: (user.failed_attempts || 0) + 1,
                  last_failed_login: new Date().toISOString()
                })
                .eq("id", user.id);
            } catch (updateError) {
              console.error("Failed to update failed attempts:", updateError);
            }

            await logAuthEvent({
              type: "login_failed",
              email: user.email,
              ip,
              userAgent,
              success: false,
              message: "Invalid password",
              metadata: { 
                fingerprint, 
                userId: user.id,
                failedAttempts: (user.failed_attempts || 0) + 1
              }
            });

            return null;
          }

          // Successful login - record attempt and update user data
          await rateLimitResult && rateLimitResult.success && 
            loginRateLimiter.recordAttempt(ip, true, { 
              userId: user.id,
              method: isEmail ? 'email' : 'username'
            });

          // Reset failed attempts and update last login
          try {
            await supabaseAdmin
              .from("users")
              .update({ 
                failed_attempts: 0,
                last_login: new Date().toISOString(),
                last_login_ip: ip
              })
              .eq("id", user.id);
          } catch (updateError) {
            console.error("Failed to update login data:", updateError);
          }

          await logAuthEvent({
            type: "login_success",
            email: user.email,
            ip,
            userAgent,
            success: true,
            message: "Login successful",
            metadata: { 
              fingerprint, 
              userId: user.id,
              method: isEmail ? 'email' : 'username',
              securityLevel: user.security_level || 'standard'
            }
          });

          // Return user object with security metadata
          return {
            id: user.id,
            email: user.email,
            name: user.email,
            role: user.role,
          } as ExtendedUser;

        } catch (error) {
          // Handle specific error types
          if (error instanceof Error) {
            if (error.message.startsWith("TOO_MANY_REQUESTS") ||
                error.message.startsWith("ACCOUNT_LOCKED") ||
                error.message.startsWith("PROGRESSIVE_DELAY") ||
                error.message.startsWith("SECURITY_VIOLATION") ||
                error.message.startsWith("VALIDATION_ERROR")) {
              throw error;
            }
          }

          // Log unexpected errors
          console.error("Authentication error:", error);

          try {
            const clientInfo = await getClientInfo(req as unknown as Request)
              .catch(() => ({ ip: 'unknown', userAgent: 'unknown', fingerprint: 'unknown' }));

            await logAuthEvent({
              type: "login_error",
              email: credentials?.identifier || "unknown",
              ip: clientInfo.ip,
              userAgent: clientInfo.userAgent,
              success: false,
              message: `System error: ${error instanceof Error ? error.message : String(error)}`,
              metadata: { fingerprint: clientInfo.fingerprint }
            });
          } catch (logError) {
            console.error("Failed to log auth error:", logError);
          }

          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/wall-e",
    error: "/wall-e",
  },
  callbacks: {
    async jwt({ token, user }) {
      const extendedToken = token as ExtendedJWT;

      if (user) {
        const extendedUser = user as ExtendedUser;
        extendedToken.id = extendedUser.id;
        extendedToken.role = extendedUser.role;
        extendedToken.email = extendedUser.email;
        extendedToken.iat = Math.floor(Date.now() / 1000);
        extendedToken.lastVerified = Date.now();
        extendedToken.securityLevel = 'standard';
      } else {
        // Refresh token verification
        extendedToken.lastVerified = Date.now();
      }
      return extendedToken;
    },
    async session({ session, token }) {
      const extendedSession = session as ExtendedSession;
      const extendedToken = token as ExtendedJWT;

      if (extendedToken && extendedSession.user) {
        extendedSession.user.id = extendedToken.id as string;
        extendedSession.user.role = extendedToken.role;
        extendedSession.user.email = extendedToken.email || "";
        extendedSession.lastVerified = extendedToken.lastVerified;
        extendedSession.securityLevel = extendedToken.securityLevel;
      }
      return extendedSession;
    },
    async redirect({ url, baseUrl }) {
      // Enhanced redirect validation
      if (url.startsWith("http")) {
        // Validate external URLs
        try {
          const urlObj = new URL(url);
          const baseUrlObj = new URL(baseUrl);
          
          // Only allow redirects to same origin
          if (urlObj.origin === baseUrlObj.origin) {
            return url;
          }
        } catch (error) {
          console.error("Invalid redirect URL:", error);
        }
        return baseUrl;
      }

      // Validate relative URLs
      if (url.startsWith("/")) {
        // Prevent path traversal
        const pathValidation = SecurityValidator.validateAndSanitize(url, {
          checkPathTraversal: true,
          maxLength: 500
        });
        
        if (!pathValidation.isValid) {
          console.error("Invalid redirect path:", pathValidation.violations);
          return `${baseUrl}/wali`;
        }

        if (url === "/wali" || url.startsWith("/wali/")) {
          return `${baseUrl}/wali`;
        }
        return `${baseUrl}${pathValidation.sanitized}`;
      }

      // Default redirect
      return `${baseUrl}/wali`;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  events: {
    signOut: async function(params) {
      const { token } = params;
      if (token?.email) {
        try {
          await logAuthEvent({
            type: "logout",
            email: token.email,
            ip: "unknown",
            userAgent: "unknown",
            success: true,
            metadata: { 
              sessionDuration: token.lastVerified ? Date.now() - (token.lastVerified as number) : 0
            }
          });
        } catch (error) {
          console.error("Failed to log signOut event:", error);
        }
      }
    },
  },
});

export { handler as GET, handler as POST };