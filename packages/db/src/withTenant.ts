import pg from 'pg';
const { Pool } = pg;

// Canonical DB connection layer for HOSTYLLO. This is the SINGLE source of truth for the
// pools and the tenant-isolation primitive — apps/api re-exports from here. (Audit M1: there
// used to be a second copy in apps/api with insecure TLS that was instantiated on every
// `@hostyllo/db` import; that copy is gone.)

// TLS to Postgres. `rejectUnauthorized: false` accepts ANY certificate — production DB traffic
// would be open to MITM. We verify by default:
//   • DATABASE_CA_CERT set (PEM string, e.g. the Supabase/Railway CA) → pin to it.
//   • otherwise verify against the system trust store.
//   • PGSSLMODE=disable → plaintext, for a local Postgres with no TLS only.
// The one escape hatch (PGSSL_NO_VERIFY=true) is dev-only and refuses to apply in production.
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
// role). Under migration 010's policies the `postgres` role bypasses RLS via the
// `current_user = 'postgres'` escape, so it is intentionally CROSS-TENANT. Use ONLY for the
// auth bootstrap (cross-tenant user lookup at login) and background workers (platform-wide
// jobs). NEVER for per-request tenant queries.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSsl(),
  max: 15,
});

// Per-request (tenant) pool — connects as the least-privilege `hostyllo_app` role when
// DATABASE_URL_APP is set. Under migration 010 that role is fully constrained by FORCE ROW
// LEVEL SECURITY: a query that forgets its hostel_id filter returns ZERO rows instead of
// leaking. Falls back to the privileged pool when DATABASE_URL_APP is unset (dev / pre-migration)
// — behaviour identical to before, but DB-level enforcement stays inactive until the role is set.
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
