//E:\kp\New folder\src\components\Order\upload.ts
import { useState } from 'react';

// Define interfaces for better type safety
interface UploadStatus {
  name: string;
  size: string;
}


export const uploadTranslations = {
  en: {
    fileTooLarge: "File size too large. Maximum 10MB.",
    formatNotSupported: "File format not supported. Use PDF, JPG, PNG, or ZIP.",
    unknownFileFormat: "File format not supported."
  },
  id: {
    fileTooLarge: "Ukuran file terlalu besar. Maksimal 10MB.",
    formatNotSupported: "Format file tidak didukung. Gunakan PDF, JPG, PNG, atau ZIP.",
    unknownFileFormat: "Format file tidak didukung."
  }
};

export const useFileUpload = (language: 'en' | 'id' = 'en') => {
  const [documents, setDocuments] = useState<Record<string, File>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, UploadStatus>>({});
  const [error, setError] = useState<string>("");
  const translations = uploadTranslations[language];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError(translations.fileTooLarge);
      return;
    }
    
    // Check file extension instead of relying solely on MIME type
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'zip', 'rar'];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      setError(translations.formatNotSupported);
      return;
    }
    
    // Additional MIME type check for common formats
    const allowedMimeTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/png', 
      'application/zip', 
      'application/x-zip-compressed',
      'application/vnd.rar',
      'application/x-rar-compressed'
    ];
    
    // Check if either extension is valid or MIME type is valid
    const isValidFile = allowedExtensions.includes(extension) || 
                        allowedMimeTypes.includes(file.type);
                        
    if (!isValidFile) {
      setError(translations.formatNotSupported);
      return;
    }
    
    // Check for potentially malicious files (basic check)
    if (file.name.match(/\.(exe|php|js|jsp|asp|aspx)$/i)) {
      setError(translations.unknownFileFormat);
      return;
    }
    
    const newDocuments = { ...documents };
    newDocuments['allRequirements'] = file;
    
    // Update upload status
    const newUploadStatus = { ...uploadStatus };
    newUploadStatus['allRequirements'] = {
      name: file.name,
      size: (file.size / 1024).toFixed(2) + " KB"
    };
    
    setDocuments(newDocuments);
    setUploadStatus(newUploadStatus);
    setError(""); // Clear any previous errors
  };

  const resetFileUpload = () => {
    setDocuments({});
    setUploadStatus({});
    setError("");
  };

  return {
    documents,
    uploadStatus,
    error,
    handleFileChange,
    resetFileUpload
  };
};