import { Job } from 'bullmq';
import { pool } from '../lib/db.js';

export async function moveToDLQ(job: Job | undefined, err: Error): Promise<void> {
  if (!job) return;
  try {
    // Columns must match the dlq_jobs schema (migration 006): data/error, NOT job_data/
    // error_message, and there is no unique index on job_id to ON CONFLICT against. The previous
    // version referenced non-existent columns, so every DLQ insert silently failed (swallowed
    // below) and the dead-letter table never recorded anything.
    await pool.query(
      `INSERT INTO public.dlq_jobs
        (hostel_id, queue_name, job_id, job_name, data, error, failed_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())`,
      [
        (job.data as { hostelId?: string } | undefined)?.hostelId ?? null,
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