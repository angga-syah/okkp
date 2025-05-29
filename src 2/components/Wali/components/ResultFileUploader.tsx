// src/components/Wali/components/ResultFileUploader.tsx
import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, AlertTriangle, Check, X, Shield, Clock } from 'lucide-react';

interface ResultFileUploaderProps {
  orderId: string;
  onUploadComplete: (orderId: string, filePath: string) => void;
}

// File security configuration matching backend
const FILE_SECURITY = {
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB limit
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/zip',
    'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'  
  ],
  ALLOWED_EXTENSIONS: [
    '.pdf', '.jpg', '.jpeg', '.png',
    '.zip',
  ]
};

// Input sanitization function
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>\"'&]/g, '') // Remove XSS characters
    .replace(/[^\w\s\-\.]/g, '') // Only allow alphanumeric, spaces, hyphens, dots
    .substring(0, 255); // Limit length
};

// Client-side file validation
const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > FILE_SECURITY.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File terlalu besar. Maksimal ${FILE_SECURITY.MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  // Check empty file
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File kosong tidak diperbolehkan'
    };
  }

  // Check MIME type
  if (!FILE_SECURITY.ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Tipe file tidak diperbolehkan'
    };
  }

  // Check file extension
  const filename = file.name.toLowerCase();
  const hasValidExtension = FILE_SECURITY.ALLOWED_EXTENSIONS.some(ext => 
    filename.endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      isValid: false,
      error: 'Ekstensi file tidak diperbolehkan'
    };
  }

  // Check for suspicious patterns in filename
  const suspiciousPatterns = [
    /\.\./,
    /[<>:"|?*]/,
    /\x00/,
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.jar$/i,
    /\.com$/i,
    /\.pif$/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filename)) {
      return {
        isValid: false,
        error: 'Nama file mencurigakan terdeteksi'
      };
    }
  }

  return { isValid: true };
};

export default function ResultFileUploader({ orderId, onUploadComplete }: ResultFileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sanitize orderId on prop change
  const sanitizedOrderId = sanitizeInput(orderId);

  // Countdown effect for rate limiting
  useEffect(() => {
    if (retryAfter > 0) {
      const timer = setTimeout(() => setRetryAfter(retryAfter - 1), 1000);
      return () => clearTimeout(timer);
    } else if (rateLimited && retryAfter === 0) {
      setRateLimited(false);
    }
  }, [retryAfter, rateLimited]);

  // Use useEffect to ensure showConfirmation is updated after file state change
  useEffect(() => {
    if (file) {
      const validation = validateFile(file);
      if (!validation.isValid) {
        setError(validation.error || 'File tidak valid');
        setFile(null);
        setShowConfirmation(false);
        return;
      }
      setError('');
      setShowConfirmation(true);
    }
  }, [file]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  };

  const handleUpload = async (sendEmail: boolean) => {
    if (!file || rateLimited) return;

    setUploading(true);
    setError("");
    setUploadProgress(0);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('orderId', sanitizedOrderId);
      formData.append('sendEmail', sendEmail ? 'true' : 'false');
      
      const response = await fetch('/api/upload-result', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      clearInterval(progressInterval);
      
      if (response.status === 429) {
        setRateLimited(true);
        if (data.retryAfter) {
          setRetryAfter(data.retryAfter);
        } else if (data.lockoutDuration) {
          setRetryAfter(data.lockoutDuration);
        }
        setError(data.error || 'Terlalu banyak percobaan. Silakan tunggu sebelum mencoba lagi.');
        setUploadProgress(0);
        return;
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengunggah file');
      }
      
      setUploadProgress(100);
      
      // Show success briefly
      setTimeout(() => {
        onUploadComplete(sanitizedOrderId, data.filePath);
        setFile(null);
        setShowConfirmation(false);
        setUploadProgress(0);
      }, 1000);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message);
      setUploadProgress(0);
      clearInterval(progressInterval);
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    setFile(null);
    setShowConfirmation(false);
    setError('');
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return '🖼️';
    } else if (fileType === 'application/pdf') {
      return '📄';
    } else if (fileType.includes('zip')) {
      return '📦';
    } else if (fileType.includes('document') || fileType.includes('word')) {
      return '📝';
    } else if (fileType.includes('sheet') || fileType.includes('excel')) {
      return '📊';
    } else {
      return '📄';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Rate Limit Warning */}
      {rateLimited && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">
              Tunggu {retryAfter} detik sebelum mencoba lagi
            </span>
          </div>
        </div>
      )}

      {!file && !showConfirmation ? (
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          } ${rateLimited ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !rateLimited && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={rateLimited}
            accept={FILE_SECURITY.ALLOWED_EXTENSIONS.join(',')}
          />
          <div className="flex flex-col items-center space-y-2">
            <Upload className={`h-8 w-8 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            <div className="text-gray-500 dark:text-gray-400">
              <p className="text-sm font-medium">
                {dragActive ? 'Lepas file di sini' : 'Tarik file atau klik untuk memilih'}
              </p>
              <p className="text-xs mt-1">
                Maksimal {FILE_SECURITY.MAX_FILE_SIZE / (1024 * 1024)}MB • 
                {FILE_SECURITY.ALLOWED_EXTENSIONS.slice(0, 5).join(', ')}
                {FILE_SECURITY.ALLOWED_EXTENSIONS.length > 5 && `, +${FILE_SECURITY.ALLOWED_EXTENSIONS.length - 5} lainnya`}
              </p>
            </div>
          </div>
        </div>
      ) : showConfirmation && file ? (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-4">
          {/* File Info */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-2xl">
              {getFileIcon(file.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(file.size)} • {file.type}
              </p>
              <div className="flex items-center mt-1">
                <Shield className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600 dark:text-green-400">
                  File berhasil divalidasi
                </span>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {uploadProgress === 100 ? 'Upload selesai!' : `Mengunggah... ${uploadProgress}%`}
                </span>
                {uploadProgress === 100 && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => handleUpload(true)}
              className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded px-3 py-2 text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
              disabled={uploading || rateLimited}
            >
              <span>✉️</span>
              <span>{uploading ? 'Mengunggah...' : 'Ya, Kirim ke Pelanggan'}</span>
            </button>
            <button
              onClick={() => handleUpload(false)}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded px-3 py-2 text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
              disabled={uploading || rateLimited}
            >
              <span>💾</span>
              <span>Simpan Saja</span>
            </button>
            <button
              onClick={cancelUpload}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded px-3 py-2 text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
              disabled={uploading}
            >
              <X className="h-3 w-3" />
              <span>Batal</span>
            </button>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-red-700 dark:text-red-400">{error}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Fallback state
        <div className="border border-red-300 dark:border-red-600 rounded-lg p-4 text-red-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="text-sm">Terjadi kesalahan. Silakan coba lagi.</span>
            </div>
            <button
              onClick={cancelUpload}
              className="bg-gray-500 hover:bg-gray-600 text-white rounded px-3 py-1 text-xs"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}