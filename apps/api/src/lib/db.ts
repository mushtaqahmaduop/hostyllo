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

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // ← was SUPABASE_URL
  ssl: buildSsl(),
  max: 25,
});

export async function withTenant<T>(
  hostelId: string,
  queryFn: (db: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
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