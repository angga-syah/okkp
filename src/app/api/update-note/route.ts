import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { orderId, note } = body;
   
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Update the note using admin privileges
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ 
        note,
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId);
     
    if (error) {
      console.error('[update-note] Error updating note:', error);
      return NextResponse.json(
        { error: 'Failed to update note', details: error.message },
        { status: 500 }
      );
    }  
    return NextResponse.json({
      success: true,
      message: 'Note updated successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}