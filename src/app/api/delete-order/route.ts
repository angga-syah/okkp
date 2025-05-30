// app/api/delete-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';
import { logSecurityEvent } from '@/lib/security';

// Rate limiter for delete operations (more restrictive)
const deleteOrderLimiter = new EnhancedRateLimiter('delete_order', {
  maxAttempts: 3,
  windowMinutes: 15,
  lockoutMinutes: 30,
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
    // Rate limiting check
    const rateLimitResult = await deleteOrderLimiter.checkAndLimit(ip);
    if (!rateLimitResult.success) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        path: '/api/delete-order',
        ip,
        userAgent,
        message: 'Delete order rate limit exceeded',
        metadata: { 
          remaining: rateLimitResult.remaining,
          isLocked: rateLimitResult.isLocked,
          lockoutDuration: rateLimitResult.lockoutDuration
        }
      });

      return NextResponse.json(
        { 
          error: rateLimitResult.isLocked 
            ? 'Account temporarily locked due to too many requests' 
            : 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.lockoutDuration || rateLimitResult.nextAttemptDelay
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.lockoutDuration || rateLimitResult.nextAttemptDelay || 60)
          }
        }
      );
    }

    // Parse and validate request body with size limit
    let body;
    try {
      const rawBody = await request.text();
      if (rawBody.length > 1024) { // 1KB limit for delete requests
        throw new Error('Request body too large');
      }
      body = JSON.parse(rawBody);
    } catch (error) {
      await deleteOrderLimiter.recordAttempt(ip, false, { error: 'Invalid JSON' });
      await logSecurityEvent({
        type: 'invalid_request_format',
        path: '/api/delete-order',
        ip,
        userAgent,
        message: 'Invalid JSON in delete order request'
      });
      
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { orderId } = body;

    // Validate orderId
    if (!orderId) {
      await deleteOrderLimiter.recordAttempt(ip, false, { error: 'Missing orderId' });
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Validate and sanitize orderId
    const validation = SecurityValidator.validateAndSanitize(orderId, {
      maxLength: 50,
      checkSQLInjection: true,
      checkXSS: true,
      checkPathTraversal: true
    });

    if (!validation.isValid) {
      await deleteOrderLimiter.recordAttempt(ip, false, { 
        error: 'Security violation',
        violations: validation.violations
      });
      
      await logSecurityEvent({
        type: 'security_violation',
        path: '/api/delete-order',
        ip,
        userAgent,
        message: 'Security validation failed for delete order',
        metadata: { 
          violations: validation.violations,
          originalInput: orderId.substring(0, 100) // Log first 100 chars only
        }
      });

      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    const sanitizedOrderId = validation.sanitized;

    // Verify order exists and get additional info for logging
    const { data: orderData, error: selectError } = await supabaseAdmin
      .from('orders')
      .select('id, email, created_at')
      .eq('id', sanitizedOrderId)
      .single();

    if (selectError || !orderData) {
      await deleteOrderLimiter.recordAttempt(ip, false, { error: 'Order not found' });
      
      await logSecurityEvent({
        type: 'delete_attempt_nonexistent',
        path: '/api/delete-order',
        ip,
        userAgent,
        message: 'Attempt to delete non-existent order',
        metadata: { orderId: sanitizedOrderId }
      });

      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Additional security check: prevent deletion of old orders (potential abuse)
    const orderCreatedAt = new Date(orderData.created_at);
    const daysSinceCreation = (Date.now() - orderCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation > 90) { // 90 days limit
      await logSecurityEvent({
        type: 'delete_old_order_attempt',
        path: '/api/delete-order',
        ip,
        userAgent,
        message: 'Attempt to delete order older than 90 days',
        metadata: { 
          orderId: sanitizedOrderId,
          daysSinceCreation: Math.round(daysSinceCreation)
        }
      });

      return NextResponse.json(
        { error: 'Cannot delete orders older than 90 days' },
        { status: 403 }
      );
    }

    // Perform the deletion with transaction safety
    const { error: deleteError } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', sanitizedOrderId);

    if (deleteError) {
      await deleteOrderLimiter.recordAttempt(ip, false, { error: deleteError.message });
      
      console.error('[delete-order] Error deleting order:', deleteError);
      await logSecurityEvent({
        type: 'delete_order_db_error',
        path: '/api/delete-order',
        ip,
        userAgent,
        message: 'Database error during order deletion',
        metadata: { 
          orderId: sanitizedOrderId,
          error: deleteError.message
        }
      });

      return NextResponse.json(
        { error: 'Failed to delete order' },
        { status: 500 }
      );
    }

    // Record successful attempt
    await deleteOrderLimiter.recordAttempt(ip, true);
    
    // Log successful deletion
    await logSecurityEvent({
      type: 'order_deleted',
      path: '/api/delete-order',
      ip,
      userAgent,
      message: 'Order successfully deleted',
      metadata: { 
        orderId: sanitizedOrderId,
        customerEmail: orderData.email,
        processingTime: Date.now() - startTime
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully'
    }, {
      headers: {
        'X-Response-Time': String(Date.now() - startTime)
      }
    });

  } catch (error) {
    await deleteOrderLimiter.recordAttempt(ip, false, { 
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : String(error)
    });

    console.error('[delete-order] Unhandled server error:', error);
    await logSecurityEvent({
      type: 'delete_order_server_error',
      path: '/api/delete-order',
      ip,
      userAgent,
      message: 'Unhandled server error in delete order',
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