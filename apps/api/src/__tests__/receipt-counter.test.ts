/**
 * Receipt-counter concurrency gate (Phase 1). Proves get_next_receipt_number() is atomic under
 * concurrent callers — no duplicate and no skipped receipt numbers, which would corrupt the
 * financial audit trail (receipts must be gap-free and unique per hostel).
 *
 * Integration test: needs the seeded test DB (globalSetup). Skips if DATABASE_URL unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll } from 'vitest';
import type { Pool } from 'pg';
import { HOSTEL_A_ID } from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;
const N = 50; // concurrent receipt requests

let pool: Pool;
let withTenant: <T>(hostelId: string, fn: (db: import('pg').PoolClient) => Promise<T>) => Promise<T>;

beforeAll(async () => {
  if (!HAS_DB) return;
  ({ pool, withTenant } = await import('../lib/db.js'));
  // Reset hostel A's counter so results are a clean 1..N (privileged pool bypasses RLS).
  await pool.query('DELETE FROM public.receipt_counter WHERE hostel_id = $1', [HOSTEL_A_ID]);
});

describe.skipIf(!HAS_DB)('Receipt counter — concurrency', () => {
  it('fires N concurrent get_next_receipt_number() calls with no dupes and no gaps', async () => {
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        withTenant(HOSTEL_A_ID, (db) =>
          db.query('SELECT get_next_receipt_number($1) AS n', [HOSTEL_A_ID]).then((r) => Number(r.rows[0].n))
        )
      )
    );

    // Atomic: every returned number is unique (a duplicate = two receipts share a number).
    expect(new Set(results).size, 'duplicate receipt numbers issued').toBe(N);

    // Gap-free: the N numbers are exactly the contiguous sequence 1..N.
    const sorted = [...results].sort((a, b) => a - b);
    expect(sorted).toEqual(Array.from({ length: N }, (_, i) => i + 1));

    // The persisted counter equals the highest number issued.
    const row = await pool.query('SELECT last_number FROM public.receipt_counter WHERE hostel_id = $1', [HOSTEL_A_ID]);
    expect(Number(row.rows[0].last_number)).toBe(N);
  });
});
