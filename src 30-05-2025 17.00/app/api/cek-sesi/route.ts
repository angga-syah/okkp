import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  try {
    // Get the auth token directly to check if it exists and is valid
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
    
    // Check if token exists and hasn't expired
    const isLoggedIn = !!token;
    
    // If token exists, validate it hasn't expired
    if (isLoggedIn && token.lastVerified) {
      const tokenLastVerified = token.lastVerified as number;
      const TOKEN_FRESHNESS_LIMIT = 30 * 60 * 1000; // 30 minutes in milliseconds
      
      // If token is too old, consider not logged in
      if (Date.now() - tokenLastVerified > TOKEN_FRESHNESS_LIMIT) {
        return NextResponse.json({ isLoggedIn: false, reason: 'token_expired' });
      }
    }
   
    // Add cache control headers to ensure response isn't cached
    const response = NextResponse.json({ isLoggedIn });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Session check error:', error);
    
    // Return not logged in on error, with error details in dev mode
    const response = NextResponse.json({ 
      isLoggedIn: false, 
      reason: 'error',
      ...(process.env.NODE_ENV === 'development' ? { 
        error: error instanceof Error ? error.message : String(error) 
      } : {})
    }, { status: 500 });
    
    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }
}

// Ensure this endpoint is never cached
export const dynamic = 'force-dynamic';