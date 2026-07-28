import { Worker, Job } from 'bullmq';
import { bullmqRedis } from '../lib/bullmq-redis.js';
import { pool } from '../lib/db.js';
import { moveToDLQ } from './dlq.js';

/**
 * Auto-confirms cancellations whose vacate date has passed.
 *
 * This mirrors `POST /cancellations/:id/confirm` (routes/cancellations.ts) deliberately and to the
 * letter — same three writes, same audit row. That route is the built and exercised path; a worker
 * that vacates a student differently is a second definition of what "cancelled" means, and the two
 * would drift.
 *
 * Runs on the privileged pool, not `withTenant`, because it sweeps every tenant in one pass. That
 * is the documented two-identity design (migration 010): routes run as the RLS-bound `hostyllo_app`
 * role, cross-tenant background work runs as the owner. Every statement below is still explicitly
 * scoped by `hostel_id`, so a bug here cannot silently touch the wrong tenant.
 *
 * ⚠️ Nothing enqueues to this worker yet — `apps/api` has no BullMQ producer at all. See
 * `tasks/todo`; the scheduling decision is still open. This is fixed ahead of that so the code is
 * correct whenever it is finally wired up.
 */

interface AutoCancelResult {
  confirmed: number;
  skipped: number;
}

async function processAutoCancellations(): Promise<AutoCancelResult> {
  /*
   * Candidate selection.
   *
   * Previously this read `cancellation_date`, which is not a column — the table's field is
   * `vacate_date` (migration 004). It also wrote `auto_confirmed`, which does not exist either.
   * The old statement could not have run at all.
   *
   * The date is compared in the hostel's own timezone rather than the container's. Railway runs
   * UTC; Pakistan is UTC+5, so a sweep at 02:00 local is 21:00 UTC the *previous* day, and a
   * naive `CURRENT_DATE` would leave a cancellation unprocessed for an extra day — or, run the
   * other way, free a bed early. Same class of bug as the Karachi handling in the payment flows.
   *
   * `<` not `<=`: the student is entitled to the whole of their vacate date. The bed frees on the
   * first sweep *after* it, which is what the original intent was and is the conservative side to
   * err on — freeing a bed a day early means someone else can be assigned to it while its
   * occupant is still moving out.
   */
  const { rows } = await pool.query<{
    id: string;
    hostel_id: string;
    student_id: string;
    room_id: string | null;
    bed_id: string | null;
  }>(
    `SELECT c.id, c.hostel_id, c.student_id, s.room_id, s.bed_id
     FROM public.cancellations c
     JOIN public.students s ON s.id = c.student_id AND s.hostel_id = c.hostel_id
     JOIN public.hostels  h ON h.id = c.hostel_id
     WHERE c.status = 'pending'
       AND c.deleted_at IS NULL
       AND s.deleted_at IS NULL
       AND c.vacate_date < (NOW() AT TIME ZONE COALESCE(h.timezone, 'Asia/Karachi'))::date`
  );

  if (rows.length === 0) {
    console.log('[auto-cancel] No cancellations due');
    return { confirmed: 0, skipped: 0 };
  }

  let confirmed = 0;
  let skipped = 0;
  const failures: { id: string; error: string }[] = [];

  for (const row of rows) {
    /*
     * One transaction per cancellation, not one for the whole sweep.
     *
     * The three writes below must be all-or-nothing: without that, a failure between them leaves
     * a student vacated while their bed still reads occupied, and the room grid then shows a bed
     * nobody can be assigned to. That was the real risk in the previous version — it ran three
     * bare `pool.query` calls with no transaction at all.
     *
     * Per-row rather than per-sweep so one bad cancellation cannot roll back every other hostel's.
     */
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      /*
       * Claim it by UPDATE ... WHERE status = 'pending'. The candidate list was read outside this
       * transaction, so a warden may have confirmed the same cancellation by hand in between. If
       * the claim matches no row, someone else won and this one is silently skipped — which also
       * makes the whole job safe to retry after a partial failure.
       */
      const claim = await client.query(
        `UPDATE public.cancellations
         SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND hostel_id = $2 AND status = 'pending' AND deleted_at IS NULL
         RETURNING id`,
        [row.id, row.hostel_id]
      );

      if (claim.rowCount === 0) {
        await client.query('ROLLBACK');
        skipped++;
        continue;
      }

      // `confirmed_by` stays NULL: there is no user behind this. That NULL, on a confirmed row, is
      // how an auditor tells an automatic confirmation from a warden's — which is the job the
      // non-existent `auto_confirmed` column was reaching for.

      await client.query(
        `UPDATE public.students
         SET status = 'vacated', room_id = NULL, bed_id = NULL, updated_at = NOW()
         WHERE id = $1 AND hostel_id = $2`,
        [row.student_id, row.hostel_id]
      );

      /*
       * The bed comes from `students.bed_id`. The previous version did
       * `UPDATE beds SET status = 'available', occupant_id = NULL WHERE occupant_id = $1` — the
       * beds table has no `occupant_id` (the link runs the other way, students → beds), and
       * 'available' is not in its status CHECK, which allows only vacant/occupied/maintenance.
       */
      if (row.bed_id) {
        await client.query(
          `UPDATE public.beds
           SET status = 'vacant', updated_at = NOW()
           WHERE id = $1 AND hostel_id = $2`,
          [row.bed_id, row.hostel_id]
        );
      }

      // INVARIANT-5: audit_log is INSERT-ONLY, and a student losing their bed is exactly the kind
      // of lifecycle change it exists to record. The route writes this row; the worker skipping it
      // would leave automatic vacations as the only untraceable ones.
      await client.query(
        `INSERT INTO public.audit_log
           (hostel_id, user_id, action, entity_type, entity_id, old_data, new_data)
         VALUES ($1, NULL, 'cancellation_auto_confirmed', 'cancellation', $2, $3::jsonb, $4::jsonb)`,
        [
          row.hostel_id,
          row.id,
          JSON.stringify({
            status: 'pending',
            student_id: row.student_id,
            room_id: row.room_id,
            bed_id: row.bed_id,
          }),
          JSON.stringify({ status: 'confirmed', student_status: 'vacated', confirmed_by: null }),
        ]
      );

      await client.query('COMMIT');
      confirmed++;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {
        // The connection may already be unusable; the rollback failing is not the error worth
        // reporting, and swallowing it keeps the original cause intact.
      });
      failures.push({ id: row.id, error: err instanceof Error ? err.message : String(err) });
    } finally {
      client.release();
    }
  }

  console.log(
    `[auto-cancel] ${confirmed} confirmed, ${skipped} already handled, ${failures.length} failed`
  );

  /*
   * Surface failures by throwing, so BullMQ retries and — once attempts are exhausted — the job
   * lands in the DLQ. Everything that succeeded is already committed, and the claim-by-UPDATE
   * above makes the retry skip it, so a rerun costs nothing and cannot double-vacate.
   */
  if (failures.length > 0) {
    throw new Error(
      `[auto-cancel] ${failures.length} of ${rows.length} failed: ` +
        failures.map((f) => `${f.id} (${f.error})`).join('; ')
    );
  }

  return { confirmed, skipped };
}

const worker = new Worker(
  'auto-cancel',
  async (job: Job) => {
    console.log(`[auto-cancel] Running job ${job.id}`);
    return await processAutoCancellations();
  },
  {
    connection: bullmqRedis,
    // One at a time: the sweep is global, and two concurrent passes would race for the same
    // candidates. The claim-by-UPDATE makes that safe, but there is nothing to gain from it.
    concurrency: 1,
  }
);

// INVARIANT
worker.on('failed', (job, err) => {
  console.error(`[auto-cancel] Job ${job?.id} failed:`, err.message);
  moveToDLQ(job, err);
});

worker.on('completed', (job) => {
  console.log(`[auto-cancel] Job ${job.id} completed`);
});

worker.on('error', (err) => {
  console.error('[auto-cancel] Worker error:', err);
});

export { worker as autoCancelWorker, processAutoCancellations };
