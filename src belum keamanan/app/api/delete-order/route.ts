import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { orderId } = body;
   
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Delete the order using admin privileges
    const { error } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', orderId);
     
    if (error) {
      console.error('[delete-order] Error deleting order:', error);
      return NextResponse.json(
        { error: 'Failed to delete order', details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}