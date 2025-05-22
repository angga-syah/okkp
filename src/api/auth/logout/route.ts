// app/api/auth/custom-signout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/sb_admin';

export async function GET(request: NextRequest) {
  try {
    // Get the auth token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    // Get callback URL from query parameters
    const { searchParams } = new URL(request.url);
    const callbackUrl = searchParams.get('callbackUrl') || '/wall-e?reason=manual_logout';
    
    // Log signout event
    if (token && token.email) {
      try {
        await supabaseAdmin.from("auth_logs").insert({
          event_type: 'logout',
          email: token.email as string,
          ip_address: (request.headers.get('x-forwarded-for') || '').split(',').shift()?.trim() || 
                     request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          success: true,
          message: 'User signed out via custom endpoint',
          created_at: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Failed to log logout event:', logError);
      }
    }
    
    // Create a response that will redirect to the callback URL
    const response = NextResponse.redirect(new URL(callbackUrl, request.url));
    
    // Get the cookie domain - on Vercel this is important
    const host = request.headers.get('host') || '';
    const domain = host.includes('localhost') ? 'localhost' : '.' + host.split(':')[0];
    
    // Clear all next-auth cookies with the correct domain
    const cookiesToClear = [
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.csrf-token',
      '__Secure-next-auth.callback-url',
      '__Host-next-auth.csrf-token'
    ];
    
    cookiesToClear.forEach(cookieName => {
      // Clear with domain for production
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        domain: host.includes('localhost') ? undefined : domain,
        secure: !host.includes('localhost'),
        httpOnly: true,
        sameSite: 'lax'
      });
      
      // Also clear without domain as fallback
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        secure: !host.includes('localhost'),
        httpOnly: true,
        sameSite: 'lax'
      });
    });
    
    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.redirect(new URL('/wall-e?reason=error_logout', request.url));
  }
}

// Ensure this route is dynamic to prevent caching
export const dynamic = 'force-dynamic';