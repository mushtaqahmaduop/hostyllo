import { Worker, Job } from 'bullmq';
import { bullmqRedis } from '../lib/bullmq-redis.js';
import { pool } from '../lib/db.js';
import { withTransaction } from '../lib/tx.js';
import { moveToDLQ } from './dlq.js';

interface RentGenerateJob {
  hostelId: string;
  monthLabel: string; // "YYYY-MM" e.g. "2026-06"
}

async function generateMonthlyRent(hostelId: string, monthLabel: string): Promise<void> {
  const monthDate = `${monthLabel}-01`;

  const { rows: students } = await pool.query(
    `SELECT s.id, s.hostel_id, s.monthly_fee, s.admission_fee, s.mess_fee, s.room_id
     FROM public.students s
     WHERE s.hostel_id = $1
       AND s.status = 'active'
       AND s.deleted_at IS NULL`,
    [hostelId]
  );

  if (students.length === 0) {
    console.log(`[rent-generate] No active students for hostel ${hostelId}`);
    return;
  }

  // Find students already billed this month FIRST, so skips don't burn
  // receipt numbers (get_next_receipt_number increments even when the
  // insert conflicts, leaving gaps in the receipt sequence)
  const { rows: existing } = await pool.query(
    `SELECT student_id FROM public.payments
     WHERE hostel_id = $1
       AND date_trunc('month', month) = date_trunc('month', $2::date)
       AND status != 'void' AND deleted_at IS NULL`,
    [hostelId, monthDate]
  );
  const alreadyBilled = new Set(existing.map((r: { student_id: string }) => r.student_id));

  let created = 0;
  let skipped = 0;

  for (const student of students) {
    if (alreadyBilled.has(student.id)) { skipped++; continue; }

    const receiptResult = await pool.query(
      `SELECT get_next_receipt_number($1) as receipt_number`,
      [hostelId]
    );
    const receiptNumber = receiptResult.rows[0].receipt_number;

    /*
     * Mess is billed as a `payment_extra_charges` row, NOT folded into `rent`.
     *
     * Three reasons, in order of how much they cost to get wrong:
     *   1. The canonical formula is `rent + admission_fee + Σ(extras) - concession`
     *      (packages/db/src/paymentService.ts). `PATCH /payments/:id` recalculates from the
     *      payment's REAL extra-charge rows (routes/payments.ts:576). A payment whose `total_due`
     *      included mess but had no extras row would have the mess silently deleted by the first
     *      owner edit — the total would drop and nothing would say why.
     *   2. `rent` is what the receipt prints as rent. Folding mess in overstates it every month.
     *   3. The redesigned Students screen shows rent and mess broken out beneath the combined
     *      figure, so the two have to stay separately addressable.
     *
     * NULL vs 0 is preserved, because migration 014 makes them different facts: NULL means mess is
     * not included and gets no line at all; 0.00 means included and zero-rated, and gets a line
     * reading zero. Collapsing them would erase the distinction the column exists to record.
     *
     * The insert and its mess line share one transaction. Written separately, a crash between them
     * leaves a payment whose `total_due` includes a charge with no row to justify it — which is
     * defect (1) above, arrived at by a different route.
     *
     * All money arithmetic is done by Postgres on NUMERIC, never in JS. `8000.00 + 0.10` in a
     * double is not 8000.10, and INVARIANT-4 exists because money must not round-trip a float.
     */
    const messFee: number | null = student.mess_fee ?? null;

    const result = await withTransaction(async (client) => {
      // Explicit conflict target (uq_payments_student_month, migration 008)
      // as a race-condition backstop for the pre-check above
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO public.payments
           (hostel_id, student_id, room_id, month, rent, admission_fee,
            concession, total_due, paid, unpaid, status, receipt_number)
         VALUES
           ($1, $2, $3, $4, $5, 0, 0,
            $5::numeric + COALESCE($7::numeric, 0), 0,
            $5::numeric + COALESCE($7::numeric, 0), 'pending', $6)
         ON CONFLICT (hostel_id, student_id, month) WHERE status != 'void' AND deleted_at IS NULL DO NOTHING
         RETURNING id`,
        [student.hostel_id, student.id, student.room_id, monthDate,
         student.monthly_fee, receiptNumber, messFee]
      );

      if (inserted.rowCount && messFee !== null) {
        await client.query(
          `INSERT INTO public.payment_extra_charges (hostel_id, payment_id, label, amount)
           VALUES ($1, $2, 'Mess', $3::numeric)`,
          [student.hostel_id, inserted.rows[0].id, messFee]
        );
      }

      return inserted.rowCount ?? 0;
    });

    if (result > 0) created++;
    else skipped++;
  }

  console.log(`[rent-generate] Hostel ${hostelId} month ${monthLabel}: ${created} created, ${skipped} skipped`);
}

const worker = new Worker(
  'rent-generate',
  async (job: Job<RentGenerateJob>) => {
    console.log(`[rent-generate] Processing job ${job.id}`);
    await generateMonthlyRent(job.data.hostelId, job.data.monthLabel);
  },
  { connection: bullmqRedis, concurrency: 2 }
);

worker.on('failed', (job, err) => { console.error(`[rent-generate] Job ${job?.id} failed:`, err.message); moveToDLQ(job, err); });
worker.on('completed', (job) => { console.log(`[rent-generate] Job ${job.id} completed`); });
worker.on('error', (err) => { console.error('[rent-generate] Worker error:', err); });

export { worker as rentGenerateWorker, generateMonthlyRent };
