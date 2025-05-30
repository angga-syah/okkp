// lib/sb.ts (modified)
import { createClient } from '@supabase/supabase-js';
import { encryptFile } from './encryption';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client with service key for admin operations (used only server-side)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Client for client-side operations
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export interface CustomerData {
  name: string;
  email: string;
  service_id: number;
  service_name: string;
  invoice_id?: string;
  payment_url?: string;
  status: string;
  language?: string;
}

/**
 * Helper function to get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'application/zip': '.zip'
  };

  return mimeToExt[mimeType] || '.bin';
}

/**
 * Stores customer data in Supabase and uploads the associated document
 * @param customerData Customer information
 * @param documentData Document file as Buffer or Blob
 * @param customStoragePath Optional custom storage path for the document
 */
export async function storeCustomerData(
  customerData: CustomerData,
  documentData: Buffer | Blob, // Accept either Buffer or Blob
  customStoragePath?: string
): Promise<{ success: boolean; id?: string; error?: any }> {
  try {
    // Ensure all string fields are properly sanitized as strings, not arrays
    const sanitizedData = {
      ...customerData,
      name: typeof customerData.name === 'string' ? customerData.name : String(customerData.name),
      email: typeof customerData.email === 'string' ? customerData.email : String(customerData.email),
      service_name: typeof customerData.service_name === 'string' ? customerData.service_name : String(customerData.service_name),
      invoice_id: customerData.invoice_id ? 
        (typeof customerData.invoice_id === 'string' ? customerData.invoice_id : String(customerData.invoice_id)) : 
        undefined,
      payment_url: customerData.payment_url ? 
        (typeof customerData.payment_url === 'string' ? customerData.payment_url : String(customerData.payment_url)) : 
        undefined,
      status: typeof customerData.status === 'string' ? customerData.status : String(customerData.status)
    };
    
    // Insert sanitized customer data into the orders table
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([sanitizedData])
      .select('id');
      
    if (orderError) {
      return { success: false, error: orderError };
    }
    
    if (!order || order.length === 0) {
      return { success: false, error: 'Failed to insert order' };
    }

    const orderId = order[0].id;

    // Upload the document to Storage
    let filePath;
    
    if (customStoragePath) {
      // Use provided custom path if available
      filePath = customStoragePath;
    } else {
      // Generate a unique filename with consistent path structure
      const timestamp = new Date().getTime();
      const filename = `${orderId}_${timestamp}_document`;
      
      // Determine document type for file extension
      let contentType = 'application/octet-stream';
      let fileExtension = '.bin';
      
      // Check if we have a Blob with type info or try to infer from Buffer
      if (documentData instanceof Blob) {
        contentType = documentData.type || contentType;
        fileExtension = getFileExtension(contentType);
      }
      
      const fullFilename = `${filename}${fileExtension}`;
      
      // Use documents/upload path for consistency with revision uploads
      filePath = `documents/upload/${fullFilename}`;
    }

    // Convert Blob to Buffer if needed
    let documentBuffer: Buffer;
    if (documentData instanceof Blob) {
      const arrayBuffer = await documentData.arrayBuffer();
      documentBuffer = Buffer.from(arrayBuffer);
    } else {
      documentBuffer = documentData;
    }
    
    // Encrypt the document data using the orderId as a unique identifier
    const encryptionEnabled = process.env.ENABLE_DOCUMENT_ENCRYPTION === 'true';
    let encryptionMetadata: string | null = null;
    let fileToUpload: Buffer;
    
    if (encryptionEnabled) {
      try {
        // Encrypt the file
        const encryptedData = encryptFile(documentBuffer, orderId);
        // Convert to JSON and encode as base64 for storage
        encryptionMetadata = Buffer.from(JSON.stringify(encryptedData)).toString('base64');
        // Prepare placeholder file with encrypted data
        fileToUpload = Buffer.from(encryptedData.data, 'base64');
      } catch (encryptionError) {
        console.error('Encryption error:', encryptionError);
        return { success: false, error: 'Failed to encrypt document' };
      }
    } else {
      // No encryption, use original file
      fileToUpload = documentBuffer;
    }
    
    // Get content type from Blob or use default for Buffer
    const contentType = documentData instanceof Blob ? documentData.type : 'application/octet-stream';

    // Upload to the specified path
    const { data: fileData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, fileToUpload, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: true // Allow overwriting if file exists
      });
      
    if (uploadError) {
      return { success: true, id: orderId, error: uploadError };
    }
    
    // Update the order with the document filepath and encryption metadata
    const finalPath = fileData?.path || filePath;
    const updateData: any = { document_path: finalPath };
    
    // Add encryption metadata if encryption was used
    if (encryptionEnabled && encryptionMetadata) {
      updateData.encryption_metadata = encryptionMetadata;
      updateData.encryption_version = 1; // Version 1 of our encryption scheme
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
      
    if (updateError) {
      console.error('Error updating order with document path:', updateError);
    }
    
    return { success: true, id: orderId };
  } catch (error) {
    return { success: false, error };
  }
}