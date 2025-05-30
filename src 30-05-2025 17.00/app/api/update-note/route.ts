// app/api/update-note/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';
import { logSecurityEvent } from '@/lib/security';

const updateNoteLimiter = new EnhancedRateLimiter('update_note', {
  maxAttempts: 10,
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
    // Rate limiting
    const rateLimitResult = await updateNoteLimiter.checkAndLimit(ip);
    if (!rateLimitResult.success) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        path: '/api/update-note',
        ip,
        userAgent,
        message: 'Update note rate limit exceeded'
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
      if (rawBody.length > 20480) { // 20KB limit for notes
        throw new Error('Request body too large');
      }
      body = JSON.parse(rawBody);
    } catch (error) {
      await updateNoteLimiter.recordAttempt(ip, false);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

const { orderId, note } = body;

    if (!orderId) {
      await updateNoteLimiter.recordAttempt(ip, false);
      return NextResponse.json(
        { error: 'Order ID is required' },
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
      await updateNoteLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'security_violation',
        path: '/api/update-note',
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

    // Validate note (can be empty for clearing notes)
    let sanitizedNote = '';
    if (note !== null && note !== undefined) {
      const noteValidation = SecurityValidator.validateAndSanitize(String(note), {
        maxLength: 10000, // 10KB limit for notes
        checkSQLInjection: true,
        checkXSS: true,
        allowHTML: false
      });

      if (!noteValidation.isValid) {
        await updateNoteLimiter.recordAttempt(ip, false);
        await logSecurityEvent({
          type: 'security_violation',
          path: '/api/update-note',
          ip,
          userAgent,
          message: 'Security validation failed for note content',
          metadata: { violations: noteValidation.violations }
        });

        return NextResponse.json(
          { error: 'Invalid note content' },
          { status: 400 }
        );
      }

      sanitizedNote = noteValidation.sanitized;
    }

    const sanitizedOrderId = orderIdValidation.sanitized;

    // Verify order exists
    const { data: existingOrder, error: selectError } = await supabaseAdmin
      .from('orders')
      .select('id, note')
      .eq('id', sanitizedOrderId)
      .single();

    if (selectError || !existingOrder) {
      await updateNoteLimiter.recordAttempt(ip, false);
      await logSecurityEvent({
        type: 'update_note_order_not_found',
        path: '/api/update-note',
        ip,
        userAgent,
        message: 'Order not found for note update',
        metadata: { orderId: sanitizedOrderId }
      });

      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update the note
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        note: sanitizedNote,
        updated_at: new Date().toISOString()
      })
      .eq('id', sanitizedOrderId);

    if (updateError) {
      await updateNoteLimiter.recordAttempt(ip, false);
      console.error('[update-note] Error updating note:', updateError);
      
      await logSecurityEvent({
        type: 'update_note_db_error',
        path: '/api/update-note',
        ip,
        userAgent,
        message: 'Database error during note update',
        metadata: { 
          orderId: sanitizedOrderId,
          error: updateError.message
        }
      });

      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }

    await updateNoteLimiter.recordAttempt(ip, true);
    
    await logSecurityEvent({
      type: 'note_updated',
      path: '/api/update-note',
      ip,
      userAgent,
      message: 'Note successfully updated',
      metadata: { 
        orderId: sanitizedOrderId,
        noteLength: sanitizedNote.length,
        processingTime: Date.now() - startTime
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Note updated successfully'
    });

  } catch (error) {
    await updateNoteLimiter.recordAttempt(ip, false);
    console.error('[update-note] Unhandled server error:', error);
    
    await logSecurityEvent({
      type: 'update_note_server_error',
      path: '/api/update-note',
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