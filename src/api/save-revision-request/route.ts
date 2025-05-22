import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { updateOrderStatus } from '@/lib/server-order';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { orderId, revisionMessage } = body;
   
    if (!orderId || !revisionMessage) {
      return NextResponse.json(
        { error: 'Order ID and revision message are required' },
        { status: 400 }
      );
    }
   
    // Get order data to have customer information
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('email, name, service_name, language')
      .eq('id', orderId)
      .single();
     
    if (orderError || !orderData) {
      return NextResponse.json(
        { error: 'Order not found', details: orderError?.message },
        { status: 404 }
      );
    }
   
    // Update status to pending_document using admin privileges
    const result = await updateOrderStatus(
      supabaseAdmin,
      orderId,
      'pending_document'
    );
   
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to update status', details: result.error?.message },
        { status: 500 }
      );
    }
   
    // Save revision message
    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        revision_message: revisionMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
       
    if (error) {
      return NextResponse.json(
        { error: 'Failed to save revision message', details: error.message },
        { status: 500 }
      );
    }
   
    // Make separate call to send email
    try {
      const emailResponse = await fetch(new URL('/api/revisi-document', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          revisionMessage
        }),
      });
     
      if (!emailResponse.ok) {
        console.error('Failed to send revision email');
      }
    } catch (emailError) {
      console.error('Error sending revision email:', emailError);
    }
   
    return NextResponse.json({
      success: true,
      message: 'Revision request saved and email sent successfully'
    });
  } catch (error) {
    console.error('[save-revision-request] Unhandled server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}