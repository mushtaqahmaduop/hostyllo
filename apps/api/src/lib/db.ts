import pg from 'pg';
const { Pool } = pg;

// TLS to Postgres. `rejectUnauthorized: false` (the old default) accepts ANY
// certificate — production DB traffic was open to MITM. We now verify by default:
//   • DATABASE_CA_CERT set (PEM string, e.g. the Supabase/Railway CA) → pin to it.
//   • otherwise verify against the system trust store.
//   • PGSSLMODE=disable → plaintext, for a local Postgres with no TLS only.
// The one escape hatch (PGSSL_NO_VERIFY=true) is dev-only and refuses to apply in
// production so it can never silently disable verification on a live deploy.
function buildSsl(): pg.PoolConfig['ssl'] {
  if (process.env.PGSSLMODE === 'disable') return false;

  const ca = process.env.DATABASE_CA_CERT;
  if (ca) return { ca, rejectUnauthorized: true };

  if (process.env.PGSSL_NO_VERIFY === 'true') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PGSSL_NO_VERIFY cannot be used in production — set DATABASE_CA_CERT');
    }
    return { rejectUnauthorized: false };
  }

  return { rejectUnauthorized: true };
}

// Privileged (system) pool — connects as the role in DATABASE_URL (the Supabase `postgres`
// role). Under migration 010 that role has app.system_context='on', so it is intentionally
// CROSS-TENANT. Use it ONLY for the auth bootstrap (cross-tenant user lookup at login, before
// a tenant is known) and background workers (platform-wide jobs). NEVER for per-request tenant
// queries — those must go through withTenant().
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // ← was SUPABASE_URL
  ssl: buildSsl(),
  max: 15,
});

// Per-request (tenant) pool — connects as the least-privilege `hostyllo_app` role when
// DATABASE_URL_APP is set. Under migration 010 that role is fully constrained by FORCE ROW
// LEVEL SECURITY: a query that forgets its hostel_id filter returns ZERO rows instead of
// leaking across tenants. If DATABASE_URL_APP is unset (dev / pre-migration) it falls back to
// the privileged pool — behaviour is then identical to before (explicit filters still scope,
// nothing breaks), but DB-level enforcement stays inactive until the app role is configured.
const tenantPool = process.env.DATABASE_URL_APP
  ? new Pool({ connectionString: process.env.DATABASE_URL_APP, ssl: buildSsl(), max: 20 })
  : pool;

export async function withTenant<T>(
  hostelId: string,
  queryFn: (db: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await tenantPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.hostel_id', hostelId]);
    const result = await queryFn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function dbHealthCheck(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}