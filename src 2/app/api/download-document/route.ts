// app/api/download-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, verifyDownloadPassword, decryptFile } from '@/lib/encryption';
import { supabaseAdmin } from '@/lib/sb_admin';
import { EnhancedRateLimiter, SecurityValidator } from '@/lib/enhanced-security';

// Rate limiter untuk download attempts
const downloadLimiter = new EnhancedRateLimiter('download', {
  maxAttempts: 10, // 10 attempts per window
  windowMinutes: 15, // 15 minute window
  lockoutMinutes: 30, // 30 minute lockout
  progressiveDelay: true
});

// Helper function to determine content type
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

// Helper function to extract filename
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

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);
  let attemptLogged = false;

  try {
    // Rate limiting check
    const rateLimitResult = await downloadLimiter.checkAndLimit(clientIP);
    
    if (!rateLimitResult.success) {
      if (rateLimitResult.isLocked) {
        return NextResponse.json({ 
          message: 'Too many failed download attempts. Please try again later.',
          lockoutDuration: rateLimitResult.lockoutDuration
        }, { status: 429 });
      }
      
      if (rateLimitResult.nextAttemptDelay) {
        return NextResponse.json({ 
          message: `Please wait ${rateLimitResult.nextAttemptDelay} seconds before trying again.`,
          retryAfter: rateLimitResult.nextAttemptDelay
        }, { status: 429 });
      }
      
      return NextResponse.json({ 
        message: 'Rate limit exceeded. Please try again later.',
        resetTime: new Date(rateLimitResult.resetTime).toISOString()
      }, { status: 429 });
    }

    // Parse and validate request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      await downloadLimiter.recordAttempt(clientIP, false, { error: 'Invalid JSON' });
      return NextResponse.json({ 
        message: 'Invalid request format' 
      }, { status: 400 });
    }

    const { token, password } = requestData;
    
    // Input validation
    if (!token || !password) {
      await downloadLimiter.recordAttempt(clientIP, false, { error: 'Missing credentials' });
      return NextResponse.json({ 
        message: 'Token and password are required' 
      }, { status: 400 });
    }

    // Validate and sanitize inputs
    const tokenValidation = SecurityValidator.validateAndSanitize(token, {
      maxLength: 2048,
      checkXSS: true,
      checkSQLInjection: true
    });

    const passwordValidation = SecurityValidator.validateAndSanitize(password, {
      maxLength: 50,
      checkXSS: true,
      checkSQLInjection: true
    });

    if (!tokenValidation.isValid || !passwordValidation.isValid) {
      await downloadLimiter.recordAttempt(clientIP, false, { 
        error: 'Invalid input format',
        violations: [...tokenValidation.violations, ...passwordValidation.violations]
      });
      return NextResponse.json({ 
        message: 'Invalid input format' 
      }, { status: 400 });
    }

    // Verify the access token
    let tokenData;
    try {
      tokenData = verifyAccessToken(decodeURIComponent(tokenValidation.sanitized));
    } catch (tokenError) {
      await downloadLimiter.recordAttempt(clientIP, false, { error: 'Token verification failed' });
      return NextResponse.json({ 
        message: 'Invalid or expired download link' 
      }, { status: 401 });
    }
    
    if (!tokenData) {
      await downloadLimiter.recordAttempt(clientIP, false, { error: 'Invalid token' });
      return NextResponse.json({ 
        message: 'Invalid or expired download link' 
      }, { status: 401 });
    }

    // Log attempt for monitoring
    attemptLogged = true;
    await downloadLimiter.recordAttempt(clientIP, false, { 
      stage: 'token_verified',
      documentId: tokenData.documentId,
      isAdmin: tokenData.isAdmin 
    });
    
    // If this is admin access, skip password verification
    if (tokenData.isAdmin) {
      const result = await processDownload(tokenData.documentId, clientIP, true);
      if (result.success) {
        await downloadLimiter.recordAttempt(clientIP, true, { 
          documentId: tokenData.documentId,
          adminAccess: true 
        });
      }
      return result.response;
    }
    
    // For customer access, verify password
    let passwordVerified = false;
    try {
      passwordVerified = verifyDownloadPassword(tokenData.documentId, passwordValidation.sanitized);
    } catch (passwordError) {
      await downloadLimiter.recordAttempt(clientIP, false, { 
        error: 'Password verification error',
        documentId: tokenData.documentId 
      });
      return NextResponse.json({ 
        message: 'Server error during password verification' 
      }, { status: 500 });
    }

    if (!passwordVerified) {
      await downloadLimiter.recordAttempt(clientIP, false, { 
        error: 'Invalid password',
        documentId: tokenData.documentId 
      });
      return NextResponse.json({ 
        message: 'Invalid password' 
      }, { status: 401 });
    }
    
    const result = await processDownload(tokenData.documentId, clientIP, false);
    if (result.success) {
      await downloadLimiter.recordAttempt(clientIP, true, { 
        documentId: tokenData.documentId,
        customerAccess: true 
      });
    }
    return result.response;
    
  } catch (error) {
    console.error('Download error:', error);
    
    if (!attemptLogged) {
      await downloadLimiter.recordAttempt(clientIP, false, { 
        error: 'Server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    
    return NextResponse.json({ 
      message: 'Server error' 
    }, { status: 500 });
  }
}

async function processDownload(documentId: string, clientIP: string, isAdmin: boolean): Promise<{
  success: boolean;
  response: NextResponse;
}> {
  try {
    // Get order data
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('result_file_path, result_encryption_metadata, result_encryption_version')
      .eq('id', documentId)
      .single();
      
    if (orderError || !orderData?.result_file_path) {
      return {
        success: false,
        response: NextResponse.json({ 
          message: 'Document not found' 
        }, { status: 404 })
      };
    }

    // Download the file from storage
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from('documents')
      .download(orderData.result_file_path);
      
    if (fileError || !fileData) {
      console.error('Storage download error:', fileError);
      return {
        success: false,
        response: NextResponse.json({ 
          message: 'Failed to download file from storage' 
        }, { status: 500 })
      };
    }

    // Check file size
    if (!validateFileSize(fileData.size)) {
      return {
        success: false,
        response: NextResponse.json({ 
          message: 'File too large to download' 
        }, { status: 413 })
      };
    }
    
    // Decrypt if needed
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
        return {
          success: false,
          response: NextResponse.json({ 
            message: 'Failed to decrypt document' 
          }, { status: 500 })
        };
      }
    }
    
    // Get content type and filename
    const contentType = actualContentType;
    let filename = getFilename(orderData.result_file_path);
    
    // Use original filename if available from decryption metadata
    if (originalFilename) {
      filename = originalFilename;
    }
    
    // Create response headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Length', finalFileData.size.toString());
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'no-referrer');
    
    // Log successful download
    await supabaseAdmin
      .from('security_logs')
      .insert({
        event_type: 'document_downloaded',
        ip_address: clientIP,
        user_agent: 'api',
        message: `Document downloaded: ${documentId}`,
        metadata: { 
          documentId, 
          isAdmin, 
          filename,
          fileSize: finalFileData.size,
          contentType
        },
        created_at: new Date().toISOString()
      })
      .then(() => {}) // Ignore logging errors
      .catch(() => {});
    
    // Convert blob to array buffer for response
    const responseData = await finalFileData.arrayBuffer();
    
    return {
      success: true,
      response: new NextResponse(responseData, {
        status: 200,
        headers
      })
    };
    
  } catch (error) {
    console.error('File processing error:', error);
    return {
      success: false,
      response: NextResponse.json({ 
        message: 'Failed to process file download' 
      }, { status: 500 })
    };
  }
}

export const dynamic = 'force-dynamic';