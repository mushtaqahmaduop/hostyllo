// Vitest global setup for the integration suite (audit M5). Runs once before all tests:
//   1. applies every migration (001…010) to the test DB, in order
//   2. gives the least-privilege hostyllo_app role a login so DATABASE_URL_APP can connect
//      (this is what makes FORCE-RLS isolation actually testable — the app connects as a
//       non-superuser role that RLS constrains)
//   3. seeds two isolated tenants (seed.sql)
//
// Uses DATABASE_URL (the privileged/superuser connection). Requires DATABASE_URL to point at
// the test database; skips entirely (with a warning) if it is unset, so unit-only runs still work.
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, '../../../..', 'packages/db/migrations');

export async function setup() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL unset — skipping integration seed (integration tests will be skipped).');
    return;
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    // 0. Supabase-compat shim — the migrations target a Supabase DB, which provides an `auth`
    //    schema (auth.role() is used by migration 001's hostels policy) and the anon/
    //    authenticated/service_role roles. Plain Postgres in CI has none of these, so create
    //    minimal stand-ins before applying migrations.
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE
        AS $fn$ SELECT current_setting('request.jwt.claim.role', true) $fn$;
      DO $roles$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')          THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role')  THEN CREATE ROLE service_role NOLOGIN; END IF;
      END $roles$;
    `);

    // 1. migrations, in order
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      const sql = await readFile(join(MIGRATIONS_DIR, f), 'utf8');
      await client.query(sql);
    }

    // 2. let the per-request role log in (password matches DATABASE_URL_APP in CI env)
    const appPassword = process.env.APP_DB_PASSWORD ?? 'apptest';
    await client.query(`ALTER ROLE hostyllo_app LOGIN PASSWORD '${appPassword}'`);
    await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hostyllo_app');
    await client.query('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hostyllo_app');

    // 3. seed two isolated tenants
    const seed = await readFile(join(HERE, 'seed.sql'), 'utf8');
    await client.query(seed);
  } finally {
    await client.end();
  }
}
