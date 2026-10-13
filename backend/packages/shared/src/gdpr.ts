import crypto from 'node:crypto';

// ── GDPR Encryption Keys & Configuration ─────────────────────────────────────
// Uses AES-256-GCM for authenticated field-level encryption of patient PII
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

// In production, loaded from environment or HSM/KMS (AWS KMS, GCP KMS, Vault)
const DEFAULT_DEV_KEY = 'clinvo_gdpr_aes256_secret_key_prod_2026_secure!';
const DEFAULT_BLIND_INDEX_PEPPER = 'clinvo_blind_index_hmac_pepper_2026_patient_privacy';

function getEncryptionKey(): Buffer {
  const rawKey = process.env.CLINVO_GDPR_ENCRYPTION_KEY || DEFAULT_DEV_KEY;
  return crypto.createHash('sha256').update(rawKey).digest();
}

function getBlindIndexKey(): Buffer {
  const rawKey = process.env.CLINVO_GDPR_BLIND_KEY || DEFAULT_BLIND_INDEX_PEPPER;
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypt sensitive Patient PII field using AES-256-GCM.
 * Stored format: "enc:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>"
 */
export function encryptPatientField(plaintext: string): string {
  if (!plaintext || plaintext.startsWith('enc:') || plaintext === '[ANONYMIZED_GDPR_ARTICLE_17]') {
    return plaintext;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive Patient PII field using AES-256-GCM.
 * Validates GCM authentication tag to protect against ciphertext tampering.
 */
export function decryptPatientField(encryptedString?: string | null): string {
  if (!encryptedString) return '';
  if (encryptedString === '[ANONYMIZED_GDPR_ARTICLE_17]') {
    return '[ANONYMIZED — GDPR Right to Erasure]';
  }
  if (!encryptedString.startsWith('enc:')) {
    return encryptedString; // Return as-is if unencrypted or legacy
  }

  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 4) return encryptedString;

    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const ciphertext = parts[3];

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt patient field (possible tampering or invalid key):', error);
    return '[ENCRYPTED_PII_PROTECTED]';
  }
}

/**
 * Generates a blind index / cryptographic hash (HMAC-SHA256).
 * Allows searching by phone number or name without storing plaintext in SQL database.
 */
export function hashBlindIndex(value?: string | null): string | null {
  if (!value || !value.trim()) return null;
  // Normalize value (strip spaces, lowercase)
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
  const key = getBlindIndexKey();
  return crypto.createHmac('sha256', key).update(normalized).digest('hex');
}

/**
 * Generate a cryptographically random, non-identifying patient pseudonym.
 * Complies with GDPR Recital 26 & Article 4(5) (Pseudonymisation).
 * Example: "CLNV-PAT-4B82-E19A"
 */
export function generatePatientPseudonym(): string {
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  const chunk1 = randomHex.slice(0, 4);
  const chunk2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CLNV-PAT-${chunk1}-${chunk2}`;
}

export interface PatientDsarRecord {
  pseudonymId: string;
  receiptNumber: string;
  date: string;
  doctorName: string;
  totalAmount: number;
  paymentMethod: string;
  services: any[];
  consentGiven: boolean;
  legalBasis: string;
  isAnonymized: boolean;
}

export interface PatientDsarPackage {
  dataSubjectPseudonym: string;
  generatedAt: string;
  controller: string;
  legalBasis: string;
  records: PatientDsarRecord[];
  accessAuditLogCount: number;
}
