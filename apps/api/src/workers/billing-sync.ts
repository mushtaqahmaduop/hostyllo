import { Worker, Job } from 'bullmq';
import type { PoolClient } from 'pg';
import { bullmqRedis } from '../lib/bullmq-redis.js';
import { pool } from '../lib/db.js';
import { moveToDLQ } from './dlq.js';

// ─── Job Types ────────────────────────────────────────────────────────────────

type BillingSyncType =
  | 'activate_plan'    // trial → active (manual Phase 1–3, Paymob Phase 4+)
  | 'trial_expired'    // trial ended, no payment → EXPIRED
  | 'suspend_tenant'   // grace period exhausted → SUSPENDED
  | 'reactivate_tenant'// payment received after suspension → ACTIVE
  | 'pii_purge';       // Day 31 after suspension — anonymise PII

export interface BillingSyncJob {
  hostelId: string;
  type: BillingSyncType;
  plan?: 'starter' | 'pro' | 'enterprise';
  billingPeriodDays?: number;   // default 30
  triggeredBy?: string;         // super_admin userId (manual flows)
  paymobWebhookId?: string;     // Phase 4: idempotency key from Paymob
}

// ─── Transaction helper ──────────────────────────────────────────────────────

/*
 * Every handler below used to call `pool.query('BEGIN')`, run its statements with `pool.query`,
 * then `pool.query('COMMIT')`. A pool hands out a different connection per call, so those
 * statements were not in one transaction — BEGIN could open on connection A, the UPDATEs run and
 * autocommit on B and C, and COMMIT fire against a connection with no open transaction. A failure
 * halfway through left the tenant in a torn state and the ROLLBACK had nothing to undo.
 *
 * Borrowing one client for the whole unit is what makes these transactions real.
 */
async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
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

// ─── Handlers ────────────────────────────────────────────────────────────────

async function activatePlan(data: BillingSyncJob): Promise<void> {
  const { hostelId, plan = 'starter', billingPeriodDays = 30, triggeredBy } = data;

  await withTransaction(async (client) => {
    // 1. Update subscriptions
    await client.query(
      `UPDATE public.subscriptions
          SET status               = 'active',
              plan                 = $2,
              current_period_start = NOW(),
              current_period_end   = NOW() + ($3 || ' days')::INTERVAL,
              updated_at           = NOW()
        WHERE hostel_id = $1`,
      [hostelId, plan, billingPeriodDays]
    );

    // 2. Update hostels — keyed by `id`; this table has no `hostel_id` column (migration 001:12)
    await client.query(
      `UPDATE public.hostels
          SET plan        = $2,
              plan_status = 'active',
              updated_at  = NOW()
        WHERE id = $1`,
      [hostelId, plan]
    );

    // 3. Immutable audit entry
    await client.query(
      `INSERT INTO public.audit_log
         (hostel_id, user_id, action, entity_type, entity_id, new_data)
       VALUES ($1, $2, 'plan_activated', 'subscription', $1,
               jsonb_build_object('plan', $3, 'billing_period_days', $4))`,
      [hostelId, triggeredBy ?? null, plan, billingPeriodDays]
    );
  });

  console.log(`[billing-sync] Hostel ${hostelId} activated on plan=${plan}`);
}

async function expireTrial(data: BillingSyncJob): Promise<void> {
  const { hostelId } = data;

  // Idempotency guard — only expire if still trialing
  const { rows } = await pool.query(
    `SELECT status FROM public.subscriptions WHERE hostel_id = $1`,
    [hostelId]
  );
  // The schema value is 'trial' (migration 006:10). This guard compared against 'trialing', which
  // no row can ever hold, so trial expiry short-circuited to "not trialing — skipping" every time.
  if (!rows[0] || rows[0].status !== 'trial') {
    console.log(`[billing-sync] Hostel ${hostelId} is not on trial — skipping trial_expired`);
    return;
  }

  /*
   * Terminal state is 'suspended', not 'expired'. Neither CHECK constraint permits 'expired'
   * (subscriptions: trial|active|past_due|suspended|cancelled — 006:10; hostels: trial|active|
   * suspended|cancelled — 001:20), so both writes raised 23514 and the job always failed.
   *
   * 'suspended' is also the semantically correct landing state: an expired trial keeps its data
   * and loses write access, which is exactly what suspension means here — and it is the state
   * `purgePii` looks for on day 31. Mapping to 'cancelled' would strand the data forever.
   */
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE public.subscriptions
          SET status     = 'suspended',
              updated_at = NOW()
        WHERE hostel_id  = $1`,
      [hostelId]
    );

    await client.query(
      `UPDATE public.hostels
          SET plan_status = 'suspended',
              updated_at  = NOW()
        WHERE id          = $1`,
      [hostelId]
    );

    await client.query(
      `INSERT INTO public.audit_log
         (hostel_id, user_id, action, entity_type, entity_id, new_data)
       VALUES ($1, NULL, 'trial_expired', 'subscription', $1,
               jsonb_build_object('expired_at', NOW()))`,
      [hostelId]
    );
  });

  console.log(`[billing-sync] Hostel ${hostelId} trial expired → suspended`);
}

async function suspendTenant(data: BillingSyncJob): Promise<void> {
  const { hostelId, triggeredBy } = data;

  // `subscriptions` has no `suspended_at` column (migration 006:6-17) — writing it raised 42703.
  // The timestamp lives in the audit entry below, which is the immutable record anyway.
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE public.subscriptions
          SET status     = 'suspended',
              updated_at = NOW()
        WHERE hostel_id  = $1`,
      [hostelId]
    );

    await client.query(
      `UPDATE public.hostels
          SET plan_status = 'suspended',
              updated_at  = NOW()
        WHERE id          = $1`,
      [hostelId]
    );

    await client.query(
      `INSERT INTO public.audit_log
         (hostel_id, user_id, action, entity_type, entity_id, new_data)
       VALUES ($1, $2, 'tenant_suspended', 'subscription', $1,
               jsonb_build_object('suspended_at', NOW()))`,
      [hostelId, triggeredBy ?? null]
    );
  });

  console.log(`[billing-sync] Hostel ${hostelId} suspended`);
}

async function reactivateTenant(data: BillingSyncJob): Promise<void> {
  const { hostelId, plan = 'starter', billingPeriodDays = 30, triggeredBy } = data;

  // Idempotency guard — only reactivate if currently suspended
  const { rows } = await pool.query(
    `SELECT status FROM public.subscriptions WHERE hostel_id = $1`,
    [hostelId]
  );
  if (!rows[0] || rows[0].status !== 'suspended') {
    console.log(`[billing-sync] Hostel ${hostelId} is not suspended — skipping reactivate`);
    return;
  }

  await withTransaction(async (client) => {
    // `suspended_at = NULL` dropped — the column does not exist (migration 006:6-17).
    await client.query(
      `UPDATE public.subscriptions
          SET status               = 'active',
              plan                 = $2,
              current_period_start = NOW(),
              current_period_end   = NOW() + ($3 || ' days')::INTERVAL,
              updated_at           = NOW()
        WHERE hostel_id = $1`,
      [hostelId, plan, billingPeriodDays]
    );

    await client.query(
      `UPDATE public.hostels
          SET plan        = $2,
              plan_status = 'active',
              updated_at  = NOW()
        WHERE id          = $1`,
      [hostelId, plan]
    );

    await client.query(
      `INSERT INTO public.audit_log
         (hostel_id, user_id, action, entity_type, entity_id, new_data)
       VALUES ($1, $2, 'tenant_reactivated', 'subscription', $1,
               jsonb_build_object('plan', $3))`,
      [hostelId, triggeredBy ?? null, plan]
    );
  });

  console.log(`[billing-sync] Hostel ${hostelId} reactivated on plan=${plan}`);
}

async function purgePii(data: BillingSyncJob): Promise<void> {
  const { hostelId } = data;

  // Safety guard — only purge if suspended (Day 31 check)
  const { rows } = await pool.query(
    `SELECT plan_status FROM public.hostels WHERE id = $1`,
    [hostelId]
  );
  if (!rows[0] || rows[0].plan_status !== 'suspended') {
    console.log(`[billing-sync] Hostel ${hostelId} not suspended — aborting PII purge`);
    return;
  }

  /*
   * ⚠️ INCOMPLETE — this clears CNIC only.
   *
   * Every version of the tenant-lifecycle spec also requires name, phone, email, emergency contact
   * and photo to be cleared on the day-31 purge. Until that is implemented this handler satisfies
   * neither the spec nor PDPA, so `workers/dispatch.ts` deliberately does NOT schedule it — it
   * runs only when enqueued by hand. Finish the purge before scheduling it.
   */
  await withTransaction(async (client) => {
    // Anonymise CNIC — set to NULL (encrypted column; no plaintext ever stored)
    const { rowCount } = await client.query(
      `UPDATE public.students
          SET cnic_encrypted = NULL,
              updated_at     = NOW()
        WHERE hostel_id = $1
          AND deleted_at IS NULL`,
      [hostelId]
    );

    // 'archived' is not a legal plan_status (001:20 allows trial|active|suspended|cancelled).
    // 'cancelled' is the terminal state.
    await client.query(
      `UPDATE public.hostels
          SET plan_status = 'cancelled',
              updated_at  = NOW()
        WHERE id          = $1`,
      [hostelId]
    );

    await client.query(
      `INSERT INTO public.audit_log
         (hostel_id, user_id, action, entity_type, entity_id, new_data)
       VALUES ($1, NULL, 'pii_purged', 'hostel', $1,
               jsonb_build_object('students_anonymised', $2, 'purged_at', NOW()))`,
      [hostelId, rowCount ?? 0]
    );

    console.log(`[billing-sync] Hostel ${hostelId} PII purged — ${rowCount} students anonymised`);
  });
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

async function processBillingSync(job: Job<BillingSyncJob>): Promise<void> {
  const { type } = job.data;

  switch (type) {
    case 'activate_plan':
      await activatePlan(job.data);
      break;
    case 'trial_expired':
      await expireTrial(job.data);
      break;
    case 'suspend_tenant':
      await suspendTenant(job.data);
      break;
    case 'reactivate_tenant':
      await reactivateTenant(job.data);
      break;
    case 'pii_purge':
      await purgePii(job.data);
      break;
    default:
      throw new Error(`[billing-sync] Unknown job type: ${type}`);
  }
}

// ─── Worker ──────────────────────────────────────────────────────────────────

const worker = new Worker<BillingSyncJob>(
  'billing-sync',
  async (job) => {
    console.log(`[billing-sync] Processing job ${job.id} type=${job.data.type}`);
    await processBillingSync(job);
  },
  {
    connection: bullmqRedis,
    concurrency: 2,
  }
);

// INVARIANT: every worker MUST call moveToDLQ on failure
worker.on('failed', (job, err) => {
  console.error(`[billing-sync] Job ${job?.id} failed (type=${job?.data?.type}):`, err.message);
  moveToDLQ(job, err);
});

worker.on('completed', (job) => {
  console.log(`[billing-sync] Job ${job.id} completed (type=${job.data.type})`);
});

worker.on('error', (err) => {
  console.error('[billing-sync] Worker error:', err);
});

export { worker as billingSyncWorker };