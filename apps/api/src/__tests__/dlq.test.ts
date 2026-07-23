/**
 * Dead-letter-queue round-trip gate (Phase 1). Proves moveToDLQ() actually persists a failed job
 * into dlq_jobs (the "manually trigger DLQ → appears in dlq_jobs" exit condition).
 *
 * This also guards a real bug: dlq_jobs' columns are `data`/`error`, but moveToDLQ previously
 * inserted `job_data`/`error_message` with an ON CONFLICT against a non-existent unique index, so
 * every insert silently failed and the DLQ recorded nothing. This test fails against that version.
 *
 * Integration test: needs the seeded test DB (globalSetup). Skips if DATABASE_URL unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import type { Job } from 'bullmq';
import { HOSTEL_A_ID } from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;
const JOB_ID = 'dlq-roundtrip-test-0001';

let pool: Pool;
let moveToDLQ: (job: Job | undefined, err: Error) => Promise<void>;

function fakeJob(): Job {
  return {
    queueName: 'test-queue',
    id: JOB_ID,
    name: 'test-job',
    data: { hostelId: HOSTEL_A_ID, foo: 'bar' },
  } as unknown as Job;
}

beforeAll(async () => {
  if (!HAS_DB) return;
  ({ pool } = await import('../lib/db.js'));
  ({ moveToDLQ } = await import('../workers/dlq.js'));
  await pool.query('DELETE FROM public.dlq_jobs WHERE job_id = $1', [JOB_ID]);
});

afterAll(async () => {
  if (HAS_DB && pool) await pool.query('DELETE FROM public.dlq_jobs WHERE job_id = $1', [JOB_ID]).catch(() => {});
});

describe.skipIf(!HAS_DB)('DLQ round-trip', () => {
  it('moveToDLQ persists a failed job into dlq_jobs', async () => {
    await moveToDLQ(fakeJob(), new Error('boom: downstream failure'));

    const r = await pool.query(
      'SELECT hostel_id, queue_name, job_name, error, data FROM public.dlq_jobs WHERE job_id = $1',
      [JOB_ID]
    );
    expect(r.rows.length, 'failed job must land in dlq_jobs').toBe(1);
    const row = r.rows[0];
    expect(row.queue_name).toBe('test-queue');
    expect(row.job_name).toBe('test-job');
    expect(row.error).toBe('boom: downstream failure');
    expect(row.hostel_id).toBe(HOSTEL_A_ID);
    expect(row.data?.foo).toBe('bar');
  });

  it('moveToDLQ is a no-op for an undefined job (never throws)', async () => {
    await expect(moveToDLQ(undefined, new Error('ignored'))).resolves.toBeUndefined();
  });
});
