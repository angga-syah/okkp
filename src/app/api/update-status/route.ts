// app/api/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { updateOrderStatus } from '@/lib/server-order';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';
import { logSecurityEvent } from '@/lib/security';

const updateStatusLimiter = new EnhancedRateLimiter('update_status', {
  maxAttempts: 10,
  windowMinutes: 5,
  lockoutMinutes: 15,
  progressiveDelay: true
});

// Define valid status transitions to prevent invalid state changes
const VALID_STATUSES = [
  'pending',
  'pending_document',
  'in_progress',
  'completed',
  'delivered',
  'cancelled',
  'revision_requested'
] as const;

type ValidStatus = typeof VALID_STATUSES[number];

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
    const rateLimitResult = await updateStatusLimiter.checkAndLimit(ip);
    if (!rateLimitResult.success) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        path: '/api/update-status',
        ip,
        userAgent,
        message: 'Update status rate limit exceeded'
      });

      return NextResponse.json(
        { 
          error: rateLimitResult.isLocked 
            ? 'Account temporarily locked' 
            : 'Too many requests',
          retryAfter: rateLimitResult.lockoutDuration || rateLimitResult.nextAttemptDelay
        },
        { status: 429 }
      );
    }

    // Parse and validate request
    let body;
    try {
      const rawBody = await request.text();
      if (rawBody.length > 1024) { // 1KB limit for status updates
        throw new Error('Request body too large');
      }
      body = JSON.parse(rawBody);
    } catch (error) {
      await updateStatusLimiter.recordAttempt(ip, false);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { orderId, newStatus } = body;

    if (!orderId || !newStatus) {
      await updateStatusLimiter.recordAttempt(ip, false);
      return NextResponse.json(
        { error: 'Order ID and new status are required' },
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
      await updateStatusLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'security_violation',
        path: '/api/update-status',
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

    // Validate newStatus
    const statusValidation = SecurityValidator.validateAndSanitize(newStatus, {
      maxLength: 50,
      checkSQLInjection: true,
      checkXSS: true
    });

    if (!statusValidation.isValid || !VALID_STATUSES.includes(statusValidation.sanitized as ValidStatus)) {
      await updateStatusLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'invalid_status_update',
        path: '/api/update-status',
        ip,
        userAgent,
        message: 'Invalid status value provided',
        metadata: { 
          orderId: orderIdValidation.sanitized,
          attemptedStatus: newStatus,
          violations: statusValidation.violations
        }
      });

      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    const sanitizedOrderId = orderIdValidation.sanitized;
    const sanitizedStatus = statusValidation.sanitized as ValidStatus;

    // Get current order status for validation
    const { data: currentOrder, error: selectError } = await supabaseAdmin
      .from('orders')
      .select('id, status, created_at')
      .eq('id', sanitizedOrderId)
      .single();

    if (selectError || !currentOrder) {
      await updateStatusLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'status_update_order_not_found',
        path: '/api/update-status',
        ip,
        userAgent,
        message: 'Order not found for status update',
        metadata: { orderId: sanitizedOrderId }
      });

      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Validate status transition (basic validation)
    if (currentOrder.status === sanitizedStatus) {
      // No change needed
      await updateStatusLimiter.recordAttempt(ip, true);
      return NextResponse.json({
        success: true,
        message: 'Status already set to requested value'
      });
    }

    // Prevent certain invalid transitions
    if (currentOrder.status === 'cancelled' && sanitizedStatus !== 'pending') {
      await logSecurityEvent({
        type: 'invalid_status_transition',
        path: '/api/update-status',
        ip,
        userAgent,
        message: 'Attempted invalid status transition from cancelled',
        metadata: { 
          orderId: sanitizedOrderId,
          fromStatus: currentOrder.status,
          toStatus: sanitizedStatus
        }
      });

      return NextResponse.json(
        { error: 'Cannot change status from cancelled to this state' },
        { status: 400 }
      );
    }

    // Use the existing updateOrderStatus function - cast to the expected type
    const result = await updateOrderStatus(
      supabaseAdmin,
      sanitizedOrderId,
      sanitizedStatus as any // Type assertion since we've validated it's a valid status
    );

    if (!result.success) {
      await updateStatusLimiter.recordAttempt(ip, false);
      console.error('[update-status] Status update failed:', result.error);
      
      await logSecurityEvent({
        type: 'status_update_db_error',
        path: '/api/update-status',
        ip,
        userAgent,
        message: 'Database error during status update',
        metadata: { 
          orderId: sanitizedOrderId,
          fromStatus: currentOrder.status,
          toStatus: sanitizedStatus,
          error: result.error?.message
        }
      });

      return NextResponse.json(
        { error: 'Failed to update status', details: result.error?.message },
        { status: 500 }
      );
    }

    await updateStatusLimiter.recordAttempt(ip, true);
    
    await logSecurityEvent({
      type: 'status_updated',
      path: '/api/update-status',
      ip,
      userAgent,
      message: 'Order status successfully updated',
      metadata: { 
        orderId: sanitizedOrderId,
        fromStatus: currentOrder.status,
        toStatus: sanitizedStatus,
        processingTime: Date.now() - startTime
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Status updated successfully'
    });

  } catch (error) {
    await updateStatusLimiter.recordAttempt(ip, false);
    console.error('[update-status] Unhandled server error:', error);
    
    await logSecurityEvent({
      type: 'update_status_server_error',
      path: '/api/update-status',
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