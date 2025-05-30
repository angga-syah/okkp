// src/lib/upload.ts 
// //berita
import { v4 as uuidv4 } from 'uuid';
import { supabaseClient } from '@/lib/sb_client';
import { toast } from 'react-hot-toast';

/**
 * Type definitions for upload options
 */
interface UploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  bucket?: string;
  folder?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Default upload options
 */
const defaultOptions: UploadOptions = {
  maxSizeMB: 5, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  bucket: 'news_media',
  folder: 'images',
  onProgress: undefined
};

/**
 * Enhanced image upload function with validation, progress, and error handling
 * Fixed to address RLS policy issues
 */
export async function uploadImage(file: File, options: UploadOptions = {}): Promise<string> {
  // Merge with default options
  const config = { ...defaultOptions, ...options };
  
  // Validate file type
  if (config.allowedTypes && !config.allowedTypes.includes(file.type)) {
    const formattedTypes = config.allowedTypes.map(type => type.replace('image/', '').toUpperCase()).join(', ');
    throw new Error(`Format file tidak valid. Hanya ${formattedTypes} yang diizinkan.`);
  }

  // Validate file size
  const maxSize = config.maxSizeMB ? config.maxSizeMB * 1024 * 1024 : Infinity;
  if (file.size > maxSize) {
    throw new Error(`Ukuran file terlalu besar. Maksimal ${config.maxSizeMB}MB.`);
  }

  // Create a unique filename
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${uuidv4()}.${fileExt}`;
  
  // Create filePath - make sure folder has no leading or trailing slashes
  const folder = config.folder?.replace(/^\/|\/$/g, '') || '';
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  // Setup progress simulation if callback provided
  let progressInterval: NodeJS.Timeout | null = null;
  
  if (config.onProgress) {
    config.onProgress(0);
    let progress = 0;
    progressInterval = setInterval(() => {
      progress += 5;
      if (progress >= 90) {
        clearInterval(progressInterval!);
        progress = 90;
      }
      config.onProgress!(progress);
    }, 100);
  }

  try {
    // Upload to Supabase Storage with upsert: true to avoid duplicate errors
    const { data, error } = await supabaseClient.storage
      .from(config.bucket || 'news_media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // This is important to avoid RLS policy errors
      });

    // Clear progress interval if it exists
    if (progressInterval) {
      clearInterval(progressInterval);
      config.onProgress!(100);
    }

    if (error) {
      console.error('Supabase storage error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(config.bucket || 'news_media')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error: any) {
    // Clear progress interval if it exists
    if (progressInterval) {
      clearInterval(progressInterval);
      config.onProgress!(0);
    }
    
    console.error('Error uploading image:', error);
    
    // More descriptive error message
    let errorMessage = 'Gagal mengunggah gambar';
    
    if (error.message) {
      errorMessage += `: ${error.message}`;
    } else if (error.error_description) {
      errorMessage += `: ${error.error_description}`;
    } else if (error.statusCode === 403) {
      errorMessage += ': Anda tidak memiliki izin untuk mengunggah file. Silakan periksa konfigurasi RLS di bucket storage.';
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Helper function specifically for news featured images
 */
export async function uploadNewsImage(file: File, onProgress?: (progress: number) => void): Promise<string> {
  return uploadImage(file, {
    folder: 'news_featured', // Simplified folder name
    onProgress
  });
}

/**
 * Helper function specifically for editor content images
 */
export async function uploadEditorImage(file: File, onProgress?: (progress: number) => void): Promise<string> {
  return uploadImage(file, {
    folder: 'news_content', // Simplified folder name
    onProgress
  });
}

/**
 * Helper function to handle file input change event and upload image
 */
export async function handleImageUpload(
  e: React.ChangeEvent<HTMLInputElement>, 
  options: UploadOptions = {}
): Promise<string | null> {
  const files = e.target.files;
  if (!files || files.length === 0) return null;
  
  const file = files[0];
  const toastId = toast.loading('Mempersiapkan unggahan...');
  
  try {
    const imageUrl = await uploadImage(file, {
      ...options,
      onProgress: (progress) => {
        toast.loading(`Mengunggah gambar... ${progress}%`, { id: toastId });
        if (options.onProgress) options.onProgress(progress);
      }
    });
    
    toast.success('Gambar berhasil diunggah', { id: toastId });
    return imageUrl;
  } catch (error:   any) {
    toast.error(error.message || 'Gagal mengunggah gambar', { id: toastId });
    return null;
  } finally {
    // Reset file input value to allow reuploading the same file
    if (e.target) {
      e.target.value = '';
    }
  }
}