/**
 * Monthly rent generation — specifically, that mess is billed.
 *
 * The defect these exist to prevent: until 2026-08-06 `rent-generate` inserted
 * `rent = monthly_fee` and ignored `mess_fee` entirely, while migration 014 declares the column is
 * "billed together with monthly_fee" and the Students screen presents rent+mess as the monthly
 * figure. It went unnoticed through a live staging run because every seeded student had
 * `mess_fee = NULL`. The first student with a mess fee would have been under-billed every month,
 * silently and forever.
 *
 * Mess is asserted as a `payment_extra_charges` row, not as inflated `rent`, because the canonical
 * formula (`packages/db/src/paymentService.ts`) is `rent + admission_fee + Σ(extras) - concession`
 * and `PATCH /payments/:id` recalculates from the payment's real extras. A total that included
 * mess with no extras row to justify it would be silently reduced by the first owner edit — so the
 * last test here is the one that matters most: it recomputes the canonical formula from what is
 * actually on disk.
 *
 * These run the generator function directly rather than through BullMQ; the queue is not the part
 * under test.
 *
 * Integration test: needs the seeded test DB (globalSetup). Skips if DATABASE_URL is unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { HOSTEL_A_ID } from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;

let pool: Pool;
let generateMonthlyRent: (hostelId: string, monthLabel: string) => Promise<void>;

// This suite owns these rows entirely, so it can assert exact end states.
const ROOM = '0a0000e0-0000-4000-8000-00000000e000';
const STUDENT = {
  withMess: '0a0000e1-0000-4000-8000-00000000e001',
  noMess: '0a0000e1-0000-4000-8000-00000000e002',
  zeroMess: '0a0000e1-0000-4000-8000-00000000e003',
};
const ALL_STUDENTS = Object.values(STUDENT);

// A month no other suite bills, so the generator's "already billed" pre-check cannot see
// another test's rows and skip ours.
const MONTH = '2031-03';
const MONTH_DATE = '2031-03-01';

const MONTHLY_FEE = 8000;
const MESS_FEE = 1500;

/*
 * Per-test cleanup. Deliberately does NOT touch `rooms`: the room is created once in beforeAll and
 * every student references it, so deleting it here (as the first version of this file did) removed
 * the room between tests and every seedStudent then failed `students_room_id_fkey`. The room is
 * dropped once, in afterAll.
 */
async function cleanup() {
  // payment_extra_charges is ON DELETE CASCADE from payments (migration 003:48).
  await pool.query(
    `DELETE FROM public.payments WHERE student_id = ANY($1::uuid[])`,
    [ALL_STUDENTS]
  );
  await pool.query('DELETE FROM public.students WHERE id = ANY($1::uuid[])', [ALL_STUDENTS]);
}

/** `mess_fee` is the variable under test; NULL and 0 are deliberately different inputs. */
async function seedStudent(id: string, messFee: number | null) {
  await pool.query(
    `INSERT INTO public.students
       (id, hostel_id, room_id, name, phone, monthly_fee, admission_fee, mess_fee, status, join_date)
     VALUES ($1, $2, $3, $4, '03001234567', $5, 0, $6, 'active', CURRENT_DATE)`,
    [id, HOSTEL_A_ID, ROOM, `Mess Test ${id.slice(-4)}`, MONTHLY_FEE, messFee]
  );
}

async function paymentFor(studentId: string) {
  const { rows } = await pool.query(
    `SELECT id, rent, admission_fee, concession, total_due, unpaid, status
       FROM public.payments
      WHERE student_id = $1 AND month = $2::date AND deleted_at IS NULL`,
    [studentId, MONTH_DATE]
  );
  return rows[0];
}

async function extrasFor(paymentId: string) {
  const { rows } = await pool.query(
    `SELECT label, amount FROM public.payment_extra_charges WHERE payment_id = $1 ORDER BY label`,
    [paymentId]
  );
  return rows;
}

beforeAll(async () => {
  if (!HAS_DB) return;
  // Privileged pool (postgres) — the worker runs cross-tenant by design (migration 010).
  ({ pool } = await import('../lib/db.js'));
  ({ generateMonthlyRent } = await import('../workers/rent-generate.js'));
  await pool.query(
    `INSERT INTO public.rooms (id, hostel_id, number, capacity, monthly_fee)
     VALUES ($1, $2, 'E-1', 4, $3) ON CONFLICT (id) DO NOTHING`,
    [ROOM, HOSTEL_A_ID, MONTHLY_FEE]
  );
});

beforeEach(async () => {
  if (!HAS_DB) return;
  await cleanup();
});

afterAll(async () => {
  if (!HAS_DB) return;
  await cleanup();
  await pool.query('DELETE FROM public.rooms WHERE id = $1', [ROOM]);
});

describe.skipIf(!HAS_DB)('rent generation — mess billing', () => {
  it('bills mess as an extra charge and leaves rent alone', async () => {
    await seedStudent(STUDENT.withMess, MESS_FEE);
    await generateMonthlyRent(HOSTEL_A_ID, MONTH);

    const payment = await paymentFor(STUDENT.withMess);
    expect(payment).toBeDefined();

    // rent stays the rent — this is what the receipt prints under that heading.
    expect(Number(payment.rent)).toBe(MONTHLY_FEE);
    expect(Number(payment.total_due)).toBe(MONTHLY_FEE + MESS_FEE);
    expect(Number(payment.unpaid)).toBe(MONTHLY_FEE + MESS_FEE);

    const extras = await extrasFor(payment.id);
    expect(extras).toHaveLength(1);
    expect(extras[0].label).toBe('Mess');
    expect(Number(extras[0].amount)).toBe(MESS_FEE);
  });

  it('bills no mess line at all when mess_fee is NULL', async () => {
    await seedStudent(STUDENT.noMess, null);
    await generateMonthlyRent(HOSTEL_A_ID, MONTH);

    const payment = await paymentFor(STUDENT.noMess);
    expect(Number(payment.total_due)).toBe(MONTHLY_FEE);
    // NULL means "no mess". A zero-amount line would claim the student is on a free mess plan.
    expect(await extrasFor(payment.id)).toHaveLength(0);
  });

  it('bills a zero line when mess_fee is 0 — included and zero-rated is not the same as absent', async () => {
    await seedStudent(STUDENT.zeroMess, 0);
    await generateMonthlyRent(HOSTEL_A_ID, MONTH);

    const payment = await paymentFor(STUDENT.zeroMess);
    expect(Number(payment.total_due)).toBe(MONTHLY_FEE);

    // The distinction migration 014 exists to record: 0 is a mess plan that costs nothing.
    const extras = await extrasFor(payment.id);
    expect(extras).toHaveLength(1);
    expect(Number(extras[0].amount)).toBe(0);
  });

  it('leaves total_due equal to the canonical formula over the stored extras', async () => {
    /*
     * The real regression guard. `PATCH /payments/:id` recomputes total_due as
     * rent + admission_fee + Σ(extras) - concession. If the generator and that formula disagree,
     * the first owner edit silently changes what the student owes.
     */
    await seedStudent(STUDENT.withMess, MESS_FEE);
    await generateMonthlyRent(HOSTEL_A_ID, MONTH);

    const payment = await paymentFor(STUDENT.withMess);
    const extras = await extrasFor(payment.id);

    const { calculateUnpaid } = await import('@hostyllo/db');
    const recomputed = calculateUnpaid(
      Number(payment.rent),
      Number(payment.admission_fee),
      extras.map((e: { amount: number }) => Number(e.amount)),
      Number(payment.concession),
      0
    );

    expect(recomputed.totalDue).toBe(Number(payment.total_due));
    expect(recomputed.unpaid).toBe(Number(payment.unpaid));
    expect(recomputed.status).toBe(payment.status);
  });
});
