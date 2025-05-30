// app/api/secure-download/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/encryption';

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
    const tokenData = verifyAccessToken(decodedToken);
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 401 });
    }
    
    // Check if this is admin access (bypass password requirement)
    if (tokenData.isAdmin) {
      // For admin access, proceed with direct download via internal API call
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const downloadUrl = `${baseUrl}/api/download-document`;
      
      try {
        const response = await fetch(downloadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token,
            password: 'admin-bypass' // Will be ignored for admin tokens
          }),
        });
        
        if (response.ok) {
          // Forward the response
          const fileData = await response.arrayBuffer();
          const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
          const contentDisposition = response.headers.get('Content-Disposition') || 'attachment';
          
          const headers = new Headers();
          headers.set('Content-Type', contentType);
          headers.set('Content-Disposition', contentDisposition);
          headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          headers.set('Pragma', 'no-cache');
          headers.set('Expires', '0');
          
          return new NextResponse(fileData, {
            status: 200,
            headers
          });
        } else {
          return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
        }
      } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    }
    
    // For customer access, redirect to password protection page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const downloadPageUrl = `${baseUrl}/download/${encodeURIComponent(token)}`;
    
    // Return redirect response to password-protected download page
    return NextResponse.redirect(downloadPageUrl, 302);
    
  } catch (error) {
    console.error('Secure download error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}