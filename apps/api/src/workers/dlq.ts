import { Job } from 'bullmq';
import { pool } from '../lib/db.js';

export async function moveToDLQ(job: Job | undefined, err: Error): Promise<void> {
  if (!job) return;
  try {
    await pool.query(
      `INSERT INTO public.dlq_jobs
        (queue_name, job_id, job_name, job_data, error_message, failed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (job_id) DO NOTHING`,
      [
        job.queueName,
        job.id,
        job.name,
        JSON.stringify(job.data),
        err.message,
      ]
    );
  } catch (dbErr) {
    // DLQ insert failed — log and continue, never throw
    console.error('[DLQ] Failed to insert job into dlq_jobs:', dbErr);
  }
}