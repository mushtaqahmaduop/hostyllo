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

const PUBLIC_COOKIE_PLACEHOLDER = 'hostyllo-cookie-secret';

/**
 * Validate all security-critical env at boot (audit M4). In production a missing/placeholder
 * secret THROWS (fail-closed) instead of silently falling back to a public default; in dev the
 * same gaps only warn so local work isn't blocked. Call once at startup, before serving.
 */
export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';

  // Always-required (the app cannot function without these in any environment).
  const required = [
    'JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY', 'ENCRYPTION_KEY', 'DATABASE_URL',
    'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
  ];
  // Required in production only (dev has safe local fallbacks).
  const prodOnly = ['COOKIE_SECRET', 'CORS_ORIGIN'];

  const missing = required.filter((k) => !process.env[k]);
  if (isProd) missing.push(...prodOnly.filter((k) => !process.env[k]));

  if (missing.length) {
    const msg = `Missing required environment variable(s): ${missing.join(', ')}`;
    if (isProd) throw new Error(msg);
    console.warn(`⚠️  ${msg} — allowed in non-production, but set them before deploy`);
  }

  // The old public default is forgeable — never allow it in production.
  if (isProd && (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === PUBLIC_COOKIE_PLACEHOLDER)) {
    throw new Error('COOKIE_SECRET must be a strong random value in production — `openssl rand -hex 32`');
  }

  // Key strength is validated in every environment.
  assertEncryptionKey();
}

export { PUBLIC_COOKIE_PLACEHOLDER };
