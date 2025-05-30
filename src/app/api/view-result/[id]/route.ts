// app/api/view-result/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { decryptFile } from '@/lib/encryption';
import { getServerSession } from 'next-auth/next';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';

// Rate limiter untuk view attempts
const viewLimiter = new EnhancedRateLimiter('view_result', {
  maxAttempts: 20, // More lenient for viewing
  windowMinutes: 10,
  lockoutMinutes: 15,
  progressiveDelay: false // No delay for viewing
});

// Helper function to determine content type based on file extension
function getContentType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  const contentTypeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'rtf': 'application/rtf'
  };
  
  return contentTypeMap[extension] || 'application/octet-stream';
}

// Helper function to extract filename from path
function getFilename(filePath: string): string {
  const filename = filePath.split('/').pop() || 'document';
  // Ensure filename has proper extension
  if (!filename.includes('.')) {
    return `${filename}.pdf`; // Default to PDF if no extension
  }
  return filename;
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = forwarded?.split(',')[0] || realIP || 'unknown';
  return clientIP;
}

// Helper function to validate file size limits
function validateFileSize(fileSize: number): boolean {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit for Vercel
  return fileSize <= MAX_FILE_SIZE;
}

// Check if file type is viewable in browser
function isViewableType(contentType: string): boolean {
  const viewableTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain'
  ];
  return viewableTypes.includes(contentType);
}

// Using the exact same signature as your working news route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIP = getClientIP(request);
  let attemptLogged = false;

  try {
    // Await the params Promise to get the ID
    const { id } = await params;
    
    // Input validation for document ID
    const idValidation = SecurityValidator.validateAndSanitize(id, {
      maxLength: 100,
      checkXSS: true,
      checkSQLInjection: true,
      checkPathTraversal: true
    });

    if (!idValidation.isValid) {
      await viewLimiter.recordAttempt(clientIP, false, { 
        error: 'Invalid document ID',
        violations: idValidation.violations
      });
      return NextResponse.json({ 
        error: 'Invalid document ID format' 
      }, { status: 400 });
    }

    const documentId = idValidation.sanitized;

    // Rate limiting check
    const rateLimitResult = await viewLimiter.checkAndLimit(clientIP);
    
    if (!rateLimitResult.success) {
      if (rateLimitResult.isLocked) {
        return NextResponse.json({ 
          error: 'Too many view attempts. Please try again later.',
          lockoutDuration: rateLimitResult.lockoutDuration
        }, { status: 429 });
      }
      
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.',
        resetTime: new Date(rateLimitResult.resetTime).toISOString()
      }, { status: 429 });
    }
    
    // Get the session
    const session = await getServerSession();
    
    // Basic authentication check - admin permissions are checked at component level with AuthGuard
    if (!session) {
      await viewLimiter.recordAttempt(clientIP, false, { 
        error: 'No session',
        documentId 
      });
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    attemptLogged = true;
    await viewLimiter.recordAttempt(clientIP, false, { 
      stage: 'authenticated',
      documentId,
      userId: session.user?.email
    });
    
    // Get result file path and encryption metadata
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('result_file_path, result_encryption_metadata, result_encryption_version')
      .eq('id', documentId)
      .single();
     
    if (orderError || !orderData?.result_file_path) {
      await viewLimiter.recordAttempt(clientIP, false, { 
        error: 'Document not found',
        documentId 
      });
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
      console.error('Storage download error:', fileError);
      await viewLimiter.recordAttempt(clientIP, false, { 
        error: 'Storage download failed',
        documentId,
        storageError: fileError?.message
      });
      return NextResponse.json(
        { error: 'Failed to download result file' },
        { status: 500 }
      );
    }

    // Check file size
    if (!validateFileSize(fileData.size)) {
      return NextResponse.json({ 
        error: 'File too large to view' 
      }, { status: 413 });
    }

    // Check if file is encrypted and decrypt if needed
    let finalFileData: Blob = fileData;
    let actualContentType = getContentType(orderData.result_file_path);
    let originalFilename: string | null = null;
    
    if (orderData.result_encryption_version && orderData.result_encryption_metadata) {
      try {
        // Parse encryption metadata first to get original file info
        const encryptionMetadata = JSON.parse(
          Buffer.from(orderData.result_encryption_metadata, 'base64').toString()
        );
        
        // Use original content type if available in metadata
        if (encryptionMetadata.originalContentType) {
          actualContentType = encryptionMetadata.originalContentType;
        }
        
        // Get original filename if available
        if (encryptionMetadata.originalFilename) {
          originalFilename = encryptionMetadata.originalFilename;
        }
        
        // Decrypt the file using the encrypted data structure
        const decryptedBuffer = decryptFile(encryptionMetadata, documentId);
        
        // Create blob with proper content type
        finalFileData = new Blob([decryptedBuffer], { type: actualContentType });
        
      } catch (decryptError) {
        console.error('Decryption error:', decryptError);
        await viewLimiter.recordAttempt(clientIP, false, { 
          error: 'Decryption failed',
          documentId 
        });
        return NextResponse.json(
          { error: 'Failed to decrypt result file' },
          { status: 500 }
        );
      }
    }
    
    // Get file extension to determine content type
    const contentType = actualContentType;
    let filename = getFilename(orderData.result_file_path);
    
    // Use original filename if available from decryption metadata
    if (originalFilename) {
      filename = originalFilename;
    }
    
    const viewable = isViewableType(contentType);
    
    // Set up response headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', finalFileData.size.toString());
    
    // Set Content-Disposition based on if it's a viewable type or not
    if (viewable) {
      // Use inline for PDFs and images so they open in the browser
      headers.set('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      // Use attachment for other file types to force download
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN'); // Allow framing for PDF viewing
    headers.set('Referrer-Policy', 'same-origin');
    
    // Cache control headers - allow some caching for performance
    if (viewable) {
      headers.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache for viewable files
    } else {
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
    }

    // Log successful view
    await supabaseAdmin
      .from('security_logs')
      .insert({
        event_type: 'document_viewed',
        ip_address: clientIP,
        user_agent: request.headers.get('user-agent') || 'unknown',
        message: `Document viewed: ${documentId}`,
        metadata: { 
          documentId, 
          filename,
          fileSize: finalFileData.size,
          contentType,
          viewable,
          userId: session.user?.email
        },
        created_at: new Date().toISOString()
      })
      .then(() => {}) // Ignore logging errors
      .catch(() => {});
    
    // Record successful attempt
    await viewLimiter.recordAttempt(clientIP, true, { 
      documentId,
      contentType,
      fileSize: finalFileData.size
    });
    
    // Convert blob to array buffer for response
    const responseData = await finalFileData.arrayBuffer();
    
    // Return the file directly - admin bypass password requirement
    return new NextResponse(responseData, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Error accessing result file:', error);
    
    if (!attemptLogged) {
      await viewLimiter.recordAttempt(clientIP, false, { 
        error: 'Server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}