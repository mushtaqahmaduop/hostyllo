import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { assertEncryptionKey } from './env.js';

// Field-level encryption for PII at rest (audit C2/CNIC). AES-256-GCM (authenticated — detects
// tampering). Format: iv(12B hex):authTag(16B hex):ciphertext(hex). Same scheme auth.ts uses for
// TOTP secrets, unified here. Key is validated at import (rejects the weak placeholder).
const KEY = assertEncryptionKey();

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptField(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format — expected GCM (iv:authTag:enc)');
  }
  const [ivHex, tagHex, encHex] = parts;
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

// True only for our GCM ciphertext (24-hex IV : 32-hex tag : hex body). A plaintext CNIC
// ('12345-1234567-1') has hyphens and no colons, so legacy plaintext rows are detectable —
// lets reveal-cnic stay backward-compatible during the backfill transition.
export function isEncrypted(value: string): boolean {
  return /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i.test(value);
}
