// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sb_admin';
import { decryptFile } from '@/lib/encryption';
import { getServerSession } from 'next-auth/next';
import crypto from 'crypto';

// Security Configuration - dapat diatur via environment variables
const SECURITY_CONFIG = {
  // Enable/disable virus scanning
  ENABLE_VIRUS_SCAN: process.env.ENABLE_VIRUS_SCAN === 'true',
  
  // Enable/disable file type validation
  ENABLE_FILE_TYPE_VALIDATION: process.env.ENABLE_FILE_TYPE_VALIDATION !== 'false', // default true
  
  // Enable/disable file size limits
  ENABLE_FILE_SIZE_LIMIT: process.env.ENABLE_FILE_SIZE_LIMIT !== 'false', // default true
  
  // Enable/disable suspicious content detection
  ENABLE_SUSPICIOUS_CONTENT_SCAN: process.env.ENABLE_SUSPICIOUS_CONTENT_SCAN !== 'false', // default true
  
  // Enable/disable archive scanning (ZIP, RAR)
  ENABLE_ARCHIVE_SCAN: process.env.ENABLE_ARCHIVE_SCAN !== 'false', // default true
  
  // Enable/disable executable detection
  ENABLE_EXECUTABLE_DETECTION: process.env.ENABLE_EXECUTABLE_DETECTION !== 'false', // default true
  
  // Maximum file size (50MB default)
  MAX_FILE_SIZE: parseInt(process.env.MAX_DOCUMENT_SIZE || '52428800'), // 50MB
  
  // Rate limiting (optional for admin-only access)
  ENABLE_RATE_LIMITING: process.env.ENABLE_DOCUMENT_RATE_LIMITING === 'true', // default false
  
  // Security logging (disable for production)
  ENABLE_SECURITY_LOGGING: process.env.ENABLE_SECURITY_LOGGING === 'true', // default false
};

// Known malicious file signatures (magic bytes)
const MALICIOUS_SIGNATURES = [
  'MZ',      // Windows PE executables
  '\x7fELF', // Linux ELF executables
  '\xca\xfe\xba\xbe', // Java class files
  '\xfe\xed\xfa', // Mach-O executables
];

// Suspicious patterns in file content
const SUSPICIOUS_PATTERNS = [
  /eval\s*\(/gi,
  /exec\s*\(/gi,
  /system\s*\(/gi,
  /shell_exec/gi,
  /base64_decode/gi,
  /<script[^>]*>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
];

// Archive magic bytes
const ARCHIVE_SIGNATURES = {
  'ZIP': [0x50, 0x4B, 0x03, 0x04],
  'ZIP_EMPTY': [0x50, 0x4B, 0x05, 0x06],
  'ZIP_SPANNED': [0x50, 0x4B, 0x07, 0x08],
  'RAR': [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07],
  'RAR5': [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00],
};

// Helper function to determine content type based on file extension
function getContentType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  const contentTypeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  
  return contentTypeMap[extension] || 'application/octet-stream';
}

// Helper function to extract filename from path
function getFilename(filePath: string): string {
  return filePath.split('/').pop() || 'document';
}

// Check if file starts with malicious signature
function hasMaliciousSignature(buffer: Buffer): boolean {
  if (!SECURITY_CONFIG.ENABLE_EXECUTABLE_DETECTION) return false;
  
  const header = buffer.slice(0, 20).toString('binary');
  
  return MALICIOUS_SIGNATURES.some(signature => 
    header.startsWith(signature)
  );
}

// Check for suspicious content patterns
function hasSuspiciousContent(buffer: Buffer): boolean {
  if (!SECURITY_CONFIG.ENABLE_SUSPICIOUS_CONTENT_SCAN) return false;
  
  try {
    // Only scan first 100KB to avoid performance issues
    const content = buffer.slice(0, 102400).toString('utf8');
    
    return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(content));
  } catch (error) {
    // If we can't read as UTF8, it's likely binary - less suspicious for text patterns
    return false;
  }
}

// Check if file is an archive
function isArchive(buffer: Buffer): boolean {
  if (!SECURITY_CONFIG.ENABLE_ARCHIVE_SCAN) return false;
  
  for (const [format, signature] of Object.entries(ARCHIVE_SIGNATURES)) {
    if (buffer.length >= signature.length) {
      const match = signature.every((byte, index) => buffer[index] === byte);
      if (match) return true;
    }
  }
  
  return false;
}

// Basic virus-like pattern detection
function hasVirusLikePatterns(buffer: Buffer): boolean {
  if (!SECURITY_CONFIG.ENABLE_VIRUS_SCAN) return false;
  
  // Check for common virus signatures and patterns
  const suspiciousStrings = [
    'CreateObject',
    'WScript.Shell',
    'cmd.exe',
    'powershell.exe',
    'regsvr32',
    'rundll32',
    'mshta.exe',
    'cscript.exe',
    'wscript.exe',
  ];
  
  try {
    const content = buffer.toString('utf8').toLowerCase();
    return suspiciousStrings.some(str => content.includes(str.toLowerCase()));
  } catch (error) {
    return false;
  }
}

// Comprehensive security scan
function performSecurityScan(buffer: Buffer, filename: string): { safe: boolean; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  
  // File size check
  if (SECURITY_CONFIG.ENABLE_FILE_SIZE_LIMIT && buffer.length > SECURITY_CONFIG.MAX_FILE_SIZE) {
    reasons.push(`File size exceeds limit (${Math.round(buffer.length / 1024 / 1024)}MB > ${Math.round(SECURITY_CONFIG.MAX_FILE_SIZE / 1024 / 1024)}MB)`);
  }
  
  // Malicious signature check
  if (hasMaliciousSignature(buffer)) {
    reasons.push('File contains executable signature');
  }
  
  // Suspicious content check
  if (hasSuspiciousContent(buffer)) {
    reasons.push('File contains suspicious code patterns');
  }
  
  // Virus-like pattern check
  if (hasVirusLikePatterns(buffer)) {
    reasons.push('File contains virus-like patterns');
  }
  
  // Archive check (warning only, not blocking)
  if (isArchive(buffer)) {
    warnings.push('File is an archive - contains compressed files');
  }
  
  // File type validation
  if (SECURITY_CONFIG.ENABLE_FILE_TYPE_VALIDATION) {
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'zip', 'rar'];
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (!extension || !allowedExtensions.includes(extension)) {
      reasons.push('File type not allowed');
    }
  }
  
  return {
    safe: reasons.length === 0,
    reasons,
    warnings
  };
}

// Rate limiting check (simple in-memory store for Vercel)
const accessLog = new Map<string, number[]>();

function checkRateLimit(identifier: string): boolean {
  if (!SECURITY_CONFIG.ENABLE_RATE_LIMITING) return true;
  
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // 10 requests per minute
  
  // Get existing requests for this identifier
  const requests = accessLog.get(identifier) || [];
  
  // Remove old requests outside the window
  const recentRequests = requests.filter(time => now - time < windowMs);
  
  // Check if limit exceeded
  if (recentRequests.length >= maxRequests) {
    return false;
  }
  
  // Add current request and update log
  recentRequests.push(now);
  accessLog.set(identifier, recentRequests);
  
  return true;
}

// Security audit log (disabled by default for production)
function logSecurityEvent(event: string, details: any) {
  if (SECURITY_CONFIG.ENABLE_SECURITY_LOGGING) {
    console.warn(`[SECURITY] ${event}:`, JSON.stringify(details, null, 2));
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params Promise to get the ID
    const { id } = await params;
    
    // Get the session
    const session = await getServerSession();
    
    // Basic authentication check
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get client identifier for logging
    const clientIdentifier = session.user?.email || 'anonymous';
    
    // Rate limiting check (optional for admin access)
    if (SECURITY_CONFIG.ENABLE_RATE_LIMITING) {
      if (!checkRateLimit(clientIdentifier)) {
        logSecurityEvent('RATE_LIMIT_EXCEEDED', { 
          user: clientIdentifier, 
          documentId: id,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
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
    
    // Convert to Buffer for security scanning
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());
    
    // Decrypt if needed
    let finalFileData = fileBuffer;
    
    if (orderData.encryption_version && orderData.encryption_metadata) {
      try {
        const encryptedData = JSON.parse(Buffer.from(orderData.encryption_metadata, 'base64').toString());
        finalFileData = decryptFile(encryptedData, id);
      } catch (error) {
        // Silent fail for production - don't log decryption errors
        return NextResponse.json({ error: 'Failed to decrypt document' }, { status: 500 });
      }
    }
    
    // Perform comprehensive security scan on decrypted data
    const filename = getFilename(orderData.document_path);
    const securityScan = performSecurityScan(finalFileData, filename);
    
    if (!securityScan.safe) {
      logSecurityEvent('MALICIOUS_FILE_DETECTED', { 
        documentId: id,
        filename: filename,
        user: clientIdentifier,
        reasons: securityScan.reasons,
        warnings: securityScan.warnings,
        fileSize: finalFileData.length,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        error: 'File blocked for security reasons',
        details: securityScan.reasons
      }, { status: 403 });
    }
    
    // Log warnings if any
    if (securityScan.warnings.length > 0) {
      logSecurityEvent('DOCUMENT_ACCESS_WARNING', { 
        documentId: id,
        filename: filename,
        user: clientIdentifier,
        warnings: securityScan.warnings,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log successful access (only if logging enabled)
    if (SECURITY_CONFIG.ENABLE_SECURITY_LOGGING) {
      logSecurityEvent('DOCUMENT_ACCESS', { 
        documentId: id,
        filename: filename,
        user: clientIdentifier,
        fileSize: finalFileData.length,
        timestamp: new Date().toISOString()
      });
    }
    
    // Get content type based on file extension
    const contentType = getContentType(orderData.document_path);
    const isViewableType = ['application/pdf', 'image/jpeg', 'image/png'].includes(contentType);
    
    // Create response headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    
    // Set disposition based on file type
    if (isViewableType) {
      headers.set('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'no-referrer');
    
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
    // Don't log errors in production
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}