// app/api/validate-download-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/encryption';
import { supabaseAdmin } from '@/lib/sb_admin';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Token is required' 
      }, { status: 400 });
    }
    
    // Verify the access token
    const tokenData = verifyAccessToken(decodeURIComponent(token));
    
    if (!tokenData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid or expired download link' 
      }, { status: 401 });
    }
    
    // Get order information
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, name, service_name, language, result_file_path')
      .eq('id', tokenData.documentId)
      .single();
      
    if (orderError || !orderData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found' 
      }, { status: 404 });
    }
    
    // Check if result file exists
    if (!orderData.result_file_path) {
      return NextResponse.json({ 
        success: false, 
        message: 'Document not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      orderInfo: {
        id: orderData.id,
        name: orderData.name,
        service_name: orderData.service_name,
        language: orderData.language || 'id'
      }
    });
    
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';