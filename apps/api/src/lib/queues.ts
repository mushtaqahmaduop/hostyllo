import { Queue } from 'bullmq';
import { bullmqRedis } from './bullmq-redis.js';

/*
 * The producer side of BullMQ.
 *
 * Until 2026-07-30 this file did not exist: `apps/api` constructed four `Worker`s and not one
 * `Queue`, so no worker had ever received a job. Rent was never generated, pending cancellations
 * were never confirmed (so beds were never freed) and PII was never purged. The workers were not
 * broken — nothing was speaking to them.
 *
 * Job IDs are deterministic on purpose. BullMQ refuses a second job with an existing ID while that
 * job is still known to Redis, which makes every enqueue below idempotent: two API replicas racing
 * the same dispatch tick produce one job, not two. That is the guard that lets every replica run
 * the dispatcher without fanning rent generation out N× per month.
 */

const connection = bullmqRedis;

/** Retry/retention policy shared by every queue. Failures land in `dlq_jobs` via `moveToDLQ`. */
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: { count: 100, age: 7 * 24 * 3600 },
  // Keep failures around: `dlq_jobs` records them, but the raw job is what you replay from.
  removeOnFail: { age: 30 * 24 * 3600 },
};

export const rentGenerateQueue = new Queue('rent-generate', { connection, defaultJobOptions });
export const autoCancelQueue = new Queue('auto-cancel', { connection, defaultJobOptions });
export const billingSyncQueue = new Queue('billing-sync', { connection, defaultJobOptions });

/*
 * ⚠️ Constructed, but nothing calls `.add()` on it yet — no email is sent by this system today.
 *
 * The other three queues are fed by `workers/dispatch.ts` on a schedule. Email is not schedulable:
 * every job type the worker handles (`password_reset`, `trial_warning`, `plan_activated`, …) is
 * triggered by a request or by a state change inside another handler, so the producers belong in
 * the routes and in `billing-sync`, not in a cron. The queue exists so those call sites have
 * somewhere to write when they are built; the parity test only proves the halves match, not that
 * anyone speaks.
 */
export const emailSendQueue = new Queue('email-send', { connection, defaultJobOptions });

/** Every queue, for lifecycle management and for the CI test that asserts producer/worker parity. */
export const allQueues = [
  rentGenerateQueue,
  autoCancelQueue,
  billingSyncQueue,
  emailSendQueue,
] as const;

export const QUEUE_NAMES = allQueues.map((q) => q.name);

/*
 * Job ID helpers live in `lib/job-ids.ts` — pure, so the unit test can import them without
 * constructing a Queue (and therefore without a Redis connection). Re-exported here so call sites
 * that already import the queues get them from one place.
 */
export { jobId, monthLabel, dayLabel } from './job-ids.js';

export async function closeQueues(): Promise<void> {
  await Promise.all(allQueues.map((q) => q.close()));
}
