import { Worker, Job } from 'bullmq';
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

// ─── Handlers ────────────────────────────────────────────────────────────────

async function activatePlan(data: BillingSyncJob): Promise<void> {
  const { hostelId, plan = 'starter', billingPeriodDays = 30, triggeredBy } = data;

  const periodEnd = `NOW() + INTERVAL '${billingPeriodDays} days'`;

  await pool.query('BEGIN');
  try {
    // 1. Update subscriptions
    await pool.query(
      `UPDATE public.subscriptions
          SET status               = 'active',
              plan                 = $2,
              current_period_start = NOW(),
              current_period_end   = ${periodEnd},
              updated_at           = NOW()
        WHERE hostel_id = $1`,
      [hostelId, plan]
    );

    // 2. Update hostels
    await pool.query(
      `UPDATE public.hostels
          SET plan        = $2,
              plan_status = 'active',
              updated_at  = NOW()
        WHERE hostel_id = $1`,
      [hostelId, plan]
    );

    // 3. Immutable audit entry
    await pool.query(
      `INSERT INTO public.audit_log
         (hostel_id, user_id, action, entity_type, entity_id, new_data)
       VALUES ($1, $2, 'plan_activated', 'subscription', $1,
               jsonb_build_object('plan', $3, 'billing_period_days', $4))`,
      [hostelId, triggeredBy ?? null, plan, billingPeriodDays]
    );

    await pool.query('COMMIT');
    console.log(`[billing-sync] Hostel ${hostelId} activated on plan=${plan}`);
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

async function expireTrial(data: BillingSyncJob): Promise<void> {
  const { hostelId } = data;

  // Idempotency guard — only expire if still trialing
  const { rows } = await pool.query(
    `SELECT status FROM public.subscriptions WHERE hostel_id = $1`,
    [hostelId]
  );
  if (!rows[0] || rows[0].status !== 'trialing') {
    console.log(`[billing-sync] Hostel ${hostelId} is not trialing — skipping trial_expired`);
    return;
  }

  await pool.query('BEGIN');
  try {
    await pool.query(
      `UPDATE public.subscriptions
          SET status     = 'expired',
              updated_at = NOW()
        WHERE hostel_id  = $1`,
      [hostelId]
    );

    await pool.query(
      `UPDATE public.hostels
          SET plan_status = 'expired',
              updated_at  = NOW()
        WHERE hostel_id   = $1`,
      [hostelId]
    );

    await pool.query(
      `INSERT INTO public.audit_log
         (hostel_id, user_id, action, entity_type, entity_id, new_data)
       VALUES ($1, NULL, 'trial_expired', 'subscription', $1,
               jsonb_build_object('expired_at', NOW()))`,
      [hostelId]
    );

    await pool.query('COMMIT');
    console.log(`[billing-sync] Hostel ${hostelId} trial expired`);
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

async function suspendTenant(data: BillingSyncJob): Promise<void> {
  const { hostelId, triggeredBy } = data;

  await pool.query('BEGIN');
  try {
    await pool.query(
      `UPDATE public.subscriptions
          SET status       = 'suspended',
              suspended_at = NOW(),
              updated_at   = NOW()
        WHERE hostel_id    = $1`,
      [hostelId]
    );

    await pool.query(
      `UPDATE public.hostels
          SET plan_status = 'suspended',
              updated_at  = NOW()
        WHERE hostel_id   = $1`,
      [hostelId]
    );

    await pool.query(
      `INSERT INTO public.audit_log
         (hostel_id, user_id, action, entity_type, entity_id, new_data)
       VALUES ($1, $2, 'tenant_suspended', 'subscription', $1,
               jsonb_build_object('suspended_at', NOW()))`,
      [hostelId, triggeredBy ?? null]
    );

    await pool.query('COMMIT');
    console.log(`[billing-sync] Hostel ${hostelId} suspended`);
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
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

  await pool.query('BEGIN');
  try {
    await pool.query(
      `UPDATE public.subscriptions
          SET status               = 'active',
              plan                 = $2,
              suspended_at         = NULL,
              current_period_start = NOW(),
              current_period_end   = NOW() + ($3 || ' days')::INTERVAL,
              updated_at           = NOW()
        WHERE hostel_id = $1`,
      [hostelId, plan, billingPeriodDays]
    );

    await pool.query(
      `UPDATE public.hostels
          SET plan        = $2,
              plan_status = 'active',
              updated_at  = NOW()
        WHERE hostel_id   = $1`,
      [hostelId, plan]
    );

    await pool.query(
      `INSERT INTO public.audit_log
         (hostel_id, user_id, action, entity_type, entity_id, new_data)
       VALUES ($1, $2, 'tenant_reactivated', 'subscription', $1,
               jsonb_build_object('plan', $3))`,
      [hostelId, triggeredBy ?? null, plan]
    );

    await pool.query('COMMIT');
    console.log(`[billing-sync] Hostel ${hostelId} reactivated on plan=${plan}`);
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

async function purgePii(data: BillingSyncJob): Promise<void> {
  const { hostelId } = data;

  // Safety guard — only purge if suspended (Day 31 check)
  const { rows } = await pool.query(
    `SELECT plan_status FROM public.hostels WHERE hostel_id = $1`,
    [hostelId]
  );
  if (!rows[0] || rows[0].plan_status !== 'suspended') {
    console.log(`[billing-sync] Hostel ${hostelId} not suspended — aborting PII purge`);
    return;
  }

  await pool.query('BEGIN');
  try {
    // Anonymise CNIC — set to NULL (encrypted column; no plaintext ever stored)
    const { rowCount } = await pool.query(
      `UPDATE public.students
          SET cnic_encrypted = NULL,
              updated_at     = NOW()
        WHERE hostel_id = $1
          AND deleted_at IS NULL`,
      [hostelId]
    );

    await pool.query(
      `UPDATE public.hostels
          SET plan_status = 'archived',
              updated_at  = NOW()
        WHERE hostel_id   = $1`,
      [hostelId]
    );

    await pool.query(
      `INSERT INTO public.audit_log
         (hostel_id, user_id, action, entity_type, entity_id, new_data)
       VALUES ($1, NULL, 'pii_purged', 'hostel', $1,
               jsonb_build_object('students_anonymised', $2, 'purged_at', NOW()))`,
      [hostelId, rowCount ?? 0]
    );

    await pool.query('COMMIT');
    console.log(`[billing-sync] Hostel ${hostelId} PII purged — ${rowCount} students anonymised`);
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
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