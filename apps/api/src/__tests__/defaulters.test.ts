/**
 * GET /payments/defaulters must return the id of the outstanding payment row.
 *
 * Found 2026-07-28 while building the defaulters screen. The endpoint returned `studentId` but not
 * `paymentId`, which blocked the screen's entire purpose. Every defaulter *already has* a payment
 * row for that month — the query filters on status pending/partial — so settling one is
 * `PATCH /payments/:id`, never `POST /payments`: a POST hits the duplicate-month guard and 409s on
 * every row. With no payment id in the response there was nothing to deep-link a collect action to,
 * so the web list could only link to the student.
 *
 * These tests assert the whole chain, not just the field's presence: the id comes back, a POST for
 * the same month really does 409 (the reason the id is needed), and PATCHing that id settles the
 * row and removes it from the list.
 *
 * Integration test: needs the seeded test DB (globalSetup) + Redis. Skips if DATABASE_URL unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { OWNER_A_EMAIL, TEST_PASSWORD, HOSTEL_A_STUDENT_ID } from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;

// A month of its own, so this suite cannot collide with the seed or the other payment tests.
const MONTH = '2026-03';
const RENT = 6000;
const PART_PAID = 2000;

let app: FastifyInstance;
let pool: Pool;
let tokenA = '';
let createdPaymentId = '';

function auth() {
  return { authorization: `Bearer ${tokenA}` };
}

beforeAll(async () => {
  if (!HAS_DB) return;
  const { buildApp } = await import('../app.js');
  ({ pool } = await import('../lib/db.js'));

  // Idempotent re-runs against a persistent local DB.
  await pool.query(
    `DELETE FROM public.payments WHERE student_id = $1 AND date_trunc('month', month) = date_trunc('month', $2::date)`,
    [HOSTEL_A_STUDENT_ID, `${MONTH}-01`],
  );

  app = await buildApp();
  await app.ready();

  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: OWNER_A_EMAIL, password: TEST_PASSWORD },
  });
  tokenA = login.json().data.accessToken;

  // A genuine defaulter: partially paid, so it lands in the pending/partial filter.
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/payments',
    headers: { ...auth(), 'x-idempotency-key': `defaulters-test-${MONTH}` },
    payload: { studentId: HOSTEL_A_STUDENT_ID, month: MONTH, rent: RENT, paid: PART_PAID },
  });
  createdPaymentId = created.json().data.id;
});

afterAll(async () => {
  if (!HAS_DB) return;
  await pool.query(
    `DELETE FROM public.payments WHERE student_id = $1 AND date_trunc('month', month) = date_trunc('month', $2::date)`,
    [HOSTEL_A_STUDENT_ID, `${MONTH}-01`],
  );
  await app?.close();
});

describe.skipIf(!HAS_DB)('GET /payments/defaulters', () => {
  it('returns the outstanding payment id, not just the student id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/defaulters?month=${MONTH}`,
      headers: auth(),
    });
    expect(res.statusCode, res.body).toBe(200);

    const row = res.json().data.defaulters.find(
      (d: { studentId: string }) => d.studentId === HOSTEL_A_STUDENT_ID,
    );
    expect(row, 'the partially-paid student must appear as a defaulter').toBeDefined();
    expect(row.paymentId, 'the row must carry the id of the outstanding payment').toBe(
      createdPaymentId,
    );
  });

  // The reason paymentId is required at all: collecting from a defaulter cannot be a create.
  it('cannot be settled with POST — the duplicate-month guard rejects it', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments',
      headers: { ...auth(), 'x-idempotency-key': `defaulters-test-${MONTH}-retry` },
      payload: { studentId: HOSTEL_A_STUDENT_ID, month: MONTH, rent: RENT, paid: RENT },
    });
    expect(res.statusCode, res.body).toBe(409);
    expect(res.json().code).toBe('PAY_DUPLICATE_MONTH');
  });

  it('the returned id settles the row through PATCH and clears it from the list', async () => {
    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/payments/${createdPaymentId}`,
      headers: auth(),
      payload: { paid: RENT },
    });
    expect(patch.statusCode, patch.body).toBe(200);
    expect(patch.json().data.status).toBe('paid');

    const after = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/defaulters?month=${MONTH}`,
      headers: auth(),
    });
    const stillThere = after
      .json()
      .data.defaulters.some((d: { paymentId: string }) => d.paymentId === createdPaymentId);
    expect(stillThere, 'a fully-paid row must leave the defaulters list').toBe(false);
  });
});
