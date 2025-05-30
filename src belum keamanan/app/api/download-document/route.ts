// app/api/download-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, verifyDownloadPassword, decryptFile } from '@/lib/encryption';
import { supabaseAdmin } from '@/lib/sb_admin';

// Helper function to determine content type
function getContentType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  const contentTypeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'zip': 'application/zip',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  
  return contentTypeMap[extension] || 'application/octet-stream';
}

// Helper function to extract filename
function getFilename(filePath: string): string {
  return filePath.split('/').pop() || 'document';
}

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    
    if (!token || !password) {
      return NextResponse.json({ 
        message: 'Token and password are required' 
      }, { status: 400 });
    }
    
    // Verify the access token
    const tokenData = verifyAccessToken(decodeURIComponent(token));
    
    if (!tokenData) {
      return NextResponse.json({ 
        message: 'Invalid or expired download link' 
      }, { status: 401 });
    }
    
    // If this is admin access, skip password verification
    if (tokenData.isAdmin) {
      // Get order data for admin access
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('result_file_path, result_encryption_metadata, result_encryption_version')
        .eq('id', tokenData.documentId)
        .single();
        
      if (orderError || !orderData?.result_file_path) {
        return NextResponse.json({ 
          message: 'Document not found' 
        }, { status: 404 });
      }
      
      return await downloadFile(orderData, tokenData.documentId);
    }
    
    // For customer access, verify password
    if (!verifyDownloadPassword(tokenData.documentId, password)) {
      return NextResponse.json({ 
        message: 'Invalid password' 
      }, { status: 401 });
    }
    
    // Get order data
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('result_file_path, result_encryption_metadata, result_encryption_version')
      .eq('id', tokenData.documentId)
      .single();
      
    if (orderError || !orderData?.result_file_path) {
      return NextResponse.json({ 
        message: 'Document not found' 
      }, { status: 404 });
    }
    
    return await downloadFile(orderData, tokenData.documentId);
    
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ 
      message: 'Server error' 
    }, { status: 500 });
  }
}

async function downloadFile(orderData: any, documentId: string) {
  try {
    // Download the file from storage
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from('documents')
      .download(orderData.result_file_path);
      
    if (fileError || !fileData) {
      return NextResponse.json({ 
        message: 'Failed to download file' 
      }, { status: 500 });
    }
    
    // Decrypt if needed
    let finalFileData = fileData;
    
    if (orderData.result_encryption_version && orderData.result_encryption_metadata) {
      try {
        const encryptedData = JSON.parse(Buffer.from(orderData.result_encryption_metadata, 'base64').toString());
        finalFileData = decryptFile(encryptedData, documentId);
      } catch (decryptError) {
        return NextResponse.json({ 
          message: 'Failed to decrypt document' 
        }, { status: 500 });
      }
    }
    
    // Get content type and filename
    const contentType = getContentType(orderData.result_file_path);
    const filename = getFilename(orderData.result_file_path);
    
    // Create response headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    // Return file
    return new NextResponse(finalFileData, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json({ 
      message: 'Failed to process file download' 
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';