// app/api/save-revision-request/route.ts
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
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { orderId, revisionMessage } = body;

    if (!orderId || !revisionMessage) {
      await revisionLimiter.recordAttempt(ip, false);
      return NextResponse.json(
        { error: 'Order ID and revision message are required' },
        { status: 400 }
      );
    }

    // Validate orderId
    const orderIdValidation = SecurityValidator.validateAndSanitize(orderId, {
      maxLength: 50,
      checkSQLInjection: true,
      checkXSS: true
    });

    if (!orderIdValidation.isValid) {
      await revisionLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'security_violation',
        path: '/api/save-revision-request',
        ip,
        userAgent,
        message: 'Security validation failed for orderId',
        metadata: { violations: orderIdValidation.violations }
      });

      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    // Validate revision message
    const messageValidation = SecurityValidator.validateAndSanitize(revisionMessage, {
      maxLength: 50000, // 5KB limit for revision messages
      checkSQLInjection: true,
      checkXSS: true,
      allowHTML: false
    });

    if (!messageValidation.isValid) {
      await revisionLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'security_violation',
        path: '/api/save-revision-request',
        ip,
        userAgent,
        message: 'Security validation failed for revision message',
        metadata: { violations: messageValidation.violations }
      });

      return NextResponse.json(
        { error: 'Invalid revision message content' },
        { status: 400 }
      );
    }

    const sanitizedOrderId = orderIdValidation.sanitized;
    const sanitizedMessage = messageValidation.sanitized;

    // Get order data
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('email, name, service_name, language, status')
      .eq('id', sanitizedOrderId)
      .single();

    if (orderError || !orderData) {
      await revisionLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'revision_order_not_found',
        path: '/api/save-revision-request',
        ip,
        userAgent,
        message: 'Order not found for revision request',
        metadata: { orderId: sanitizedOrderId }
      });

      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order is in a valid state for revision
    const validStatesForRevision = ['completed', 'delivered', 'pending_document'];
    if (!validStatesForRevision.includes(orderData.status)) {
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
        { error: 'Order is not in a valid state for revision' },
        { status: 400 }
      );
    }

    // Update status to pending_document
    const result = await updateOrderStatus(
      supabaseAdmin,
      sanitizedOrderId,
      'pending_document'
    );

    if (!result.success) {
      await revisionLimiter.recordAttempt(ip, false);
      console.error('[save-revision-request] Status update failed:', result.error);
      
      return NextResponse.json(
        { error: 'Failed to update order status', details: result.error?.message },
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
      console.error('[save-revision-request] Message save failed:', updateError);
      
      return NextResponse.json(
        { error: 'Failed to save revision message', details: updateError.message },
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
        console.error('Failed to send revision email:', emailResponse.status);
      }
    } catch (emailError) {
      console.error('Error sending revision email:', emailError);
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

    return NextResponse.json({
      success: true,
      message: 'Revision request saved and email sent successfully'
    });

  } catch (error) {
    await revisionLimiter.recordAttempt(ip, false);
    console.error('[save-revision-request] Unhandled server error:', error);
    
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}