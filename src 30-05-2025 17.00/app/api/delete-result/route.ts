// app/api/delete-result/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';
import { logSecurityEvent } from '@/lib/security';

const deleteResultLimiter = new EnhancedRateLimiter('delete_result', {
  maxAttempts: 5,
  windowMinutes: 10,
  lockoutMinutes: 20,
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
    const rateLimitResult = await deleteResultLimiter.checkAndLimit(ip);
    if (!rateLimitResult.success) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        path: '/api/delete-result',
        ip,
        userAgent,
        message: 'Delete result rate limit exceeded'
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
      if (rawBody.length > 1024) {
        throw new Error('Request body too large');
      }
      body = JSON.parse(rawBody);
    } catch (error) {
      await deleteResultLimiter.recordAttempt(ip, false);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { orderId } = body;

    if (!orderId) {
      await deleteResultLimiter.recordAttempt(ip, false);
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Validate orderId
    const validation = SecurityValidator.validateAndSanitize(orderId, {
      maxLength: 50,
      checkSQLInjection: true,
      checkXSS: true
    });

    if (!validation.isValid) {
      await deleteResultLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'security_violation',
        path: '/api/delete-result',
        ip,
        userAgent,
        message: 'Security validation failed',
        metadata: { violations: validation.violations }
      });

      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    const sanitizedOrderId = validation.sanitized;

    // Get order and result file info
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('result_file_path, email')
      .eq('id', sanitizedOrderId)
      .single();

    if (orderError || !orderData) {
      await deleteResultLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'delete_result_order_not_found',
        path: '/api/delete-result',
        ip,
        userAgent,
        message: 'Order not found for result deletion',
        metadata: { orderId: sanitizedOrderId }
      });

      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!orderData.result_file_path) {
      await deleteResultLimiter.recordAttempt(ip, true); // Not an error, just no file
      return NextResponse.json(
        { error: 'No result file found for this order' },
        { status: 404 }
      );
    }

    // Validate file path to prevent path traversal
    const pathValidation = SecurityValidator.validateAndSanitize(orderData.result_file_path, {
      checkPathTraversal: true,
      maxLength: 500
    });

    if (!pathValidation.isValid) {
      await logSecurityEvent({
        type: 'path_traversal_attempt',
        path: '/api/delete-result',
        ip,
        userAgent,
        message: 'Path traversal detected in result file path',
        metadata: { 
          orderId: sanitizedOrderId,
          filePath: orderData.result_file_path
        }
      });

      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Delete file from storage with error handling
    const { error: deleteError } = await supabaseAdmin.storage
      .from('documents')
      .remove([orderData.result_file_path]);

    if (deleteError) {
      console.error('[delete-result] Storage deletion error:', deleteError);
      
      // Continue with database update even if file deletion fails
      // The file might already be deleted or path might be invalid
      await logSecurityEvent({
        type: 'storage_delete_warning',
        path: '/api/delete-result',
        ip,
        userAgent,
        message: 'Storage file deletion failed but continuing',
        metadata: { 
          orderId: sanitizedOrderId,
          error: deleteError.message
        }
      });
    }

    // Update order record to remove file reference
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        result_file_path: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', sanitizedOrderId);

    if (updateError) {
      await deleteResultLimiter.recordAttempt(ip, false);
      console.error('[delete-result] Database update error:', updateError);
      
      await logSecurityEvent({
        type: 'delete_result_db_error',
        path: '/api/delete-result',
        ip,
        userAgent,
        message: 'Database update failed during result deletion',
        metadata: { 
          orderId: sanitizedOrderId,
          error: updateError.message
        }
      });

      return NextResponse.json(
        { error: 'Failed to update order record' },
        { status: 500 }
      );
    }

    await deleteResultLimiter.recordAttempt(ip, true);
    
    await logSecurityEvent({
      type: 'result_file_deleted',
      path: '/api/delete-result',
      ip,
      userAgent,
      message: 'Result file successfully deleted',
      metadata: { 
        orderId: sanitizedOrderId,
        filePath: orderData.result_file_path,
        processingTime: Date.now() - startTime
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Result file deleted successfully'
    });

  } catch (error) {
    await deleteResultLimiter.recordAttempt(ip, false);
    console.error('[delete-result] Unhandled server error:', error);
    
    await logSecurityEvent({
      type: 'delete_result_server_error',
      path: '/api/delete-result',
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