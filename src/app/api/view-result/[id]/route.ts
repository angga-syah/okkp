// app/api/view-result/[id]/route.ts
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
    
    // Get result file path and encryption metadata
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('result_file_path, result_encryption_metadata, result_encryption_version')
      .eq('id', id)
      .single();
     
    if (orderError || !orderData?.result_file_path) {
      return NextResponse.json(
        { error: 'Result file not found' },
        { status: 404 }
      );
    }

    // Download the file from storage
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from('documents')
      .download(orderData.result_file_path);
      
    if (fileError || !fileData) {
      return NextResponse.json(
        { error: 'Failed to download result file' },
        { status: 500 }
      );
    }

    // Check if file is encrypted and decrypt if needed
    let finalFileData = fileData;
    
    if (orderData.result_encryption_version && orderData.result_encryption_metadata) {
      try {
        const encryptedData = JSON.parse(Buffer.from(orderData.result_encryption_metadata, 'base64').toString());
        finalFileData = decryptFile(encryptedData, id);
      } catch (decryptError) {
        console.error('Decryption error:', decryptError);
        return NextResponse.json(
          { error: 'Failed to decrypt result file' },
          { status: 500 }
        );
      }
    }
    
    // Get file extension to determine content type
    const contentType = getContentType(orderData.result_file_path);
    const isViewableType = ['application/pdf', 'image/jpeg', 'image/png'].includes(contentType);
    
    // Set up response headers
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
    
    // Cache control headers
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    // Return the file directly - admin bypass password requirement
    return new NextResponse(finalFileData, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Error accessing result file:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}