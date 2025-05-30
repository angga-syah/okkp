import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { updateOrderStatus } from '@/lib/server-order';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { orderId, newStatus } = body;
   
    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: 'Order ID and new status are required' },
        { status: 400 }
      );
    }
    
    // Use the existing updateOrderStatus function but with supabaseAdmin
    const result = await updateOrderStatus(
      supabaseAdmin, 
      orderId, 
      newStatus
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to update status', details: result.error?.message },
        { status: 500 }
      );
    }
   
    return NextResponse.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}