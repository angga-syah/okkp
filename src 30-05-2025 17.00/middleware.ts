// middleware.ts - OPTIONAL UPDATE (if session expiry issues persist)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SupabaseRateLimiter } from '@/lib/sb_limiter';
import {supabaseAdmin} from '@/lib/sb_admin';

// API and admin routes rate limiting
const apiRateLimiter = new SupabaseRateLimiter({
  prefix: "ratelimit:api",
  ...SupabaseRateLimiter.slidingWindow(50, "1 m"), // 50 requests per minute
  analytics: true
});

// Create a function to log security events
async function logSecurityEvent(event: {
  type: string;
  path: string;
  ip: string;
  userAgent: string;
  userId?: string;
  message?: string;
}) {
  try {
    // Log to Supabase security_logs table
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

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
  
  // Client information for logging
  const ip = 
    (request.headers.get('x-forwarded-for') || '').split(',').shift()?.trim() || 
    request.headers.get('x-real-ip') || 
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Skip middleware for static assets
  if (
    pathname.includes('/api/') || 
    pathname.includes('/_next/') ||
    pathname.includes('/cdn-cgi/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') // static files usually have extensions
  ) {
    return NextResponse.next();
  }

  try {
    // Apply rate limiting for admin routes
    if (pathname.startsWith('/wali')) {
      const { success, limit, reset } = await apiRateLimiter.limit(`admin:${ip}`);
      
      if (!success) {
        await logSecurityEvent({
          type: 'rate_limit_exceeded',
          path: pathname,
          ip,
          userAgent,
          message: `Rate limit exceeded for admin route: ${limit} requests allowed per minute. Resets at ${new Date(reset).toISOString()}`
        });
        
        // Return 429 Too Many Requests
        return new NextResponse(
          JSON.stringify({
            error: "Too many requests",
            message: `Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)} seconds.`
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
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

    // ✅ RELAXED: More lenient token freshness check - 2 hours instead of 30 minutes
    if (pathname.startsWith('/wali') && isAuthenticated) {
      const tokenLastVerified = token.lastVerified as number || 0;
      const TOKEN_FRESHNESS_LIMIT = 2 * 60 * 60 * 1000; // ✅ CHANGED: 2 hours instead of 30 minutes
      
      // ✅ ADDED: Only check token freshness for sensitive operations, not regular page loads
      const isSensitiveOperation = pathname.includes('/admin') || 
                                   pathname.includes('/settings') ||
                                   request.method !== 'GET';
      
      if (isSensitiveOperation && (Date.now() - tokenLastVerified > TOKEN_FRESHNESS_LIMIT)) {
        await logSecurityEvent({
          type: 'session_expired',
          path: pathname,
          ip,
          userAgent,
          userId: token.id as string,
          message: 'Session expired due to inactivity on sensitive operation'
        });
        
        // Clear the token by redirecting to signout first
        const signoutUrl = new URL('/api/auth/logout', request.url);
        signoutUrl.searchParams.set('callbackUrl', '/wall-e?reason=session_expired&callbackUrl=' + encodeURIComponent(pathname));
        return NextResponse.redirect(signoutUrl);
      }
      
      // ✅ IMPROVED: Only log admin access for sensitive operations to reduce noise
      if (isSensitiveOperation) {
        await logSecurityEvent({
          type: 'admin_access',
          path: pathname,
          ip,
          userAgent,
          userId: token.id as string,
        });
      }
    }

    // Protected routes check
    if (pathname.startsWith('/wali')) {
      if (!isAuthenticated) {
        // Store original URL to redirect back after login
        const loginUrl = new URL('/wall-e', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // ✅ IMPROVED: Better handling of login page with session expiry
    if (pathname === '/wall-e' && isAuthenticated) {
      const reason = url.searchParams.get('reason');
      
      if (reason === 'session_expired') {
        // Don't redirect if session expired, let them log in again
        return NextResponse.next();
      } else {
        // ✅ ADDED: Check if token is still fresh before redirecting
        const tokenLastVerified = token.lastVerified as number || 0;
        const isTokenFresh = (Date.now() - tokenLastVerified) < (2 * 60 * 60 * 1000); // 2 hours
        
        if (isTokenFresh) {
          return NextResponse.redirect(new URL('/wali', request.url));
        } else {
          // Token is stale, let them login again
          return NextResponse.next();
        }
      }
    }

  } catch (error) {
    console.error("Middleware error:", error);
    // Log middleware errors
    await logSecurityEvent({
      type: 'middleware_error',
      path: pathname,
      ip,
      userAgent,
      message: `Middleware error: ${error instanceof Error ? error.message : String(error)}`
    });
    
    // If there's an error in auth and user is trying to access protected route, redirect to login
    if (pathname.startsWith('/wali')) {
      return NextResponse.redirect(new URL('/wall-e', request.url));
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Cache control for protected pages
  if (pathname.startsWith('/wali')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  
  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Content Security Policy to allow Supabase Storage URLs
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://challenges.cloudflare.com https://*.gstatic.com https://cdn-cgi.cloudflare.com https://va.vercel-scripts.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: blob: https://cdn.sanity.io https://*.googleapis.com https://*.gstatic.com https://mapsresources-pa.googleapis.com https://*.supabase.co https://*.supabase.in; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' data: https://api.supabase.co https://vhacbiaaaifuavginczh.supabase.co wss://vhacbiaaaifuavginczh.supabase.co https://*.googleapis.com https://*.gstatic.com https://challenges.cloudflare.com https://cdn-cgi.cloudflare.com https://va.vercel-scripts.com localhost:*; " +
    "worker-src 'self' blob: https://maps.googleapis.com; " +
    "frame-src 'self' https://challenges.cloudflare.com https://*.google.com; " +
    "frame-ancestors 'none';"
  );
  
  response.headers.set(
    'Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()'
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};