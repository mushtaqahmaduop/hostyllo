/**
 * Payment extras + audit-trail gate (Phase 1, tasks/todo section 0 last item).
 *
 * Guards the two payment defects fixed in ef4bbbc, which unit tests cannot catch because both are
 * about what reaches the DATABASE, not about the formula:
 *
 *   1. `extra_charges` was accepted by the API and silently dropped — never written to
 *      payment_extra_charges.
 *   2. PATCH /payments/:id recalculated with a hardcoded `[]` for extras instead of reading the
 *      payment's real ones, so editing any payment quietly erased its extra charges from the
 *      total. The PATCH test below is written to fail loudly against that version: it edits to a
 *      `paid` that settles the WRONG total exactly, so a regression flips both unpaid and status.
 *
 * Also asserts INVARIANT-5 (audit_log is INSERT-ONLY) against the live immutability trigger.
 *
 * Integration test: needs the seeded test DB (globalSetup) + Redis. Skips if DATABASE_URL unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { OWNER_A_EMAIL, HOSTEL_A_STUDENT_ID, LOGIN_IP, loginAs } from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;

// rent 8000 + admission 2000 + extras 800 - concession 300 = 10500
const RENT = 8000;
const ADMISSION_FEE = 2000;
const CONCESSION = 300;
const EXTRAS = [
  { label: 'Laundry', amount: 500 },
  { label: 'Wifi', amount: 300 },
];
const TOTAL_DUE_WITH_EXTRAS = 10500;
// What the total would wrongly be if extras were dropped: 8000 + 2000 - 300.
const TOTAL_DUE_WITHOUT_EXTRAS = 9700;
const INITIAL_PAID = 5000;
const MONTH = '2026-09';

let app: FastifyInstance;
let pool: Pool;
let tokenA = '';
let paymentId = '';

beforeAll(async () => {
  if (!HAS_DB) return;
  // Lazy import: route modules validate secrets at load, so only import with a live env.
  const { buildApp } = await import('../app.js');
  ({ pool } = await import('../lib/db.js'));

  // Idempotent re-runs against a persistent local DB: clear this student+month first. Deletes
  // extras before the payment (FK), and never touches audit_log — that table is INSERT-ONLY, and
  // the assertions below scope to this run's payment id anyway.
  await pool.query(
    `DELETE FROM public.payment_extra_charges
      WHERE payment_id IN (SELECT id FROM public.payments WHERE student_id = $1 AND month = $2)`,
    [HOSTEL_A_STUDENT_ID, MONTH + '-01']
  );
  await pool.query('DELETE FROM public.payments WHERE student_id = $1 AND month = $2', [
    HOSTEL_A_STUDENT_ID,
    MONTH + '-01',
  ]);

  app = await buildApp();
  await app.ready();
  tokenA = await loginAs(app, OWNER_A_EMAIL, LOGIN_IP.payments);
});

afterAll(async () => {
  if (app) await app.close();
});

describe.skipIf(!HAS_DB)('Payments — extra charges persistence', () => {
  it('POST /payments persists extra_charges and includes them in total_due', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments',
      headers: { authorization: `Bearer ${tokenA}`, 'x-idempotency-key': `extras-test-${MONTH}` },
      payload: {
        studentId: HOSTEL_A_STUDENT_ID,
        month: MONTH,
        rent: RENT,
        admission_fee: ADMISSION_FEE,
        concession: CONCESSION,
        paid: INITIAL_PAID,
        extra_charges: EXTRAS,
      },
    });

    expect(res.statusCode, res.body).toBe(201);
    const data = JSON.parse(res.body).data;
    paymentId = data.paymentId;
    expect(paymentId).toBeTruthy();

    // pg returns NUMERIC as strings — compare numerically, not by identity.
    expect(Number(data.totalDuePkr)).toBe(TOTAL_DUE_WITH_EXTRAS);
    expect(Number(data.unpaidPkr)).toBe(TOTAL_DUE_WITH_EXTRAS - INITIAL_PAID);
    expect(data.status).toBe('partial');
  });

  it('writes one payment_extra_charges row per charge, with label and amount intact', async () => {
    const r = await pool.query(
      `SELECT label, amount FROM public.payment_extra_charges
        WHERE payment_id = $1 ORDER BY label`,
      [paymentId]
    );

    expect(r.rows).toHaveLength(EXTRAS.length);
    expect(r.rows.map((x: { label: string }) => x.label)).toEqual(['Laundry', 'Wifi']);
    expect(r.rows.map((x: { amount: string }) => Number(x.amount))).toEqual([500, 300]);
  });
});

describe.skipIf(!HAS_DB)('Payments — audit trail (INVARIANT-5)', () => {
  it('POST writes a payment_created audit row carrying the extras', async () => {
    const r = await pool.query(
      `SELECT action, entity_type, new_data FROM public.audit_log
        WHERE entity_id = $1 AND action = 'payment_created'`,
      [paymentId]
    );

    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].entity_type).toBe('payment');
    expect(r.rows[0].new_data.extra_charges).toEqual(EXTRAS);
    expect(Number(r.rows[0].new_data.total_due)).toBe(TOTAL_DUE_WITH_EXTRAS);
  });

  it('audit_log rejects UPDATE and DELETE (immutability trigger)', async () => {
    await expect(
      pool.query(`UPDATE public.audit_log SET action = 'tampered' WHERE entity_id = $1`, [paymentId])
    ).rejects.toThrow();

    await expect(
      pool.query(`DELETE FROM public.audit_log WHERE entity_id = $1`, [paymentId])
    ).rejects.toThrow();
  });
});

describe.skipIf(!HAS_DB)('Payments — PATCH recalculates with the REAL extras', () => {
  it('editing paid keeps extras in total_due (regression: hardcoded [])', async () => {
    // Pay exactly the total that WOULD apply if extras were dropped. Correct behaviour leaves
    // 800 outstanding and status 'partial'; the old bug settles it to 0 / 'paid'.
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/payments/${paymentId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { paid: TOTAL_DUE_WITHOUT_EXTRAS },
    });
    expect(res.statusCode, res.body).toBe(200);

    const r = await pool.query(
      'SELECT total_due, paid, unpaid, status FROM public.payments WHERE id = $1',
      [paymentId]
    );
    const row = r.rows[0];

    expect(Number(row.total_due), 'extras must survive the edit').toBe(TOTAL_DUE_WITH_EXTRAS);
    expect(Number(row.paid)).toBe(TOTAL_DUE_WITHOUT_EXTRAS);
    expect(Number(row.unpaid)).toBe(TOTAL_DUE_WITH_EXTRAS - TOTAL_DUE_WITHOUT_EXTRAS);
    expect(row.status).toBe('partial');
  });

  it('PATCH writes a payment_updated audit row with old and new state', async () => {
    const r = await pool.query(
      `SELECT old_data, new_data FROM public.audit_log
        WHERE entity_id = $1 AND action = 'payment_updated'`,
      [paymentId]
    );

    expect(r.rows).toHaveLength(1);
    expect(Number(r.rows[0].old_data.paid)).toBe(INITIAL_PAID);
    expect(Number(r.rows[0].new_data.paid)).toBe(TOTAL_DUE_WITHOUT_EXTRAS);
    expect(Number(r.rows[0].new_data.total_due)).toBe(TOTAL_DUE_WITH_EXTRAS);
  });
});
