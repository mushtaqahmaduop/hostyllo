import { Worker, Job } from 'bullmq';
import { bullmqRedis } from '../lib/bullmq-redis.js';
import { pool } from '../lib/db.js';
import { moveToDLQ } from './dlq.js';

// ─── Job Types ────────────────────────────────────────────────────────────────

type EmailJobType =
  | 'password_reset'       // OTP for reset-password flow
  | 'trial_warning'        // Day 7 / Day 12 / Day 14 trial expiry warning
  | 'plan_activated'       // Confirmation after manual or automated activation
  | 'suspension_warning'   // Dunning — Day 1, Day 3, Day 7 of PAST_DUE
  | 'account_suspended'    // Day 14 — account is now suspended
  | 'data_export_ready';   // Day 28 — export download link

export interface EmailSendJob {
  type: EmailJobType;
  to: string;              // recipient email
  hostelId: string;
  data: Record<string, unknown>; // template-specific payload
}

// ─── Resend client (lazy — only initialised if key present) ──────────────────

let resend: { emails: { send: (payload: unknown) => Promise<unknown> } } | null = null;

async function getResend() {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  const { Resend } = await import('resend');
  resend = new Resend(key);
  return resend;
}

const FROM = process.env.EMAIL_FROM ?? 'HOSTYLLO <noreply@hostyllo.app>';

// ─── Templates ───────────────────────────────────────────────────────────────

function buildSubjectAndHtml(job: EmailSendJob): { subject: string; html: string } {
  const { type, data } = job;

  switch (type) {
    case 'password_reset':
      return {
        subject: 'Your HOSTYLLO password reset code',
        html: `
          <p>Your one-time password reset code is:</p>
          <h2 style="letter-spacing:4px">${data.otp}</h2>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you did not request this, ignore this email.</p>
        `,
      };

    case 'trial_warning':
      return {
        subject: `Your HOSTYLLO trial ends in ${data.daysLeft} day${(data.daysLeft as number) === 1 ? '' : 's'}`,
        html: `
          <p>Hi ${data.ownerName ?? 'there'},</p>
          <p>Your HOSTYLLO trial for <strong>${data.hostelName}</strong> expires in
             <strong>${data.daysLeft} day${(data.daysLeft as number) === 1 ? '' : 's'}</strong>.</p>
          <p>Upgrade now to keep your student records, payment history, and receipts.</p>
          <p><a href="https://app.hostyllo.app/settings/subscription">Upgrade →</a></p>
        `,
      };

    case 'plan_activated':
      return {
        subject: 'Your HOSTYLLO account is now active',
        html: `
          <p>Hi ${data.ownerName ?? 'there'},</p>
          <p>Your <strong>${data.plan}</strong> plan for <strong>${data.hostelName}</strong>
             is now active.</p>
          <p>Billing period: ${data.periodStart} → ${data.periodEnd}</p>
          <p><a href="https://app.hostyllo.app">Open HOSTYLLO →</a></p>
        `,
      };

    case 'suspension_warning':
      return {
        subject: `Action required — HOSTYLLO payment overdue (Day ${data.dunningDay})`,
        html: `
          <p>Hi ${data.ownerName ?? 'there'},</p>
          <p>Your HOSTYLLO subscription payment is overdue.
             Your account will be suspended in <strong>${data.daysUntilSuspension} days</strong>
             if payment is not received.</p>
          <p>Please contact us on WhatsApp or email to arrange payment.</p>
        `,
      };

    case 'account_suspended':
      return {
        subject: 'Your HOSTYLLO account has been suspended',
        html: `
          <p>Hi ${data.ownerName ?? 'there'},</p>
          <p>Your HOSTYLLO account for <strong>${data.hostelName}</strong> has been suspended
             due to non-payment.</p>
          <p>Your data is safe and will be available for export for the next 28 days.
             Contact us to reactivate.</p>
        `,
      };

    case 'data_export_ready':
      return {
        subject: 'Your HOSTYLLO data export is ready',
        html: `
          <p>Hi ${data.ownerName ?? 'there'},</p>
          <p>Your data export for <strong>${data.hostelName}</strong> is ready to download.</p>
          <p><a href="${data.exportUrl}">Download your data →</a></p>
          <p>This link expires in 24 hours.</p>
        `,
      };
  }
}

// ─── Core send logic ─────────────────────────────────────────────────────────

async function sendEmail(job: Job<EmailSendJob>): Promise<void> {
  const { to, hostelId, type } = job.data;
  const { subject, html } = buildSubjectAndHtml(job.data);

  const client = await getResend();

  if (!client) {
    // Phase 1 safe fallback — Resend key not configured yet
    console.log(`[email-send] RESEND_API_KEY not set — would send "${subject}" to ${to}`);
  } else {
    await client.emails.send({ from: FROM, to, subject, html });
    console.log(`[email-send] Sent "${subject}" to ${to}`);
  }

  // Audit log — always, regardless of send method
  await pool.query(
    `INSERT INTO public.audit_log
       (hostel_id, user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, NULL, 'email_sent', 'email', $1,
             jsonb_build_object('type', $2, 'to', $3, 'subject', $4))`,
    [hostelId, type, to, subject]
  );
}

// ─── Worker ──────────────────────────────────────────────────────────────────

const worker = new Worker<EmailSendJob>(
  'email-send',
  async (job) => {
    console.log(`[email-send] Processing job ${job.id} type=${job.data.type} to=${job.data.to}`);
    await sendEmail(job);
  },
  {
    connection: bullmqRedis,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

// INVARIANT
worker.on('failed', (job, err) => {
  console.error(`[email-send] Job ${job?.id} failed (type=${job?.data?.type}):`, err.message);
  moveToDLQ(job, err);
});

worker.on('completed', (job) => {
  console.log(`[email-send] Job ${job.id} completed (type=${job.data.type})`);
});

worker.on('error', (err) => {
  console.error('[email-send] Worker error:', err);
});

export { worker as emailSendWorker };