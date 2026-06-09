import { Worker, Job } from 'bullmq';
import { bullmqRedis } from '../lib/bullmq-redis.js';
import { pool } from '../lib/db.js';
import { moveToDLQ } from './dlq.js';

interface RentGenerateJob {
  hostelId: string;
  monthLabel: string;
}

async function generateMonthlyRent(hostelId: string, monthLabel: string): Promise<void> {
  const { rows: students } = await pool.query(
    `SELECT s.id, s.hostel_id, s.rent_pkr, s.admission_fee_pkr,
            s.room_id, s.bed_id
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
    const result = await pool.query(
      `INSERT INTO public.payments
         (hostel_id, student_id, room_id, bed_id, rent_pkr, total_due,
          amount_paid, unpaid, status, month_label, due_date, receipt_number)
       VALUES
         ($1, $2, $3, $4, $5, $5,
          0, $5, 'pending', $6,
          (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day')::DATE,
          get_next_receipt_number($1))
       ON CONFLICT (hostel_id, student_id, month_label) DO NOTHING
       RETURNING id`,
      [student.hostel_id, student.id, student.room_id, student.bed_id, student.rent_pkr, monthLabel]
    );

    if (result.rowCount && result.rowCount > 0) {
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`[rent-generate] Hostel ${hostelId} month ${monthLabel}: ${created} created, ${skipped} skipped`);
}

const worker = new Worker(
  'rent-generate',
  async (job: Job<RentGenerateJob>) => {
    console.log(`[rent-generate] Processing job ${job.id}`);
    await generateMonthlyRent(job.data.hostelId, job.data.monthLabel);
  },
  {
    connection: bullmqRedis,
    concurrency: 2,
  }
);

// INVARIANT
worker.on('failed', (job, err) => {
  console.error(`[rent-generate] Job ${job?.id} failed:`, err.message);
  moveToDLQ(job, err);
});

worker.on('completed', (job) => {
  console.log(`[rent-generate] Job ${job.id} completed`);
});

worker.on('error', (err) => {
  console.error('[rent-generate] Worker error:', err);
});

export { worker as rentGenerateWorker };