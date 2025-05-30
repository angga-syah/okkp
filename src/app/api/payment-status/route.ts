// app/api/payment-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const latest = searchParams.get('latest');
    
    // Handle latest paid order request (for development/demo)
    if (latest === 'true') {
      const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select('id, name, email, service_name, status, created_at, invoice_id, language')
        .eq('status', 'document_verification') // Status after payment
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      if (!orders || orders.length === 0) {
        // If no paid orders, get any recent order for demo
        const { data: anyOrders, error: anyError } = await supabaseAdmin
          .from('orders')
          .select('id, name, email, service_name, status, created_at, invoice_id, language')
          .order('created_at', { ascending: false })
          .limit(1);

        if (anyError || !anyOrders || anyOrders.length === 0) {
          return NextResponse.json({ error: 'No orders found' }, { status: 404 });
        }

        const order = anyOrders[0];
        return NextResponse.json({
          orderId: order.id,
          customerName: order.name,
          customerEmail: order.email,
          serviceName: order.service_name,
          status: 'document_verification', // Show as paid for demo
          createdAt: order.created_at,
          invoiceId: order.invoice_id,
          language: order.language || 'en'
        });
      }

      const order = orders[0];
      return NextResponse.json({
        orderId: order.id,
        customerName: order.name,
        customerEmail: order.email,
        serviceName: order.service_name,
        status: order.status,
        createdAt: order.created_at,
        invoiceId: order.invoice_id,
        language: order.language || 'en'
      });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing invoice ID or external ID' }, { status: 400 });
    }

    // Security: Sanitize input
    const sanitizedId = id.replace(/[<>\"'&]/g, '').trim().slice(0, 255);
    
    if (!sanitizedId) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Try to find order by invoice_id first, then by external_id pattern
    let query = supabaseAdmin
      .from('orders')
      .select('id, name, email, service_name, status, created_at, invoice_id, language')
      .limit(1);

    // Check if it's an invoice_id or external_id
    if (sanitizedId.startsWith('INV-')) {
      query = query.eq('invoice_id', sanitizedId);
    } else {
      // Try to match as invoice_id directly
      query = query.eq('invoice_id', sanitizedId);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orders[0];

    // Return safe order details (no sensitive info)
    return NextResponse.json({
      orderId: order.id,
      customerName: order.name,
      customerEmail: order.email,
      serviceName: order.service_name,
      status: order.status,
      createdAt: order.created_at,
      invoiceId: order.invoice_id,
      language: order.language || 'en'
    });

  } catch (error) {
    console.error('Payment status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}