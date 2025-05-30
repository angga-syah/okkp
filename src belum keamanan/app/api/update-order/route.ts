import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { orderId, data } = body;
   
    if (!orderId || !data) {
      return NextResponse.json(
        { error: 'Order ID and update data are required' },
        { status: 400 }
      );
    }
    
    // Update the order using admin privileges
    const { error } = await supabaseAdmin
      .from('orders')
      .update(data)
      .eq('id', orderId);
     
    if (error) {
      console.error('[update-order] Error updating order:', error);
      return NextResponse.json(
        { error: 'Failed to update order', details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      message: 'Order updated successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}