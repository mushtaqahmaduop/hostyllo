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
import { OWNER_A_EMAIL, HOSTEL_A_STUDENT_ID, LOGIN_IP, loginAs } from './fixtures.js';

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

  tokenA = await loginAs(app, OWNER_A_EMAIL, LOGIN_IP.defaulters);

  // A genuine defaulter: partially paid, so it lands in the pending/partial filter.
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/payments',
    headers: { ...auth(), 'x-idempotency-key': `defaulters-test-${MONTH}` },
    payload: { studentId: HOSTEL_A_STUDENT_ID, month: MONTH, rent: RENT, paid: PART_PAID },
  });
  // Asserted here rather than left to fail downstream: reading the wrong field off this response
  // surfaced as a 400 "params/id must match format uuid" three tests later, which points at the
  // PATCH route instead of at the setup that actually went wrong.
  expect(created.statusCode, created.body).toBe(201);
  createdPaymentId = created.json().data.paymentId;
  expect(createdPaymentId, 'setup must yield a payment id').toMatch(/^[0-9a-f-]{36}$/);
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

    // PATCH answers `data: null`, so the settled state is read back from the row rather than from
    // the response.
    const row = await pool.query('SELECT status, unpaid FROM public.payments WHERE id = $1', [
      createdPaymentId,
    ]);
    expect(row.rows[0].status).toBe('paid');
    expect(Number(row.rows[0].unpaid)).toBe(0);

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
