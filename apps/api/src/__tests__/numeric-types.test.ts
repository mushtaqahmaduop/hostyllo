/**
 * Money and counts must leave the API as JS numbers.
 *
 * node-postgres returns NUMERIC (oid 1700) and INT8 (oid 20, what COUNT() returns) as strings.
 * Left that way they have produced three separate bugs in this codebase: rent totalled with `+`
 * concatenating ("5000" + "1000" = "50001000"), the same defect again in rent-generate multiplying
 * figures by ten, and dashboard/defaulters responses shipping `revenuePkr: "11000.00"` and
 * `activeStudents: "3"` to a client the API spec promises numbers to.
 *
 * `packages/db/src/withTenant.ts` now parses both at the driver, which fixes every route at once.
 * This suite is the guard on that: it asserts `typeof === 'number'` on the money-bearing responses
 * the web app actually reads, so removing or narrowing the type parsers fails here rather than in
 * a warden's ledger. A string would still render, still compare, and still concatenate silently —
 * that is precisely why it needs an assertion rather than a code review.
 *
 * Integration test: needs the seeded test DB (globalSetup) + Redis. Skips if DATABASE_URL unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { OWNER_A_EMAIL, TEST_PASSWORD, HOSTEL_A_STUDENT_ID } from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;

const MONTH = '2026-04';
const RENT = 7500;
const PART_PAID = 2500;

let app: FastifyInstance;
let pool: Pool;
let tokenA = '';

function get(url: string) {
  return app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${tokenA}` } });
}

beforeAll(async () => {
  if (!HAS_DB) return;
  const { buildApp } = await import('../app.js');
  ({ pool } = await import('../lib/db.js'));

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

  // Partially paid, so it carries a non-zero figure in every one of due / paid / unpaid.
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/payments',
    headers: { authorization: `Bearer ${tokenA}`, 'x-idempotency-key': `numeric-test-${MONTH}` },
    payload: { studentId: HOSTEL_A_STUDENT_ID, month: MONTH, rent: RENT, paid: PART_PAID },
  });
  // Without this, a failed setup shows up as an empty result set and reads as "the field is
  // missing" rather than "the row was never created".
  expect(created.statusCode, created.body).toBe(201);
});

afterAll(async () => {
  if (!HAS_DB) return;
  await pool.query(
    `DELETE FROM public.payments WHERE student_id = $1 AND date_trunc('month', month) = date_trunc('month', $2::date)`,
    [HOSTEL_A_STUDENT_ID, `${MONTH}-01`],
  );
  await app?.close();
});

describe.skipIf(!HAS_DB)('numeric response types', () => {
  it('GET /dashboard/stats returns numbers for money, counts and percentages', async () => {
    const res = await get(`/api/v1/dashboard/stats?month=${MONTH}`);
    expect(res.statusCode, res.body).toBe(200);

    const d = res.json().data;
    for (const field of [
      'revenuePkr',
      'pendingPkr',
      'expensesPkr',
      'netFundPkr',
      'activeStudents',
      'totalBeds',
      'occupiedBeds',
      'occupancyPct',
    ]) {
      expect(typeof d[field], `${field} must be a number, got ${JSON.stringify(d[field])}`).toBe(
        'number',
      );
    }
  });

  it('GET /payments/defaulters returns numbers in the rows and the totals', async () => {
    const res = await get(`/api/v1/payments/defaulters?month=${MONTH}`);
    expect(res.statusCode, res.body).toBe(200);

    const d = res.json().data;
    expect(typeof d.totalUnpaidPkr).toBe('number');
    expect(typeof d.totalDefaulters).toBe('number');

    const row = d.defaulters.find((x: { studentId: string }) => x.studentId === HOSTEL_A_STUDENT_ID);
    expect(row).toBeDefined();
    for (const field of ['totalDuePkr', 'amountPaidPkr', 'unpaidPkr']) {
      expect(typeof row[field], `${field} must be a number, got ${JSON.stringify(row[field])}`).toBe(
        'number',
      );
    }
  });

  it('GET /payments returns numbers on the rows', async () => {
    const res = await get(`/api/v1/payments?month=${MONTH}`);
    expect(res.statusCode, res.body).toBe(200);

    const body = res.json().data;
    expect(typeof body.total).toBe('number');

    const row = body.payments.find(
      (p: { studentId: string }) => p.studentId === HOSTEL_A_STUDENT_ID,
    );
    expect(row).toBeDefined();
    for (const field of ['rentPkr', 'totalDuePkr', 'amountPaidPkr', 'unpaidPkr']) {
      expect(typeof row[field], `${field} must be a number, got ${JSON.stringify(row[field])}`).toBe(
        'number',
      );
    }
  });

  // The point of parsing at the driver rather than at each call site: arithmetic on the values is
  // correct without anyone remembering to wrap them. Under the old behaviour this addition
  // concatenated, which is the exact shape of the rent bug fixed in July.
  it('the returned figures add up instead of concatenating', async () => {
    const res = await get(`/api/v1/payments?month=${MONTH}`);
    const row = res
      .json()
      .data.payments.find((p: { studentId: string }) => p.studentId === HOSTEL_A_STUDENT_ID);

    expect(row.amountPaidPkr + row.unpaidPkr).toBe(RENT);
    expect(row.amountPaidPkr).toBe(PART_PAID);
  });
});
