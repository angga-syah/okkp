// lib/encryption.ts
import crypto from 'crypto';

// Configuration constants
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

// Interface for encrypted data
export interface EncryptedData {
  iv: string;       // Initialization vector (Base64)
  data: string;     // Encrypted content (Base64)
  authTag: string;  // Authentication tag (Base64)
}

/**
 * Generate a secure encryption key from the master key and a document-specific identifier
 * @param masterKey The application master key
 * @param documentId Document identifier used for key derivation
 * @returns Derived encryption key
 */
function deriveEncryptionKey(masterKey: string, documentId: string): Buffer {
  return crypto.pbkdf2Sync(
    masterKey,
    documentId,
    10000, // Iterations
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypt file data
 * @param buffer Raw file data to encrypt
 * @param documentId Unique document identifier for key derivation
 * @returns Encrypted data object with iv, data, and authTag
 */
export function encryptFile(buffer: Buffer, documentId: string): EncryptedData {
  if (!process.env.DOCUMENT_ENCRYPTION_KEY) {
    throw new Error('DOCUMENT_ENCRYPTION_KEY is not set in environment variables');
  }
  
  // Create a unique derived key for this document
  const encryptionKey = deriveEncryptionKey(
    process.env.DOCUMENT_ENCRYPTION_KEY,
    documentId
  );
  
  // Generate a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);
  
  // Encrypt the data
  const encryptedData = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);
  
  // Get the authentication tag
  const authTag = cipher.getAuthTag();
  
  // Return encrypted data object with Base64 encoded values
  return {
    iv: iv.toString('base64'),
    data: encryptedData.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

/**
 * Decrypt file data
 * @param encryptedData Object containing encrypted data, iv, and authTag
 * @param documentId Document identifier used for key derivation
 * @returns Decrypted file buffer
 */
export function decryptFile(encryptedData: EncryptedData, documentId: string): Buffer {
  if (!process.env.DOCUMENT_ENCRYPTION_KEY) {
    throw new Error('DOCUMENT_ENCRYPTION_KEY is not set in environment variables');
  }
  
  // Derive the same key used for encryption
  const decryptionKey = deriveEncryptionKey(
    process.env.DOCUMENT_ENCRYPTION_KEY,
    documentId
  );
  
  try {
    // Convert Base64 strings back to buffers
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const encryptedBuffer = Buffer.from(encryptedData.data, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, decryptionKey, iv);
    
    // Set authentication tag
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    const decryptedData = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);
    
    return decryptedData;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt file: Authentication failed');
  }
}

/**
 * Generate a secure download password for customer access
 * @param orderId Order ID for password derivation
 * @returns Secure 8-character password containing numbers and letters
 */
export function generateDownloadPassword(orderId: string): string {
  // Create a deterministic but secure password based on order ID and secret
  const secret = process.env.DOWNLOAD_PASSWORD_SECRET || 'fallback-secret-key';
  const hash = crypto.createHmac('sha256', secret).update(orderId).digest('hex');
  
  // Convert hash to a readable password format
  // Use first 32 characters of hash and convert to alphanumeric
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, 1, I
  let password = '';
  
  for (let i = 0; i < 8; i++) {
    const byte = parseInt(hash.substr(i * 2, 2), 16);
    password += characters[byte % characters.length];
  }
  
  // Format as XXX-XXX for better readability
  return `${password.substr(0, 4)}-${password.substr(4, 4)}`;
}

/**
 * Verify download password for a specific order
 * @param orderId Order ID
 * @param providedPassword Password provided by user
 * @returns True if password is correct
 */
export function verifyDownloadPassword(orderId: string, providedPassword: string): boolean {
  const expectedPassword = generateDownloadPassword(orderId);
  return expectedPassword === providedPassword.toUpperCase().trim();
}

/**
 * Create a secure access token for document download
 * @param documentId Document ID to be accessed
 * @param expiresInSeconds How long the token should be valid (default: 7 days)
 * @returns Secure access token as a Base64 string
 */
export function createAccessToken(documentId: string, expiresInSeconds: number = 604800): string {
  if (!process.env.DOCUMENT_ACCESS_SECRET) {
    throw new Error('DOCUMENT_ACCESS_SECRET is not set in environment variables');
  }
  
  const payload = {
    documentId,
    timestamp: Date.now(),
    expiresAt: Date.now() + (expiresInSeconds * 1000)
  };
  
  // Sign the payload
  const hmac = crypto.createHmac('sha256', process.env.DOCUMENT_ACCESS_SECRET);
  hmac.update(JSON.stringify(payload));
  const signature = hmac.digest('base64');
  
  // Return the encoded token
  return Buffer.from(JSON.stringify({
    payload,
    signature
  })).toString('base64');
}

/**
 * Create admin access token (no password required)
 * @param documentId Document ID to be accessed
 * @param expiresInSeconds How long the token should be valid (default: 1 hour)
 * @returns Secure admin access token
 */
export function createAdminAccessToken(documentId: string, expiresInSeconds: number = 3600): string {
  if (!process.env.DOCUMENT_ACCESS_SECRET) {
    throw new Error('DOCUMENT_ACCESS_SECRET is not set in environment variables');
  }
  
  const payload = {
    documentId,
    timestamp: Date.now(),
    expiresAt: Date.now() + (expiresInSeconds * 1000),
    adminAccess: true // Flag for admin access
  };
  
  // Sign the payload
  const hmac = crypto.createHmac('sha256', process.env.DOCUMENT_ACCESS_SECRET);
  hmac.update(JSON.stringify(payload));
  const signature = hmac.digest('base64');
  
  // Return the encoded token
  return Buffer.from(JSON.stringify({
    payload,
    signature
  })).toString('base64');
}

/**
 * Verify an access token's validity
 * @param token Access token to verify
 * @returns Object with document ID and admin access flag if valid, null otherwise
 */
export function verifyAccessToken(token: string): { documentId: string; isAdmin: boolean } | null {
  if (!process.env.DOCUMENT_ACCESS_SECRET) {
    throw new Error('DOCUMENT_ACCESS_SECRET is not set in environment variables');
  }
  
  try {
    // Parse the token
    const { payload, signature } = JSON.parse(
      Buffer.from(token, 'base64').toString('utf8')
    );
    
    // Recreate the signature
    const hmac = crypto.createHmac('sha256', process.env.DOCUMENT_ACCESS_SECRET);
    hmac.update(JSON.stringify(payload));
    const expectedSignature = hmac.digest('base64');
    
    // Verify signature and expiration
    if (
      signature === expectedSignature && 
      payload.expiresAt > Date.now()
    ) {
      return {
        documentId: payload.documentId,
        isAdmin: payload.adminAccess || false
      };
    }
    
    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Helper function to encrypt and upload a document to Supabase storage
 * @param fileBuffer Document as Buffer
 * @param documentId Unique identifier for the document (order ID)
 * @param filePath Storage path for the encrypted file
 * @param contentType MIME type of the file
 * @param supabaseAdmin Supabase admin client instance
 * @returns Upload result and encryption metadata
 */
export async function encryptAndUploadDocument(
  fileBuffer: Buffer,
  documentId: string,
  filePath: string,
  contentType: string,
  supabaseAdmin: any
) {
  const encryptionEnabled = process.env.ENABLE_DOCUMENT_ENCRYPTION === 'true';
  
  if (!encryptionEnabled) {
    // Just upload the original file
    return {
      uploadResult: await supabaseAdmin.storage
        .from('documents')
        .upload(filePath, fileBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: true
        }),
      encryptionMetadata: null,
      encryptionVersion: null
    };
  }
  
  // Encrypt the file
  const encryptedData = encryptFile(fileBuffer, documentId);
  
  // Convert to Base64 for storage
  const encryptionMetadata = Buffer.from(JSON.stringify(encryptedData)).toString('base64');
  
  // Upload the encrypted data
  const uploadResult = await supabaseAdmin.storage
    .from('documents')
    .upload(filePath, Buffer.from(encryptedData.data, 'base64'), {
      contentType,
      cacheControl: '3600',
      upsert: true
    });
    
  // Return both upload result and encryption metadata  
  return {
    uploadResult,
    encryptionMetadata,
    encryptionVersion: 1
  };
}