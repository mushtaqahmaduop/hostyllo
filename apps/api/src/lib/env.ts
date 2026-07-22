// Boot-time validation of security-critical secrets. We fail fast — in EVERY environment —
// rather than let a placeholder/weak value silently disable a security control (audit C2/M4).

/**
 * Validate ENCRYPTION_KEY and return it as a 32-byte Buffer.
 * Rejects unset, wrong-length, and low-entropy keys such as the repeating
 * "a1b2c3d4e5f6…" placeholder the audit flagged (AES with a guessable key = no confidentiality).
 */
export function assertEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not set — generate one with `openssl rand -hex 32`');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes) — `openssl rand -hex 32`');
  }
  const bytes = Buffer.from(raw, 'hex');
  // A real random 32-byte key has ~32 distinct byte values on average. The flagged
  // placeholder had only 6. Require a floor well below random but well above any pattern key.
  if (new Set(bytes).size < 16) {
    throw new Error(
      'ENCRYPTION_KEY looks non-random (too few distinct bytes) — do not use a placeholder; ' +
      'generate a fresh key with `openssl rand -hex 32` and rotate any existing ciphertext'
    );
  }
  return bytes;
}
