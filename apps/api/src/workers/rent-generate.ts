import { Worker, Job } from 'bullmq';
import { bullmqRedis } from '../lib/bullmq-redis.js';
import { pool } from '../lib/db.js';
import { moveToDLQ } from './dlq.js';

interface RentGenerateJob {
  hostelId: string;
  monthLabel: string; // "YYYY-MM" e.g. "2026-06"
}

async function generateMonthlyRent(hostelId: string, monthLabel: string): Promise<void> {
  const monthDate = `${monthLabel}-01`;

  const { rows: students } = await pool.query(
    `SELECT s.id, s.hostel_id, s.monthly_fee, s.admission_fee, s.room_id
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

  let created = 0;
  let skipped = 0;

  for (const student of students) {
    const receiptResult = await pool.query(
      `SELECT get_next_receipt_number($1) as receipt_number`,
      [hostelId]
    );
    const receiptNumber = receiptResult.rows[0].receipt_number;
    const totalDue = student.monthly_fee;

    const result = await pool.query(
      `INSERT INTO public.payments
         (hostel_id, student_id, room_id, month, rent, admission_fee,
          concession, total_due, paid, unpaid, status, receipt_number)
       VALUES
         ($1, $2, $3, $4, $5, 0, 0, $5, 0, $5, 'pending', $6)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [student.hostel_id, student.id, student.room_id, monthDate, totalDue, receiptNumber]
    );

    if (result.rowCount && result.rowCount > 0) created++;
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

export { worker as rentGenerateWorker };
