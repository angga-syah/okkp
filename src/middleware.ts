import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/sb_admin';

// Rate limiting state (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

async function logSecurityEvent(event: {
  type: string;
  path: string;
  ip: string;
  userAgent: string;
  userId?: string;
  message?: string;
}) {
  try {
    await supabaseAdmin.from("security_logs").insert({
      event_type: event.type,
      path: event.path,
      ip_address: event.ip,
      user_agent: event.userAgent,
      user_id: event.userId || null,
      message: event.message || '',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

function checkRateLimit(ip: string, limit: number = 60, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = `${ip}`;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  
  if (current.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  
  current.count++;
  return { allowed: true, remaining: limit - current.count };
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
  
  const ip = 
    (request.headers.get('x-forwarded-for') || '').split(',').shift()?.trim() || 
    request.headers.get('x-real-ip') || 
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Skip middleware for static assets
  if (
    pathname.includes('/_next/') ||
    pathname.includes('/cdn-cgi/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') && !pathname.includes('/api/')
  ) {
    return NextResponse.next();
  }

  try {
    // Apply rate limiting
    const rateLimit = checkRateLimit(ip, 100, 60000); // 100 requests per minute
    
    if (!rateLimit.allowed) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        path: pathname,
        ip,
        userAgent,
        message: `Rate limit exceeded: ${ip}`
      });
      
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later."
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          }
        }
      );
    }

    // Apply stricter rate limiting for API routes
    if (pathname.startsWith('/api/')) {
      const apiRateLimit = checkRateLimit(`api:${ip}`, 30, 60000); // 30 API requests per minute
      
      if (!apiRateLimit.allowed) {
        await logSecurityEvent({
          type: 'api_rate_limit_exceeded',
          path: pathname,
          ip,
          userAgent,
          message: `API rate limit exceeded: ${ip}`
        });
        
        return new NextResponse(
          JSON.stringify({
            error: "API rate limit exceeded",
            message: "Too many API requests. Please try again later."
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            }
          }
        );
      }
    }

    // Get authentication token
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const isAuthenticated = !!token;

    // Log suspicious access attempts
    if (pathname.startsWith('/wali') && !isAuthenticated) {
      await logSecurityEvent({
        type: 'unauthorized_access_attempt',
        path: pathname,
        ip,
        userAgent,
        message: 'Unauthenticated user attempted to access protected route'
      });
    }

    // Check token freshness for admin routes
    if (pathname.startsWith('/wali') && isAuthenticated) {
      const tokenLastVerified = token.lastVerified as number || 0;
      const TOKEN_FRESHNESS_LIMIT = 30 * 60 * 1000; // 30 minutes
      
      if (Date.now() - tokenLastVerified > TOKEN_FRESHNESS_LIMIT) {
        await logSecurityEvent({
          type: 'session_expired',
          path: pathname,
          ip,
          userAgent,
          userId: token.id as string,
          message: 'Session expired due to inactivity'
        });
        
        const signoutUrl = new URL('/api/auth/logout', request.url);
        signoutUrl.searchParams.set('callbackUrl', '/wall-e?reason=session_expired');
        return NextResponse.redirect(signoutUrl);
      }
      
      // Log successful admin access
      await logSecurityEvent({
        type: 'admin_access',
        path: pathname,
        ip,
        userAgent,
        userId: token.id as string,
      });
    }

    // Protected routes check
    if (pathname.startsWith('/wali')) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/wall-e', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Redirect authenticated users from login page
    if (pathname === '/wall-e' && isAuthenticated) {
      const reason = url.searchParams.get('reason');
      
      if (reason === 'session_expired') {
        return NextResponse.next();
      } else {
        return NextResponse.redirect(new URL('/wali', request.url));
      }
    }

  } catch (error) {
    console.error("Middleware error:", error);
    await logSecurityEvent({
      type: 'middleware_error',
      path: pathname,
      ip,
      userAgent,
      message: `Middleware error: ${error instanceof Error ? error.message : String(error)}`
    });
    
    if (pathname.startsWith('/wali')) {
      return NextResponse.redirect(new URL('/wall-e', request.url));
    }
  }

  // Add security headers
  const response = NextResponse.next();
  
  // Cache control for protected pages
  if (pathname.startsWith('/wali')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Enhanced CSP
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https://*.supabase.co; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com; " +
    "frame-src 'self' https://challenges.cloudflare.com; " +
    "frame-ancestors 'none';"
  );
  
  response.headers.set(
    'Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};