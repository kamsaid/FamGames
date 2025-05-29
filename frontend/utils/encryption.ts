// Encryption utility for Memory Vault - Client-side AES-256-GCM encryption
// This ensures end-to-end encryption where family data is encrypted before upload

/**
 * Generate a random encryption key for AES-256-GCM
 * @returns Promise<CryptoKey> - A 256-bit AES key
 */
export const generateEncryptionKey = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // Key is extractable
    ['encrypt', 'decrypt']
  );
};

/**
 * Export a CryptoKey to base64 string for storage
 * @param key - The CryptoKey to export
 * @returns Promise<string> - Base64 encoded key
 */
export const exportKeyToBase64 = async (key: CryptoKey): Promise<string> => {
  const exported = await crypto.subtle.exportKey('raw', key);
  const uint8Array = new Uint8Array(exported);
  const base64String = btoa(String.fromCharCode(...uint8Array));
  return base64String;
};

/**
 * Import a base64 encoded key back to CryptoKey
 * @param base64Key - Base64 encoded key string
 * @returns Promise<CryptoKey> - Imported CryptoKey
 */
export const importKeyFromBase64 = async (base64Key: string): Promise<CryptoKey> => {
  const binaryString = atob(base64Key);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return await crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt data using AES-256-GCM
 * @param data - Data to encrypt (string or Uint8Array)
 * @param key - CryptoKey for encryption
 * @returns Promise<EncryptedData> - Encrypted data with IV
 */
export const encryptData = async (
  data: string | Uint8Array,
  key: CryptoKey
): Promise<{
  encryptedData: Uint8Array;
  iv: Uint8Array;
  base64EncryptedData: string;
  base64IV: string;
}> => {
  // Generate random initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  
  // Convert string to Uint8Array if needed
  const dataToEncrypt = typeof data === 'string' 
    ? new TextEncoder().encode(data)
    : data;
  
  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataToEncrypt
  );
  
  const encryptedUint8Array = new Uint8Array(encryptedData);
  
  // Convert to base64 for storage/transmission
  const base64EncryptedData = btoa(String.fromCharCode(...encryptedUint8Array));
  const base64IV = btoa(String.fromCharCode(...iv));
  
  return {
    encryptedData: encryptedUint8Array,
    iv,
    base64EncryptedData,
    base64IV,
  };
};

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Base64 encoded encrypted data or Uint8Array
 * @param iv - Base64 encoded IV or Uint8Array
 * @param key - CryptoKey for decryption
 * @returns Promise<string> - Decrypted data as string
 */
export const decryptData = async (
  encryptedData: string | Uint8Array,
  iv: string | Uint8Array,
  key: CryptoKey
): Promise<string> => {
  // Convert base64 to Uint8Array if needed
  const encryptedBytes = typeof encryptedData === 'string'
    ? new Uint8Array(atob(encryptedData).split('').map(char => char.charCodeAt(0)))
    : encryptedData;
    
  const ivBytes = typeof iv === 'string'
    ? new Uint8Array(atob(iv).split('').map(char => char.charCodeAt(0)))
    : iv;
  
  // Decrypt the data
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    encryptedBytes
  );
  
  // Convert back to string
  return new TextDecoder().decode(decryptedData);
};

/**
 * Encrypt a file/blob for memory vault storage
 * @param file - File or Blob to encrypt
 * @param key - CryptoKey for encryption
 * @returns Promise<EncryptedFile> - Encrypted file data with metadata
 */
export const encryptFile = async (
  file: File | Blob,
  key: CryptoKey
): Promise<{
  encryptedBlob: Blob;
  iv: string;
  originalName?: string;
  originalSize: number;
  mimeType: string;
}> => {
  // Read file as array buffer
  const arrayBuffer = await file.arrayBuffer();
  const fileData = new Uint8Array(arrayBuffer);
  
  // Encrypt the file data
  const { encryptedData, base64IV } = await encryptData(fileData, key);
  
  // Create encrypted blob
  const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
  
  return {
    encryptedBlob,
    iv: base64IV,
    originalName: file instanceof File ? file.name : undefined,
    originalSize: file.size,
    mimeType: file.type || 'application/octet-stream',
  };
};

/**
 * Decrypt a file/blob from memory vault
 * @param encryptedBlob - Encrypted blob data
 * @param iv - Base64 encoded IV
 * @param key - CryptoKey for decryption
 * @param originalMimeType - Original file MIME type
 * @returns Promise<Blob> - Decrypted file as blob
 */
export const decryptFile = async (
  encryptedBlob: Blob,
  iv: string,
  key: CryptoKey,
  originalMimeType: string = 'application/octet-stream'
): Promise<Blob> => {
  // Read encrypted blob as array buffer
  const encryptedArrayBuffer = await encryptedBlob.arrayBuffer();
  const encryptedData = new Uint8Array(encryptedArrayBuffer);
  
  // Decrypt the file data
  const decryptedDataString = await decryptData(encryptedData, iv, key);
  
  // Convert decrypted string back to binary data
  const decryptedBytes = new Uint8Array(decryptedDataString.length);
  for (let i = 0; i < decryptedDataString.length; i++) {
    decryptedBytes[i] = decryptedDataString.charCodeAt(i);
  }
  
  // Create decrypted blob with original MIME type
  return new Blob([decryptedBytes], { type: originalMimeType });
};

/**
 * Generate a user-friendly key hint for family members
 * This should be something memorable but not revealing the actual key
 * @param keyPhrase - A memorable phrase chosen by the user
 * @returns string - Hint to help remember the key
 */
export const generateKeyHint = (keyPhrase: string): string => {
  // Create a simple hint based on the phrase
  const words = keyPhrase.trim().split(' ');
  if (words.length === 1) {
    return `Single word starting with "${words[0].charAt(0).toUpperCase()}"`;
  } else {
    return `${words.length} words: "${words[0].charAt(0).toUpperCase()}" ... "${words[words.length - 1].charAt(0).toUpperCase()}"`;
  }
};

// Type definitions for encrypted data
export interface EncryptedMemoryItem {
  id?: string;
  title: string;
  description?: string;
  memoryType: 'photo' | 'video' | 'note' | 'document';
  encryptedData: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded IV
  keyHint: string;
  metadata: {
    originalFileName?: string;
    originalSize: number;
    mimeType: string;
    tags?: string[];
    dateTaken?: string;
    location?: string;
  };
  createdAt: string;
  createdBy: string;
} 