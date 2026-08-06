import type { PoolClient } from 'pg';
import { pool } from './db.js';

/*
 * Run a unit of work inside a real transaction.
 *
 * The defect this exists to prevent: `pool.query('BEGIN')` … `pool.query('COMMIT')` is NOT a
 * transaction. A pool hands out a different connection per call, so BEGIN can open on connection
 * A while the writes autocommit on B and C, and COMMIT fires against a connection with no open
 * transaction. A failure halfway leaves torn state and the ROLLBACK has nothing to undo. Every
 * handler in `workers/billing-sync.ts` was written that way until 2026-08-06.
 *
 * Borrowing one client for the whole unit is what makes the transaction real.
 *
 * This runs on the privileged pool, which is correct for workers: they sweep every tenant in one
 * pass and are outside the per-request `withTenant()` identity by the two-identity design of
 * migration 010. Route code must NOT use this — it must go through `withTenant()`, which is what
 * binds the query to the caller's hostel (INVARIANT-2/3).
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {
      // The connection may already be unusable; the rollback failing is not the error worth
      // reporting, and swallowing it keeps the original cause intact.
    });
    throw err;
  } finally {
    client.release();
  }
}
