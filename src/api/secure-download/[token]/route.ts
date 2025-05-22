// app/api/secure-download/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { decryptFile, verifyAccessToken } from '@/lib/encryption';

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

// Using the exact same signature as your working news route, but for token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Await the params Promise to get the token
    const { token } = await params;
    
    // Decode the token
    const decodedToken = decodeURIComponent(token);
    
    // Verify the token and get the document ID
    const documentId = verifyAccessToken(decodedToken);
    if (!documentId) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 401 });
    }
    
    // Get document file path and encryption metadata from database
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('result_file_path, result_encryption_metadata, result_encryption_version')
      .eq('id', documentId)
      .single();
      
    if (orderError || !orderData?.result_file_path) {
      return NextResponse.json({ error: 'Document file not found' }, { status: 404 });
    }
    
    // Download the encrypted file from Supabase storage
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from('documents')
      .download(orderData.result_file_path);
      
    if (fileError || !fileData) {
      return NextResponse.json({ error: 'Failed to download document file' }, { status: 500 });
    }
    
    // Decrypt the file if it's encrypted
    let finalFileData = fileData;
    
    if (orderData.result_encryption_version && orderData.result_encryption_metadata) {
      try {
        const encryptedData = JSON.parse(Buffer.from(orderData.result_encryption_metadata, 'base64').toString());
        finalFileData = decryptFile(encryptedData, documentId);
      } catch (decryptError) {
        return NextResponse.json({ error: 'Failed to decrypt document' }, { status: 500 });
      }
    }
    
    // Get file extension to determine content type
    const contentType = getContentType(orderData.result_file_path);
    const isViewableType = ['application/pdf', 'image/jpeg', 'image/png'].includes(contentType);
    
    // Create headers for the response
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    
    // Set Content-Disposition based on if it's a viewable type or not
    if (isViewableType) {
      // Use inline for PDFs and images so they open in the browser
      headers.set('Content-Disposition', `inline; filename="${getFilename(orderData.result_file_path)}"`);
    } else {
      // Use attachment for other file types to force download
      headers.set('Content-Disposition', `attachment; filename="${getFilename(orderData.result_file_path)}"`);
    }
    
    // Use Headers API instead of plain objects to avoid NextJS serialization warnings
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    // Return the decrypted file with appropriate headers
    return new NextResponse(finalFileData, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Secure download error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}