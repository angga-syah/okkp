// app/api/validate-download-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/encryption';
import { supabaseAdmin } from '@/lib/sb_admin';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';

// Rate limiter untuk token validation
const tokenValidationLimiter = new EnhancedRateLimiter('token_validation', {
  maxAttempts: 30, // More lenient for token validation
  windowMinutes: 5,
  lockoutMinutes: 10,
  progressiveDelay: false
});

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = forwarded?.split(',')[0] || realIP || 'unknown';
  return clientIP;
}

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);
  let attemptLogged = false;

  try {
    // Rate limiting check
    const rateLimitResult = await tokenValidationLimiter.checkAndLimit(clientIP);
    
    if (!rateLimitResult.success) {
      if (rateLimitResult.isLocked) {
        return NextResponse.json({
          success: false,
          message: 'Too many validation attempts. Please try again later.',
          lockoutDuration: rateLimitResult.lockoutDuration
        }, { status: 429 });
      }
      
      return NextResponse.json({
        success: false,
        message: 'Rate limit exceeded. Please try again later.',
        resetTime: new Date(rateLimitResult.resetTime).toISOString()
      }, { status: 429 });
    }

    // Parse and validate request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      await tokenValidationLimiter.recordAttempt(clientIP, false, { error: 'Invalid JSON' });
      return NextResponse.json({
        success: false,
        message: 'Invalid request format'
      }, { status: 400 });
    }

    const { token } = requestData;
   
    if (!token) {
      await tokenValidationLimiter.recordAttempt(clientIP, false, { error: 'Missing token' });
      return NextResponse.json({
        success: false,
        message: 'Token is required'
      }, { status: 400 });
    }

    // Input validation
    const tokenValidation = SecurityValidator.validateAndSanitize(token, {
      maxLength: 2048,
      checkXSS: true,
      checkSQLInjection: true,
      checkPathTraversal: true
    });

    if (!tokenValidation.isValid) {
      await tokenValidationLimiter.recordAttempt(clientIP, false, { 
        error: 'Invalid token format',
        violations: tokenValidation.violations
      });
      return NextResponse.json({
        success: false,
        message: 'Invalid token format'
      }, { status: 400 });
    }

    attemptLogged = true;
    await tokenValidationLimiter.recordAttempt(clientIP, false, { 
      stage: 'token_received',
      tokenLength: tokenValidation.sanitized.length
    });
   
    // Verify the access token
    let tokenData;
    try {
      tokenData = verifyAccessToken(decodeURIComponent(tokenValidation.sanitized));
    } catch (tokenError) {
      await tokenValidationLimiter.recordAttempt(clientIP, false, { 
        error: 'Token verification failed',
        tokenError: tokenError instanceof Error ? tokenError.message : String(tokenError)
      });
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired download link'
      }, { status: 401 });
    }
   
    if (!tokenData) {
      await tokenValidationLimiter.recordAttempt(clientIP, false, { error: 'Invalid token data' });
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired download link'
      }, { status: 401 });
    }

    // Validate document ID from token
    const documentIdValidation = SecurityValidator.validateAndSanitize(tokenData.documentId, {
      maxLength: 100,
      checkXSS: true,
      checkSQLInjection: true,
      checkPathTraversal: true
    });

    if (!documentIdValidation.isValid) {
      await tokenValidationLimiter.recordAttempt(clientIP, false, { 
        error: 'Invalid document ID in token',
        violations: documentIdValidation.violations
      });
      return NextResponse.json({
        success: false,
        message: 'Invalid document reference'
      }, { status: 400 });
    }
   
    // Get order information with additional validation
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, name, service_name, language, result_file_path, status')
      .eq('id', documentIdValidation.sanitized)
      .single();
     
    if (orderError) {
      await tokenValidationLimiter.recordAttempt(clientIP, false, { 
        error: 'Database query failed',
        documentId: documentIdValidation.sanitized,
        dbError: orderError.message
      });
      return NextResponse.json({
        success: false,
        message: 'Order not found'
      }, { status: 404 });
    }

    if (!orderData) {
      await tokenValidationLimiter.recordAttempt(clientIP, false, { 
        error: 'Order not found',
        documentId: documentIdValidation.sanitized
      });
      return NextResponse.json({
        success: false,
        message: 'Order not found'
      }, { status: 404 });
    }

    // Check if order is completed
    if (orderData.status !== 'completed') {
      await tokenValidationLimiter.recordAttempt(clientIP, false, { 
        error: 'Order not completed',
        documentId: documentIdValidation.sanitized,
        status: orderData.status
      });
      return NextResponse.json({
        success: false,
        message: 'Document not ready for download'
      }, { status: 400 });
    }
   
    // Check if result file exists
    if (!orderData.result_file_path) {
      await tokenValidationLimiter.recordAttempt(clientIP, false, { 
        error: 'No result file',
        documentId: documentIdValidation.sanitized
      });
      return NextResponse.json({
        success: false,
        message: 'Document not found'
      }, { status: 404 });
    }

    // Validate and sanitize order data for response
    const sanitizedOrderInfo = {
      id: SecurityValidator.validateAndSanitize(orderData.id, { maxLength: 100 }).sanitized,
      name: SecurityValidator.validateAndSanitize(orderData.name || '', { 
        maxLength: 255,
        allowHTML: false 
      }).sanitized,
      service_name: SecurityValidator.validateAndSanitize(orderData.service_name || '', { 
        maxLength: 255,
        allowHTML: false 
      }).sanitized,
      language: ['en', 'id'].includes(orderData.language) ? orderData.language : 'id'
    };

    // Log successful validation
    await supabaseAdmin
      .from('security_logs')
      .insert({
        event_type: 'token_validated',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || 'unknown',
        message: `Download token validated for document: ${documentIdValidation.sanitized}`,
        metadata: { 
          documentId: documentIdValidation.sanitized,
          serviceName: sanitizedOrderInfo.service_name,
          isAdmin: tokenData.isAdmin || false
        },
        created_at: new Date().toISOString()
      })
      .then(() => {}) // Ignore logging errors
      .catch(() => {});

    // Record successful attempt
    await tokenValidationLimiter.recordAttempt(clientIP, true, { 
      documentId: documentIdValidation.sanitized,
      serviceName: sanitizedOrderInfo.service_name
    });
   
    return NextResponse.json({
      success: true,
      orderInfo: sanitizedOrderInfo
    });
   
  } catch (error) {
    console.error('Token validation error:', error);
    
    if (!attemptLogged) {
      await tokenValidationLimiter.recordAttempt(clientIP, false, { 
        error: 'Server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Server error'
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';