// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { decryptFile } from '@/lib/encryption';
import { getServerSession } from 'next-auth/next';

// Helper function to determine content type based on file extension
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

// Helper function to extract filename from path
function getFilename(filePath: string): string {
  return filePath.split('/').pop() || 'document';
}

// Using the exact same signature as your working news route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params Promise to get the ID
    const { id } = await params;
    
    // Get the session
    const session = await getServerSession();
    
    // Basic authentication check - admin permissions are checked at component level with AuthGuard
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get document file path and encryption metadata
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('document_path, encryption_metadata, encryption_version')
      .eq('id', id)
      .single();
      
    if (orderError || !orderData?.document_path) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    // Download the file
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from('documents')
      .download(orderData.document_path);
      
    if (fileError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }
    
    // Decrypt if needed
    let finalFileData = fileData;
    
    if (orderData.encryption_version && orderData.encryption_metadata) {
      try {
        const encryptedData = JSON.parse(Buffer.from(orderData.encryption_metadata, 'base64').toString());
        finalFileData = decryptFile(encryptedData, id);
      } catch (error) {
        return NextResponse.json({ error: 'Failed to decrypt document' }, { status: 500 });
      }
    }
    
    // Get content type based on file extension
    const contentType = getContentType(orderData.document_path);
    const isViewableType = ['application/pdf', 'image/jpeg', 'image/png'].includes(contentType);
    
    // Create response headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    
    // Set disposition based on file type
    if (isViewableType) {
      headers.set('Content-Disposition', `inline; filename="${getFilename(orderData.document_path)}"`);
    } else {
      headers.set('Content-Disposition', `attachment; filename="${getFilename(orderData.document_path)}"`);
    }
    
    // Cache control headers
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    // Return file
    return new NextResponse(finalFileData, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Document access error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}