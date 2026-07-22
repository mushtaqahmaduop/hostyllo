#!/usr/bin/env node
// HOSTYLLO migration runner (audit M3). Zero extra dependencies — uses `pg`.
//
// Problem it solves: migrations were raw .sql applied by hand, with no ledger, no ordering
// guarantee, no idempotency (001–007 CREATE TABLE without IF NOT EXISTS → re-running fails),
// and no drift detection (migrations were edited in place after being applied).
//
// Commands:
//   node migrate.mjs            apply all pending migrations (each in its own transaction)
//   node migrate.mjs status     show applied vs pending
//   node migrate.mjs baseline   record ALL current files as applied WITHOUT running them
//                               (use once on a DB that was already migrated by hand)
//
// Runs as the DATABASE_URL role (privileged/owner) — migrations do DDL + role changes, so they
// must NOT run as the least-privilege hostyllo_app role.

import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, 'migrations');

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

async function loadFiles() {
  const names = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort(); // 001_, 002_, … — lexical sort matches numeric order given zero-padding
  const files = [];
  for (const name of names) {
    const sql = await readFile(join(MIGRATIONS_DIR, name), 'utf8');
    files.push({ name, sql, checksum: sha256(sql) });
  }
  return files;
}

async function ensureLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    text PRIMARY KEY,
      checksum    text NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getApplied(client) {
  const { rows } = await client.query('SELECT filename, checksum FROM schema_migrations');
  return new Map(rows.map((r) => [r.filename, r.checksum]));
}

function warnDrift(files, applied) {
  for (const f of files) {
    const prev = applied.get(f.name);
    if (prev && prev !== f.checksum) {
      console.warn(`⚠️  ${f.name} was EDITED after being applied (checksum drift). ` +
        `The live DB has the old version; new changes will NOT be applied by re-running.`);
    }
  }
}

async function main() {
  const cmd = process.argv[2] ?? 'up';
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: !process.env.PGSSL_NO_VERIFY },
  });
  await client.connect();

  try {
    await ensureLedger(client);
    const files = await loadFiles();
    const applied = await getApplied(client);
    warnDrift(files, applied);

    if (cmd === 'status') {
      for (const f of files) {
        console.log(`${applied.has(f.name) ? '✅ applied ' : '⬜ pending '} ${f.name}`);
      }
      return;
    }

    if (cmd === 'baseline') {
      for (const f of files) {
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
          [f.name, f.checksum]
        );
      }
      console.log(`📌 Baselined ${files.length} migrations as applied (no SQL executed).`);
      return;
    }

    if (cmd !== 'up') {
      console.error(`Unknown command: ${cmd}. Use: up | status | baseline`);
      process.exit(1);
    }

    const pending = files.filter((f) => !applied.has(f.name));
    if (pending.length === 0) {
      console.log('✅ No pending migrations.');
      return;
    }

    for (const f of pending) {
      process.stdout.write(`▶ applying ${f.name} … `);
      try {
        await client.query('BEGIN');
        await client.query(f.sql);
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
          [f.name, f.checksum]
        );
        await client.query('COMMIT');
        console.log('done');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`\n❌ ${f.name} failed — rolled back. No further migrations applied.`);
        throw err;
      }
    }
    console.log(`✅ Applied ${pending.length} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
