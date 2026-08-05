import { Queue, Worker, Job } from 'bullmq';
import { bullmqRedis } from '../lib/bullmq-redis.js';
import { pool } from '../lib/db.js';
import { moveToDLQ } from './dlq.js';
import {
  rentGenerateQueue,
  autoCancelQueue,
  billingSyncQueue,
  monthLabel,
  dayLabel,
  jobId,
} from '../lib/queues.js';

/*
 * The scheduler + fan-out layer.
 *
 * Two of the business queues take a `hostelId` per job, so a cron cannot simply enqueue "run rent".
 * Something has to wake up, ask which tenants are due, and enqueue one job each. That is this file:
 * a scheduler writes a tick onto `dispatch`, and the dispatch worker fans the tick out.
 *
 * Why a tick instead of scheduling per hostel directly: the tenant list changes. A per-hostel
 * repeatable job would have to be created on signup and torn down on churn, and would silently
 * keep firing for a deleted tenant. A tick re-reads the world on every run and cannot drift.
 *
 * Replica safety: `upsertJobScheduler` is keyed by scheduler ID, so N replicas calling it produce
 * one schedule. The fanned-out jobs then use deterministic IDs (see `lib/queues.ts`), so a tick
 * processed twice still yields one job per hostel per period.
 */

const TZ = 'Asia/Karachi';

export const dispatchQueue = new Queue('dispatch', {
  connection: bullmqRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { age: 30 * 24 * 3600 },
  },
});

type TickType = 'rent-monthly' | 'auto-cancel-nightly' | 'trial-sweep';

interface DispatchJob {
  tick: TickType;
}

/** Tenants that should receive automated billing/rent work. */
async function activeHostelIds(): Promise<string[]> {
  // NOTE: `hostels` has no `hostel_id` column — its primary key is `id` (migration 001:12).
  // Three of billing-sync's five job types were written against a `hostel_id` that never existed.
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM public.hostels
      WHERE deleted_at IS NULL
        AND plan_status IN ('trial', 'active')`
  );
  return rows.map((r) => r.id);
}

async function dispatchRent(): Promise<number> {
  const month = monthLabel();
  const ids = await activeHostelIds();
  for (const hostelId of ids) {
    await rentGenerateQueue.add(
      'generate',
      { hostelId, monthLabel: month },
      // One rent run per hostel per month, no matter how many replicas tick.
      { jobId: jobId('rent', hostelId, month) }
    );
  }
  console.log(`[dispatch] rent-monthly ${month}: enqueued ${ids.length} hostels`);
  return ids.length;
}

async function dispatchAutoCancel(): Promise<number> {
  // The auto-cancel sweep is global (it claims candidates by UPDATE), so it takes no payload.
  const day = dayLabel();
  await autoCancelQueue.add('sweep', {}, { jobId: jobId('auto-cancel', day) });
  console.log(`[dispatch] auto-cancel-nightly ${day}: enqueued global sweep`);
  return 1;
}

async function dispatchTrialSweep(): Promise<number> {
  const day = dayLabel();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT h.id
       FROM public.hostels h
       JOIN public.subscriptions s ON s.hostel_id = h.id
      WHERE h.deleted_at IS NULL
        AND h.plan_status = 'trial'
        AND s.status = 'trial'
        AND s.trial_ends_at IS NOT NULL
        AND s.trial_ends_at < NOW()`
  );
  for (const { id } of rows) {
    await billingSyncQueue.add(
      'trial_expired',
      { hostelId: id, type: 'trial_expired' },
      { jobId: jobId('trial-expired', id, day) }
    );
  }
  console.log(`[dispatch] trial-sweep ${day}: enqueued ${rows.length} expiries`);
  return rows.length;
}

/*
 * Deliberately NOT scheduled: `billing-sync`'s `pii_purge`. It is a destructive, legally
 * load-bearing operation and it is currently incomplete — it nulls `cnic_encrypted` only, while
 * every version of the tenant-lifecycle spec also requires name, phone, email, emergency contact
 * and photo to be cleared. Scheduling it now would produce a purge that satisfies neither the
 * spec nor PDPA while looking like it did. Wire it after the purge itself is corrected.
 */
export async function registerSchedulers(): Promise<void> {
  await dispatchQueue.upsertJobScheduler(
    'rent-monthly',
    { pattern: '0 0 1 * *', tz: TZ }, // 00:00 on the 1st
    { name: 'tick', data: { tick: 'rent-monthly' } satisfies DispatchJob }
  );

  await dispatchQueue.upsertJobScheduler(
    'auto-cancel-nightly',
    { pattern: '30 0 * * *', tz: TZ }, // 00:30 daily, after the rent run on the 1st
    { name: 'tick', data: { tick: 'auto-cancel-nightly' } satisfies DispatchJob }
  );

  await dispatchQueue.upsertJobScheduler(
    'trial-sweep',
    { pattern: '0 2 * * *', tz: TZ }, // 02:00 daily
    { name: 'tick', data: { tick: 'trial-sweep' } satisfies DispatchJob }
  );

  console.log('[dispatch] schedulers registered (rent-monthly, auto-cancel-nightly, trial-sweep)');
}

const worker = new Worker<DispatchJob>(
  'dispatch',
  async (job: Job<DispatchJob>) => {
    switch (job.data.tick) {
      case 'rent-monthly':
        return { enqueued: await dispatchRent() };
      case 'auto-cancel-nightly':
        return { enqueued: await dispatchAutoCancel() };
      case 'trial-sweep':
        return { enqueued: await dispatchTrialSweep() };
      default: {
        // Exhaustiveness guard: a new tick type must be handled, not silently dropped.
        const unknown: never = job.data.tick;
        throw new Error(`[dispatch] unknown tick type: ${String(unknown)}`);
      }
    }
  },
  { connection: bullmqRedis, concurrency: 1 }
);

worker.on('failed', (job, err) => {
  console.error(`[dispatch] Job ${job?.id} failed:`, err.message);
  moveToDLQ(job, err);
});
worker.on('error', (err) => console.error('[dispatch] Worker error:', err));

export { worker as dispatchWorker };
