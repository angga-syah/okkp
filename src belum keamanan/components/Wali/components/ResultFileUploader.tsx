// E:\kp\New folder\src\components\Wali\components\ResultFileUploader.tsx
import { useState, useRef, useEffect } from 'react';

interface ResultFileUploaderProps {
  orderId: string;
  onUploadComplete: (orderId: string, filePath: string) => void;
}

export default function ResultFileUploader({ orderId, onUploadComplete }: ResultFileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use useEffect to ensure showConfirmation is updated after file state change
  useEffect(() => {
    if (file) {
      setShowConfirmation(true);
    }
  }, [file]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
    setUploading(true);
    setError("");
    
    try {
      const formData = new FormData();
      if (!file) throw new Error("No file selected");
      
      formData.append('file', file);
      formData.append('orderId', orderId);
      formData.append('sendEmail', sendEmail ? 'true' : 'false');
      
      const response = await fetch('/api/upload-result', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengunggah file');
      }
      
      onUploadComplete(orderId, data.filePath);
      setFile(null);
      setShowConfirmation(false);
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    setFile(null);
    setShowConfirmation(false);
  };

  return (
    <div className="w-full">
      {!file && !showConfirmation ? (
        <div 
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-xs">Tarik file atau klik untuk memilih</p>
          </div>
        </div>
      ) : showConfirmation && file ? (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {file?.name} ({file && (file.size / 1024).toFixed(1)} KB)
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => handleUpload(true)}
              className="bg-green-500 hover:bg-green-600 text-white rounded px-3 py-1 text-xs"
              disabled={uploading}
            >
              {uploading ? 'Mengunggah...' : 'Ya, Kirim ke Pelanggan'}
            </button>
            <button
              onClick={() => handleUpload(false)}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1 text-xs"
              disabled={uploading}
            >
              Simpan Saja
            </button>
            <button
              onClick={cancelUpload}
              className="bg-gray-500 hover:bg-gray-600 text-white rounded px-3 py-1 text-xs"
              disabled={uploading}
            >
              Batal
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      ) : (
        // Added a fallback state - should never reach here, but just in case
        <div className="border border-red-300 dark:border-red-600 rounded-lg p-4 text-red-500">
          Terjadi kesalahan. Silakan coba lagi.
          <button
            onClick={cancelUpload}
            className="ml-2 bg-gray-500 hover:bg-gray-600 text-white rounded px-3 py-1 text-xs"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}