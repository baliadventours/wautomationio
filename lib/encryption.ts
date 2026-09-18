import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for GCM

function getEncryptionKey(): Buffer {
  const secret = process.env.INSTANCE_TOKEN_ENCRYPTION_SECRET || 'wapilot-default-dev-secret-key-32b!!';
  // Derive deterministic 32-byte key
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive string (e.g. Evolution API instance token) using AES-256-GCM
 */
export function encryptToken(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Return format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts sensitive string using AES-256-GCM
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return '';
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    // Unencrypted or invalid fallback
    return encryptedData;
  }
  
  try {
    const [ivHex, authTagHex, encryptedText] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    return '';
  }
}
