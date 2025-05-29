// app/api/update-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';
import { logSecurityEvent } from '@/lib/security';

const updateOrderLimiter = new EnhancedRateLimiter('update_order', {
  maxAttempts: 8,
  windowMinutes: 10,
  lockoutMinutes: 20,
  progressiveDelay: true
});

// Define allowed fields for update to prevent mass assignment
const ALLOWED_UPDATE_FIELDS = [
  'status',
  'service_name',
  'language',
  'urgency',
  'note',
  'revision_message',
  'result_file_path',
  'payment_status',
  'price'
];

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
    const rateLimitResult = await updateOrderLimiter.checkAndLimit(ip);
    if (!rateLimitResult.success) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        path: '/api/update-order',
        ip,
        userAgent,
        message: 'Update order rate limit exceeded'
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
      if (rawBody.length > 51200) { // 50KB limit for order updates
        throw new Error('Request body too large');
      }
      body = JSON.parse(rawBody);
    } catch (error) {
      await updateOrderLimiter.recordAttempt(ip, false);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { orderId, data } = body;

    if (!orderId || !data || typeof data !== 'object') {
      await updateOrderLimiter.recordAttempt(ip, false);
      return NextResponse.json(
        { error: 'Order ID and update data are required' },
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
      await updateOrderLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'security_violation',
        path: '/api/update-order',
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

    const sanitizedOrderId = orderIdValidation.sanitized;

    // Filter and validate update data
    const sanitizedData: Record<string, any> = {};
    const violations: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      // Check if field is allowed
      if (!ALLOWED_UPDATE_FIELDS.includes(key)) {
        violations.push(`Field '${key}' is not allowed for update`);
        continue;
      }

      // Skip null/undefined values
      if (value === null || value === undefined) {
        sanitizedData[key] = value;
        continue;
      }

      // Validate string fields
      if (typeof value === 'string') {
        const fieldValidation = SecurityValidator.validateAndSanitize(value, {
          maxLength: key === 'note' || key === 'revision_message' ? 10000 : 1000,
          checkSQLInjection: true,
          checkXSS: true,
          allowHTML: false
        });

        if (!fieldValidation.isValid) {
          violations.push(`Invalid content in field '${key}': ${fieldValidation.violations.join(', ')}`);
          continue;
        }

        sanitizedData[key] = fieldValidation.sanitized;
      } else if (typeof value === 'number') {
        // Validate numeric fields
        if (!isFinite(value) || value < 0) {
          violations.push(`Invalid numeric value in field '${key}'`);
          continue;
        }
        sanitizedData[key] = value;
      } else if (typeof value === 'boolean') {
        sanitizedData[key] = value;
      } else {
        violations.push(`Unsupported data type for field '${key}'`);
      }
    }

    if (violations.length > 0) {
      await updateOrderLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'security_violation',
        path: '/api/update-order',
        ip,
        userAgent,
        message: 'Security validation failed for update data',
        metadata: { 
          violations,
          orderId: sanitizedOrderId,
          attemptedFields: Object.keys(data)
        }
      });

      return NextResponse.json(
        { error: 'Invalid update data', details: violations },
        { status: 400 }
      );
    }

    // Check if there's actually data to update
    if (Object.keys(sanitizedData).length === 0) {
      await updateOrderLimiter.recordAttempt(ip, false);
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Verify order exists
    const { data: existingOrder, error: selectError } = await supabaseAdmin
      .from('orders')
      .select('id, status, created_at')
      .eq('id', sanitizedOrderId)
      .single();

    if (selectError || !existingOrder) {
      await updateOrderLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'update_order_not_found',
        path: '/api/update-order',
        ip,
        userAgent,
        message: 'Order not found for update',
        metadata: { orderId: sanitizedOrderId }
      });

      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Add updated_at timestamp
    sanitizedData.updated_at = new Date().toISOString();

    // Perform the update
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(sanitizedData)
      .eq('id', sanitizedOrderId);

    if (updateError) {
      await updateOrderLimiter.recordAttempt(ip, false);
      console.error('[update-order] Error updating order:', updateError);
      
      await logSecurityEvent({
        type: 'update_order_db_error',
        path: '/api/update-order',
        ip,
        userAgent,
        message: 'Database error during order update',
        metadata: { 
          orderId: sanitizedOrderId,
          error: updateError.message,
          updateFields: Object.keys(sanitizedData)
        }
      });

      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    await updateOrderLimiter.recordAttempt(ip, true);
    
    await logSecurityEvent({
      type: 'order_updated',
      path: '/api/update-order',
      ip,
      userAgent,
      message: 'Order successfully updated',
      metadata: { 
        orderId: sanitizedOrderId,
        updatedFields: Object.keys(sanitizedData),
        processingTime: Date.now() - startTime
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully'
    });

  } catch (error) {
    await updateOrderLimiter.recordAttempt(ip, false);
    console.error('[update-order] Unhandled server error:', error);
    
    await logSecurityEvent({
      type: 'update_order_server_error',
      path: '/api/update-order',
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