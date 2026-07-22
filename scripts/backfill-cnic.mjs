#!/usr/bin/env node
// backfill-cnic.mjs — one-time migration of legacy PLAINTEXT `students.cnic_encrypted` values to
// AES-256-GCM ciphertext (audit: CNIC was stored in plaintext). Idempotent: rows already in GCM
// format are skipped, so it is safe to re-run.
//
// Runs as DATABASE_URL (privileged/system role) so it sees every tenant's rows. Requires the same
// ENCRYPTION_KEY the app uses — the ciphertext it writes must decrypt with lib/crypto.ts.
//
//   ENCRYPTION_KEY=... DATABASE_URL=... node scripts/backfill-cnic.mjs [--dry-run]

import { createCipheriv, randomBytes } from 'node:crypto';
import pg from 'pg';

const DRY = process.argv.includes('--dry-run');
const raw = process.env.ENCRYPTION_KEY;
if (!raw || !/^[0-9a-fA-F]{64}$/.test(raw)) {
  console.error('❌ ENCRYPTION_KEY must be 64 hex chars (openssl rand -hex 32)');
  process.exit(1);
}
const KEY = Buffer.from(raw, 'hex');
if (new Set(KEY).size < 16) {
  console.error('❌ ENCRYPTION_KEY looks non-random — refusing to backfill with a weak key');
  process.exit(1);
}

const GCM = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i; // already-encrypted marker

function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

async function main() {
  if (!process.env.DATABASE_URL) { console.error('❌ DATABASE_URL not set'); process.exit(1); }
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, cnic_encrypted FROM public.students
       WHERE cnic_encrypted IS NOT NULL AND cnic_encrypted <> ''`
    );
    let migrated = 0, already = 0, blank = 0;
    for (const r of rows) {
      const val = r.cnic_encrypted;
      if (GCM.test(val)) { already++; continue; }
      if (!val.trim()) { blank++; continue; }
      if (!DRY) {
        await client.query('UPDATE public.students SET cnic_encrypted = $1 WHERE id = $2', [encrypt(val), r.id]);
      }
      migrated++;
    }
    console.log(`${DRY ? '[dry-run] ' : ''}CNIC backfill: ${migrated} encrypted, ${already} already encrypted, ${blank} blank, ${rows.length} scanned.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
