import { Worker, Job } from 'bullmq';
import { bullmqRedis } from '../lib/bullmq-redis.js';
import { pool } from '../lib/db.js';
import { moveToDLQ } from './dlq.js';

interface PdfReceiptJob {
  paymentId: string;
  hostelId: string;
}

async function generateReceiptPdf(paymentId: string, hostelId: string): Promise<void> {
  const { rows } = await pool.query(
    `SELECT
       p.id, p.receipt_number, p.amount_paid, p.total_due, p.unpaid,
       p.month_label, p.payment_date, p.payment_method, p.notes,
       s.full_name, s.phone,
       r.number as room_number,
       b.label as bed_label,
       h.name as hostel_name, h.logo_url, h.tagline, h.address
     FROM public.payments p
     JOIN public.students s ON s.id = p.student_id
     JOIN public.rooms r    ON r.id = p.room_id
     LEFT JOIN public.beds b ON b.id = p.bed_id
     JOIN public.hostels h  ON h.id = p.hostel_id
     WHERE p.id = $1 AND p.hostel_id = $2`,
    [paymentId, hostelId]
  );

  if (!rows[0]) {
    throw new Error(`Payment ${paymentId} not found for hostel ${hostelId}`);
  }

  await pool.query(
    `UPDATE public.payments
     SET receipt_generated = true, receipt_generated_at = NOW()
     WHERE id = $1`,
    [paymentId]
  );

  console.log(`[pdf-receipts] Receipt generated for payment ${paymentId}`);
}

const worker = new Worker(
  'pdf-receipts',
  async (job: Job<PdfReceiptJob>) => {
    console.log(`[pdf-receipts] Processing job ${job.id} for payment ${job.data.paymentId}`);
    await generateReceiptPdf(job.data.paymentId, job.data.hostelId);
  },
  {
    connection: bullmqRedis,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

// INVARIANT
worker.on('failed', (job, err) => {
  console.error(`[pdf-receipts] Job ${job?.id} failed:`, err.message);
  moveToDLQ(job, err);
});

worker.on('completed', (job) => {
  console.log(`[pdf-receipts] Job ${job.id} completed`);
});

worker.on('error', (err) => {
  console.error('[pdf-receipts] Worker error:', err);
});

export { worker as pdfReceiptsWorker };