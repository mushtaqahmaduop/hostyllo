import { Worker, Job } from 'bullmq';
import { bullmqRedis } from '../lib/bullmq-redis.js';
import { pool } from '../lib/db.js';
import { moveToDLQ } from './dlq.js';

async function processAutoCancellations(): Promise<void> {
  const { rows } = await pool.query(
    `UPDATE public.cancellations
     SET status = 'confirmed', confirmed_at = NOW(), auto_confirmed = true
     WHERE status = 'pending'
       AND cancellation_date < CURRENT_DATE
     RETURNING id, hostel_id, student_id`
  );

  if (rows.length === 0) {
    console.log('[auto-cancel] No pending cancellations to process');
    return;
  }

  for (const row of rows) {
    await pool.query(
      `UPDATE public.students
       SET deleted_at = NOW(), status = 'vacated'
       WHERE id = $1 AND hostel_id = $2 AND deleted_at IS NULL`,
      [row.student_id, row.hostel_id]
    );

    await pool.query(
      `UPDATE public.beds
       SET status = 'available', occupant_id = NULL
       WHERE occupant_id = $1`,
      [row.student_id]
    );
  }

  console.log(`[auto-cancel] Processed ${rows.length} cancellations`);
}

const worker = new Worker(
  'auto-cancel',
  async (job: Job) => {
    console.log(`[auto-cancel] Running job ${job.id}`);
    await processAutoCancellations();
  },
  {
    connection: bullmqRedis,
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

export { worker as autoCancelWorker };