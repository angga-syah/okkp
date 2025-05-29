// components/Order/upload.ts - Enhanced Security Version CLEAN
import { useState, useCallback, useMemo } from 'react';

// Enhanced security configuration for file uploads
const FILE_SECURITY_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB for serverless optimization
  ALLOWED_EXTENSIONS: ['pdf', 'jpg', 'jpeg', 'png', 'zip'] as const,
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg', // Some browsers send this
    'image/png',
    'application/zip',
    'application/x-zip-compressed'
  ] as const,
  // File signature validation (magic bytes)
  FILE_SIGNATURES: {
    'pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    'jpg': [0xFF, 0xD8, 0xFF], // JPEG
    'jpeg': [0xFF, 0xD8, 0xFF], // JPEG
    'png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
    'zip': [0x50, 0x4B, 0x03, 0x04] // ZIP
  } as Record<string, number[]>,
  MAX_FILENAME_LENGTH: 255,
  SUSPICIOUS_PATTERNS: [
    // Malicious extensions
    /\.(exe|php|js|jsp|asp|aspx|bat|cmd|scr|pif|com|vbs|ps1|sh|jar|war)$/i,
    // Directory traversal
    /\.\./,
    /\//,
    /\\/,
    // Null bytes and control characters
    /[\x00-\x1F\x7F]/,
    // HTML/Script injection in filename
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    // Windows reserved names
    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i,
    // Hidden files (starting with dot)
    /^\./,
    // Multiple extensions
    /\.[a-z]{2,4}\.[a-z]{2,4}$/i
  ],
  // Rate limiting for uploads
  MAX_UPLOADS_PER_MINUTE: 10,
  UPLOAD_COOLDOWN_MS: 1000 // 1 second between uploads
} as const;

// Type definitions
type AllowedExtension = typeof FILE_SECURITY_CONFIG.ALLOWED_EXTENSIONS[number];
type AllowedMimeType = typeof FILE_SECURITY_CONFIG.ALLOWED_MIME_TYPES[number];

// Enhanced file validation interface
interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  securityFlags: string[];
}

// Enhanced upload status interface
interface UploadStatus {
  name: string;
  size: string;
  type: string;
  lastModified: string;
  hash?: string;
  isSecure: boolean;
  validationFlags: string[];
}

// Translation interface for better type safety
interface UploadTranslations {
  fileTooLarge: string;
  formatNotSupported: string;
  unknownFileFormat: string;
  fileNameTooLong: string;
  suspiciousFileName: string;
  fileSignatureMismatch: string;
  emptyFile: string;
  validationError: string;
  uploadSuccess: string;
  rateLimitExceeded: string;
  processingFile: string;
}

// Enhanced translations with more security messages
export const uploadTranslations: Record<'en' | 'id', UploadTranslations> = {
  en: {
    fileTooLarge: "File size too large. Maximum 10MB allowed.",
    formatNotSupported: "File format not supported. Use PDF, JPG, PNG, or ZIP files only.",
    unknownFileFormat: "File format not recognized or potentially unsafe.",
    fileNameTooLong: "File name too long. Maximum 255 characters allowed.",
    suspiciousFileName: "File name contains suspicious patterns and cannot be uploaded.",
    fileSignatureMismatch: "File content doesn't match the file extension.",
    emptyFile: "Empty files are not allowed.",
    validationError: "File validation failed. Please check your file and try again.",
    uploadSuccess: "File uploaded successfully and validated.",
    rateLimitExceeded: "Too many upload attempts. Please wait a moment.",
    processingFile: "Processing file..."
  },
  id: {
    fileTooLarge: "Ukuran file terlalu besar. Maksimal 10MB diperbolehkan.",
    formatNotSupported: "Format file tidak didukung. Gunakan file PDF, JPG, PNG, atau ZIP saja.",
    unknownFileFormat: "Format file tidak dikenali atau berpotensi tidak aman.",
    fileNameTooLong: "Nama file terlalu panjang. Maksimal 255 karakter diperbolehkan.",
    suspiciousFileName: "Nama file mengandung pola mencurigakan dan tidak dapat diunggah.",
    fileSignatureMismatch: "Konten file tidak sesuai dengan ekstensi file.",
    emptyFile: "File kosong tidak diperbolehkan.",
    validationError: "Validasi file gagal. Periksa file Anda dan coba lagi.",
    uploadSuccess: "File berhasil diunggah dan divalidasi.",
    rateLimitExceeded: "Terlalu banyak percobaan upload. Tunggu sebentar.",
    processingFile: "Memproses file..."
  }
};

// Enhanced file signature validation
async function validateFileSignature(file: File): Promise<boolean> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !(extension in FILE_SECURITY_CONFIG.FILE_SIGNATURES)) {
    return true; // Skip validation if we don't have signature data
  }
  
  try {
    const buffer = await file.slice(0, 16).arrayBuffer(); // Read first 16 bytes
    const bytes = new Uint8Array(buffer);
    const expectedSignature = FILE_SECURITY_CONFIG.FILE_SIGNATURES[extension];
    
    if (!expectedSignature) return true;
    
    // Check if the file starts with the expected signature
    for (let i = 0; i < expectedSignature.length; i++) {
      if (bytes[i] !== expectedSignature[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating file signature:', error);
    return false; // Fail secure
  }
}

// Enhanced comprehensive file validation
async function comprehensiveFileValidation(file: File): Promise<FileValidationResult> {
  const securityFlags: string[] = [];
  
  // Basic file existence check
  if (!file) {
    return { 
      isValid: false, 
      error: 'emptyFile',
      securityFlags: ['NO_FILE']
    };
  }
  
  // File size validation
  if (file.size === 0) {
    return { 
      isValid: false, 
      error: 'emptyFile',
      securityFlags: ['EMPTY_FILE']
    };
  }
  
  if (file.size > FILE_SECURITY_CONFIG.MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: 'fileTooLarge',
      securityFlags: ['SIZE_EXCEEDED']
    };
  }
  
  // File name validation
  const fileName = file.name;
  if (!fileName || fileName.length > FILE_SECURITY_CONFIG.MAX_FILENAME_LENGTH) {
    return { 
      isValid: false, 
      error: 'fileNameTooLong',
      securityFlags: ['FILENAME_TOO_LONG']
    };
  }
  
  // Check for suspicious file name patterns
  for (const pattern of FILE_SECURITY_CONFIG.SUSPICIOUS_PATTERNS) {
    if (pattern.test(fileName)) {
      securityFlags.push('SUSPICIOUS_FILENAME');
      return { 
        isValid: false, 
        error: 'suspiciousFileName',
        securityFlags
      };
    }
  }
  
  // File extension validation
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension || !FILE_SECURITY_CONFIG.ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return { 
      isValid: false, 
      error: 'formatNotSupported',
      securityFlags: ['INVALID_EXTENSION']
    };
  }
  
  // MIME type validation
  if (!FILE_SECURITY_CONFIG.ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    securityFlags.push('MIME_TYPE_MISMATCH');
    return { 
      isValid: false, 
      error: 'formatNotSupported',
      securityFlags
    };
  }
  
  // File signature validation (magic bytes)  
  const signatureValid = await validateFileSignature(file);
  if (!signatureValid) {
    securityFlags.push('SIGNATURE_MISMATCH');
    return { 
      isValid: false, 
      error: 'fileSignatureMismatch',
      securityFlags
    };
  }
  
  // Additional security checks for specific file types
  if (extension === 'zip') {
    securityFlags.push('ARCHIVE_FILE');
    // Note: Full ZIP content scanning would require server-side processing
  }
  
  if (file.size > 5 * 1024 * 1024) { // Files larger than 5MB
    securityFlags.push('LARGE_FILE');
  }
  
  // Check file modification date (detect potentially tampered files)
  const fileDate = new Date(file.lastModified);
  const now = new Date();
  const daysDiff = (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff > 365) { // File older than 1 year
    securityFlags.push('OLD_FILE');
  }
  
  if (fileDate > now) { // File from future
    securityFlags.push('FUTURE_DATE');
  }
  
  return { 
    isValid: true, 
    securityFlags: securityFlags.length > 0 ? securityFlags : ['VALIDATED']
  };
}

// Enhanced file hash generation for integrity checking
async function generateFileHash(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Error generating file hash:', error);
    return 'hash_error';
  }
}

// Enhanced upload status formatting
function formatUploadStatus(file: File, validationResult: FileValidationResult, hash?: string): UploadStatus {
  const sizeInKB = (file.size / 1024).toFixed(2);
  const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
  const displaySize = file.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
  
  return {
    name: file.name,
    size: displaySize,
    type: file.type,
    lastModified: new Date(file.lastModified).toLocaleDateString(),
    hash: hash ? hash.substring(0, 12) + '...' : undefined, // Show only first 12 chars for UI
    isSecure: validationResult.isValid && !validationResult.securityFlags?.includes('SUSPICIOUS_FILENAME'),
    validationFlags: validationResult.securityFlags || []
  };
}

// Rate limiter for file uploads
class FileUploadRateLimiter {
  private uploadTimes: number[] = [];
  
  checkRateLimit(): { allowed: boolean; remainingTime?: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old entries
    this.uploadTimes = this.uploadTimes.filter(time => time > oneMinuteAgo);
    
    // Check if limit exceeded
    if (this.uploadTimes.length >= FILE_SECURITY_CONFIG.MAX_UPLOADS_PER_MINUTE) {
      const oldestUpload = Math.min(...this.uploadTimes);
      const remainingTime = Math.ceil((oldestUpload + 60000 - now) / 1000);
      return { allowed: false, remainingTime };
    }
    
    // Check cooldown
    const lastUpload = Math.max(...this.uploadTimes, 0);
    if (now - lastUpload < FILE_SECURITY_CONFIG.UPLOAD_COOLDOWN_MS) {
      const remainingTime = Math.ceil((lastUpload + FILE_SECURITY_CONFIG.UPLOAD_COOLDOWN_MS - now) / 1000);
      return { allowed: false, remainingTime };
    }
    
    return { allowed: true };
  }
  
  recordUpload(): void {
    this.uploadTimes.push(Date.now());
  }
  
  reset(): void {
    this.uploadTimes = [];
  }
}

// Enhanced useFileUpload hook with comprehensive security
export const useFileUpload = (language: 'en' | 'id' = 'en') => {
  const [documents, setDocuments] = useState<Record<string, File>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, UploadStatus>>({});
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [validationHistory, setValidationHistory] = useState<Array<{
    fileName: string;
    timestamp: number;
    isValid: boolean;
    flags: string[];
  }>>([]);
  
  const translations = uploadTranslations[language];
  
  // Rate limiter instance
  const rateLimiter = useMemo(() => new FileUploadRateLimiter(), []);
  
  // Enhanced file change handler with comprehensive validation
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // Clear previous errors
    setError("");
    
    if (!file) {
      return;
    }
    
    // Check rate limiting
    const rateLimitCheck = rateLimiter.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      setError(`${translations.rateLimitExceeded} ${rateLimitCheck.remainingTime ? `(${rateLimitCheck.remainingTime}s)` : ''}`);
      return;
    }
    
    setLoading(true);
    
    try {
      // Record upload attempt
      rateLimiter.recordUpload();
      
      // Comprehensive file validation
      const validationResult = await comprehensiveFileValidation(file);
      
      // Update validation history
      setValidationHistory(prev => [...prev, {
        fileName: file.name,
        timestamp: Date.now(),
        isValid: validationResult.isValid,
        flags: validationResult.securityFlags || []
      }].slice(-20)); // Keep only last 20 entries
      
      if (!validationResult.isValid) {
        const errorKey = validationResult.error as keyof UploadTranslations;
        setError(translations[errorKey] || translations.validationError);
        return;
      }
      
      // Generate file hash for integrity checking
      const fileHash = await generateFileHash(file);
      
      // Update documents state
      const newDocuments = { ...documents };
      newDocuments['allRequirements'] = file;
      setDocuments(newDocuments);
      
      // Update upload status
      const newUploadStatus = { ...uploadStatus };
      newUploadStatus['allRequirements'] = formatUploadStatus(file, validationResult, fileHash);
      setUploadStatus(newUploadStatus);
      
      // Log successful validation (for debugging in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('File validation successful:', {
          fileName: file.name,
          size: file.size,
          type: file.type,
          hash: fileHash.substring(0, 12),
          flags: validationResult.securityFlags
        });
      }
      
    } catch (validationError) {
      console.error('File validation error:', validationError);
      setError(translations.validationError);
    } finally {
      setLoading(false);
    }
  }, [documents, uploadStatus, translations, rateLimiter]);
  
  // Enhanced reset function
  const resetFileUpload = useCallback(() => {
    setDocuments({});
    setUploadStatus({});
    setError("");
    setLoading(false);
    rateLimiter.reset();
    // Keep validation history for security auditing
  }, [rateLimiter]);
  
  // File removal handler
  const removeFile = useCallback((key: string) => {
    const newDocuments = { ...documents };
    delete newDocuments[key];
    setDocuments(newDocuments);
    
    const newUploadStatus = { ...uploadStatus };
    delete newUploadStatus[key];
    setUploadStatus(newUploadStatus);
    
    setError("");
  }, [documents, uploadStatus]);
  
  // Get validation summary for security monitoring
  const getValidationSummary = useCallback(() => {
    const totalAttempts = validationHistory.length;
    const successfulUploads = validationHistory.filter(entry => entry.isValid).length;
    const failedUploads = totalAttempts - successfulUploads;
    const flagCounts = validationHistory.reduce((acc, entry) => {
      entry.flags.forEach(flag => {
        acc[flag] = (acc[flag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalAttempts,
      successfulUploads,
      failedUploads,
      flagCounts,
      successRate: totalAttempts > 0 ? Math.round((successfulUploads / totalAttempts) * 100) : 0
    };
  }, [validationHistory]);
  
  // Security status checker
  const getSecurityStatus = useCallback(() => {
    const hasFiles = Object.keys(documents).length > 0;
    const allFilesSecure = Object.values(uploadStatus).every(status => status.isSecure);
    const hasErrors = error !== "";
    const recentFailures = validationHistory.slice(-5).filter(entry => !entry.isValid).length;
    
    return {
      hasFiles,
      allFilesSecure,
      hasErrors,
      recentFailures,
      isSecure: hasFiles && allFilesSecure && !hasErrors && recentFailures < 3,
      riskLevel: recentFailures > 2 ? 'high' : recentFailures > 0 ? 'medium' : 'low'
    };
  }, [documents, uploadStatus, error, validationHistory]);
  
  // Get file info for display
  const getFileInfo = useCallback((key: string) => {
    const file = documents[key];
    const status = uploadStatus[key];
    
    if (!file || !status) return null;
    
    return {
      file,
      status,
      isValid: status.isSecure,
      size: status.size,
      type: status.type,
      flags: status.validationFlags
    };
  }, [documents, uploadStatus]);
  
  return {
    // Original interface
    documents,
    uploadStatus,
    error,
    handleFileChange,
    resetFileUpload,
    
    // Enhanced interface
    loading,
    removeFile,
    validationHistory,
    getValidationSummary,
    getSecurityStatus,
    getFileInfo,
    
    // Security utilities
    rateLimiter,
    
    // Status indicators
    isProcessing: loading,
    hasValidFiles: Object.keys(documents).length > 0 && Object.values(uploadStatus).every(s => s.isSecure)
  };
};