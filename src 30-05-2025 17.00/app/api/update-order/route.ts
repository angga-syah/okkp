// app/api/update-order/route.ts
// Balanced version with reasonable security
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';

// Define allowed fields based on your database schema
const ALLOWED_UPDATE_FIELDS = [
  'email',
  'name',
  'service_name'
];

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIp) return realIp.trim();
  if (cfConnectingIp) return cfConnectingIp.trim();
  
  return 'unknown';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Parse request body with size limit
    const rawBody = await request.text();
    if (rawBody.length > 100000) { // 100KB limit
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 400 }
      );
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      return NextResponse.json(
        { error: 'Invalid JSON format', details: errorMessage },
        { status: 400 }
      );
    }

    const { orderId, data } = body;

    // Basic validation
    if (!orderId || !data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Order ID and update data are required' },
        { status: 400 }
      );
    }

    // Validate orderId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    // Filter allowed fields and basic validation
    const sanitizedData: Record<string, any> = {};
    const rejectedFields: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      // Check if field is allowed
      if (!ALLOWED_UPDATE_FIELDS.includes(key)) {
        rejectedFields.push(key);
        continue;
      }

      // Basic validation by field type
      if (value === null || value === undefined) {
        sanitizedData[key] = value;
      } else if (typeof value === 'string') {
        // Length limits based on field
        let maxLength = 1000;
        if (key === 'note' || key === 'revision_message') maxLength = 10000;
        if (key === 'email') maxLength = 320;
        if (key === 'language') maxLength = 10;
        if (key === 'result_access_code') maxLength = 10;
        if (key === 'download_password') maxLength = 255;

        if (value.length > maxLength) {
          return NextResponse.json(
            { error: `Field '${key}' exceeds maximum length of ${maxLength}` },
            { status: 400 }
          );
        }

        // Basic security: reject obvious script injection
        if (/<script|javascript:|on\w+\s*=/i.test(value)) {
          return NextResponse.json(
            { error: `Field '${key}' contains potentially dangerous content` },
            { status: 400 }
          );
        }

        sanitizedData[key] = value.trim();
      } else if (typeof value === 'number') {
        if (!isFinite(value)) {
          return NextResponse.json(
            { error: `Invalid numeric value in field '${key}'` },
            { status: 400 }
          );
        }
        sanitizedData[key] = value;
      } else if (typeof value === 'boolean') {
        sanitizedData[key] = value;
      } else {
        return NextResponse.json(
          { error: `Unsupported data type for field '${key}'` },
          { status: 400 }
        );
      }
    }

    // Log rejected fields if any (for debugging)
    if (rejectedFields.length > 0) {
      console.log(`[update-order] Rejected fields: ${rejectedFields.join(', ')}`);
    }

    // Check if there's data to update
    if (Object.keys(sanitizedData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Verify order exists
    const { data: existingOrder, error: selectError } = await supabaseAdmin
      .from('orders')
      .select('id, status, created_at')
      .eq('id', orderId)
      .single();

    if (selectError || !existingOrder) {
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
      .eq('id', orderId);

    if (updateError) {
      console.error('[update-order] Database error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order', details: updateError.message },
        { status: 500 }
      );
    }

    // Success
    console.log(`[update-order] Order ${orderId} updated successfully by ${ip} in ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      updatedFields: Object.keys(sanitizedData).filter(k => k !== 'updated_at')
    });

  } catch (error) {
    console.error('[update-order] Unhandled error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}