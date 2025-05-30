// app/api/save-revision-request/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { updateOrderStatus } from '@/lib/server-order';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';
import { logSecurityEvent } from '@/lib/security';

const revisionLimiter = new EnhancedRateLimiter('revision_request', {
  maxAttempts: 5,
  windowMinutes: 30,
  lockoutMinutes: 60,
  progressiveDelay: true
});

function getClientIP(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp.trim();
  }
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  return 'unknown';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Rate limiting
    const rateLimitResult = await revisionLimiter.checkAndLimit(ip);
    if (!rateLimitResult.success) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        path: '/api/save-revision-request',
        ip,
        userAgent,
        message: 'Revision request rate limit exceeded'
      });

      return NextResponse.json(
        { 
          error: rateLimitResult.isLocked 
            ? 'Account temporarily locked' 
            : 'Too many revision requests',
          retryAfter: rateLimitResult.lockoutDuration || rateLimitResult.nextAttemptDelay
        },
        { status: 429 }
      );
    }

    // Parse and validate request
    let body;
    try {
      const rawBody = await request.text();
      if (rawBody.length > 10240) { // 10KB limit for revision messages
        throw new Error('Request body too large');
      }
      body = JSON.parse(rawBody);
    } catch (error) {
      await revisionLimiter.recordAttempt(ip, false);
      
      // 🔧 FIXED: Better error logging for debugging
      console.error('[save-revision-request] JSON parsing error:', {
        error: error instanceof Error ? error.message : String(error),
        ip,
        userAgent,
        contentType: request.headers.get('content-type'),
        bodyLength: request.headers.get('content-length')
      });
      
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          message: 'Request body must be valid JSON'
        },
        { status: 400 }
      );
    }

    // 🔧 FIXED: Enhanced input validation
    const { orderId, revisionMessage } = body;

    if (!orderId) {
      await revisionLimiter.recordAttempt(ip, false);
      console.error('[save-revision-request] Missing orderId:', { body, ip });
      
      return NextResponse.json(
        { 
          error: 'Missing required field',
          message: 'Order ID is required'
        },
        { status: 400 }
      );
    }

    if (!revisionMessage) {
      await revisionLimiter.recordAttempt(ip, false);
      console.error('[save-revision-request] Missing revisionMessage:', { body, ip });
      
      return NextResponse.json(
        { 
          error: 'Missing required field',
          message: 'Revision message is required'
        },
        { status: 400 }
      );
    }

    // 🔧 FIXED: Type validation
    if (typeof orderId !== 'string') {
      await revisionLimiter.recordAttempt(ip, false);
      console.error('[save-revision-request] Invalid orderId type:', { orderId, type: typeof orderId, ip });
      
      return NextResponse.json(
        { 
          error: 'Invalid data type',
          message: 'Order ID must be a string'
        },
        { status: 400 }
      );
    }

    if (typeof revisionMessage !== 'string') {
      await revisionLimiter.recordAttempt(ip, false);
      console.error('[save-revision-request] Invalid revisionMessage type:', { 
        revisionMessage: typeof revisionMessage, 
        type: typeof revisionMessage, 
        ip 
      });
      
      return NextResponse.json(
        { 
          error: 'Invalid data type',
          message: 'Revision message must be a string'
        },
        { status: 400 }
      );
    }

    // 🔧 FIXED: Enhanced validation with better error messages
    const orderIdValidation = SecurityValidator.validateAndSanitize(orderId, {
      maxLength: 50,
      checkSQLInjection: true,
      checkXSS: true
    });

    if (!orderIdValidation.isValid) {
      await revisionLimiter.recordAttempt(ip, false);
      console.error('[save-revision-request] OrderId validation failed:', { 
        orderId, 
        violations: orderIdValidation.violations,
        ip 
      });
      
      await logSecurityEvent({
        type: 'security_violation',
        path: '/api/save-revision-request',
        ip,
        userAgent,
        message: 'Security validation failed for orderId',
        metadata: { violations: orderIdValidation.violations }
      });

      return NextResponse.json(
        { 
          error: 'Invalid order ID format',
          message: 'Order ID contains invalid characters'
        },
        { status: 400 }
      );
    }

    // Validate revision message
    const messageValidation = SecurityValidator.validateAndSanitize(revisionMessage, {
      maxLength: 5000, // 🔧 FIXED: Reduced from 50000 to 5000 for reasonable limit
      checkSQLInjection: true,
      checkXSS: true,
      allowHTML: false
    });

    if (!messageValidation.isValid) {
      await revisionLimiter.recordAttempt(ip, false);
      console.error('[save-revision-request] Message validation failed:', { 
        messageLength: revisionMessage.length,
        violations: messageValidation.violations,
        ip 
      });
      
      await logSecurityEvent({
        type: 'security_violation',
        path: '/api/save-revision-request',
        ip,
        userAgent,
        message: 'Security validation failed for revision message',
        metadata: { violations: messageValidation.violations }
      });

      return NextResponse.json(
        { 
          error: 'Invalid revision message content',
          message: 'Revision message contains invalid content or is too long'
        },
        { status: 400 }
      );
    }

    const sanitizedOrderId = orderIdValidation.sanitized;
    const sanitizedMessage = messageValidation.sanitized;

    // 🔧 FIXED: Enhanced order validation
    console.log('[save-revision-request] Processing request:', {
      orderId: sanitizedOrderId,
      messageLength: sanitizedMessage.length,
      ip
    });

    // Get order data
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('email, name, service_name, language, status')
      .eq('id', sanitizedOrderId)
      .single();

    if (orderError) {
      await revisionLimiter.recordAttempt(ip, false);
      console.error('[save-revision-request] Database error:', {
        error: orderError,
        orderId: sanitizedOrderId,
        ip
      });
      
      await logSecurityEvent({
        type: 'revision_order_error',
        path: '/api/save-revision-request',
        ip,
        userAgent,
        message: 'Database error while fetching order',
        metadata: { 
          orderId: sanitizedOrderId,
          error: orderError.message
        }
      });

      return NextResponse.json(
        { 
          error: 'Database error',
          message: 'Failed to fetch order data'
        },
        { status: 500 }
      );
    }

    if (!orderData) {
      await revisionLimiter.recordAttempt(ip, false);
      console.error('[save-revision-request] Order not found:', {
        orderId: sanitizedOrderId,
        ip
      });
      
      await logSecurityEvent({
        type: 'revision_order_not_found',
        path: '/api/save-revision-request',
        ip,
        userAgent,
        message: 'Order not found for revision request',
        metadata: { orderId: sanitizedOrderId }
      });

      return NextResponse.json(
        { 
          error: 'Order not found',
          message: 'The specified order does not exist'
        },
        { status: 404 }
      );
    }

    // Check if order is in a valid state for revision
    const validStatesForRevision = ['completed', 'delivered', 'pending_document', 'document_verification'];
    if (!validStatesForRevision.includes(orderData.status)) {
      console.error('[save-revision-request] Invalid state for revision:', {
        orderId: sanitizedOrderId,
        currentStatus: orderData.status,
        validStates: validStatesForRevision,
        ip
      });
      
      await logSecurityEvent({
        type: 'invalid_revision_state',
        path: '/api/save-revision-request',
        ip,
        userAgent,
        message: 'Revision requested for order in invalid state',
        metadata: { 
          orderId: sanitizedOrderId,
          currentStatus: orderData.status
        }
      });

      return NextResponse.json(
        { 
          error: 'Invalid order state',
          message: `Order with status '${orderData.status}' cannot be revised`
        },
        { status: 400 }
      );
    }

    // 🔧 FIXED: Enhanced database transaction
    try {
      // Update status to pending_document
      const result = await updateOrderStatus(
        supabaseAdmin,
        sanitizedOrderId,
        'pending_document'
      );

      if (!result.success) {
        await revisionLimiter.recordAttempt(ip, false);
        console.error('[save-revision-request] Status update failed:', {
          orderId: sanitizedOrderId,
          error: result.error,
          ip
        });
        
        return NextResponse.json(
          { 
            error: 'Failed to update order status', 
            message: result.error?.message || 'Status update failed'
          },
          { status: 500 }
        );
      }

      // Save revision message
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          revision_message: sanitizedMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', sanitizedOrderId);

      if (updateError) {
        await revisionLimiter.recordAttempt(ip, false);
        console.error('[save-revision-request] Message save failed:', {
          orderId: sanitizedOrderId,
          error: updateError,
          ip
        });
        
        return NextResponse.json(
          { 
            error: 'Failed to save revision message', 
            message: updateError.message || 'Database update failed'
          },
          { status: 500 }
        );
      }

    } catch (dbError) {
      await revisionLimiter.recordAttempt(ip, false);
      console.error('[save-revision-request] Database transaction failed:', {
        orderId: sanitizedOrderId,
        error: dbError,
        ip
      });
      
      return NextResponse.json(
        { 
          error: 'Database transaction failed',
          message: 'Failed to save revision request'
        },
        { status: 500 }
      );
    }

    // Send email notification (non-blocking)
    try {
      const emailResponse = await fetch(new URL('/api/revisi-document', request.url).toString(), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Internal-Request'
        },
        body: JSON.stringify({
          orderId: sanitizedOrderId,
          revisionMessage: sanitizedMessage
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!emailResponse.ok) {
        console.error('[save-revision-request] Failed to send revision email:', {
          status: emailResponse.status,
          orderId: sanitizedOrderId
        });
      } else {
        console.log('[save-revision-request] Revision email sent successfully:', {
          orderId: sanitizedOrderId
        });
      }
    } catch (emailError) {
      console.error('[save-revision-request] Error sending revision email:', {
        error: emailError,
        orderId: sanitizedOrderId
      });
      // Don't fail the request if email fails
    }

    await revisionLimiter.recordAttempt(ip, true);
    
    await logSecurityEvent({
      type: 'revision_request_saved',
      path: '/api/save-revision-request',
      ip,
      userAgent,
      message: 'Revision request successfully saved',
      metadata: { 
        orderId: sanitizedOrderId,
        messageLength: sanitizedMessage.length,
        processingTime: Date.now() - startTime
      }
    });

    console.log('[save-revision-request] Request processed successfully:', {
      orderId: sanitizedOrderId,
      processingTime: Date.now() - startTime,
      ip
    });

    return NextResponse.json({
      success: true,
      message: 'Revision request saved and email sent successfully'
    });

  } catch (error) {
    await revisionLimiter.recordAttempt(ip, false);
    console.error('[save-revision-request] Unhandled server error:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      ip,
      userAgent
    });
    
    await logSecurityEvent({
      type: 'revision_request_server_error',
      path: '/api/save-revision-request',
      ip,
      userAgent,
      message: 'Unhandled server error',
      metadata: { 
        error: error instanceof Error ? error.message : String(error)
      }
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    );
  }
}