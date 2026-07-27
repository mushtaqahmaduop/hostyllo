import { Job } from 'bullmq';
import { pool } from '../lib/db.js';

export async function moveToDLQ(job: Job | undefined, err: Error): Promise<void> {
  if (!job) return;

  // BullMQ emits `failed` on EVERY attempt, not only the last one. Without this guard a job
  // configured for 5 attempts that fails four times and then succeeds still wrote four rows into
  // dlq_jobs — an operator reading the dead-letter table would see jobs that are not dead. The
  // guard lives here rather than in each worker's handler so all five share one definition of
  // "exhausted"; it matches the pattern docs/06_CLAUDE_MD_v15.md has documented all along.
  const maxAttempts = job.opts?.attempts ?? 1;
  if (typeof job.attemptsMade === 'number' && job.attemptsMade < maxAttempts) return;

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