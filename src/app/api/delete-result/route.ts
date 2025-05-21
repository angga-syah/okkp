// app/api/delete-result/route.ts
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

    // Get the result file path from the order
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('result_file_path')
      .eq('id', orderId)
      .single();
      
    if (orderError || !orderData?.result_file_path) {
      console.error('[delete-result] Order not found or no result file:', orderError);
      return NextResponse.json(
        { error: 'Result file not found' },
        { status: 404 }
      );
    }
    // Delete the file from storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from('documents')
      .remove([orderData.result_file_path]);
      
    if (deleteError) {
      console.error('[delete-result] Error deleting file from storage:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete file from storage' },
        { status: 500 }
      );
    }

    // Update the order record to remove the file reference
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        result_file_path: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
      
    if (updateError) {
      console.error('[delete-result] Error updating order record:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order record' },
        { status: 500 }
      );
    }
 
    return NextResponse.json({
      success: true,
      message: 'Result file deleted successfully'
    });
  } catch (error) {
    console.error('[delete-result] Unhandled server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}