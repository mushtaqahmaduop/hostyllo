/**
 * students.ts request-validation gate (tasks/todo section 1.5).
 *
 * Those routes previously had hand-rolled checks only, so malformed input reached Postgres and
 * came back as a 500 for what is plainly a client error:
 *   - `/students/not-a-uuid`        → "invalid input syntax for type uuid"
 *   - `?limit=abc`                  → Number('abc') = NaN → LIMIT NaN
 *   - PATCH status: 'bogus'         → students_status_check constraint violation
 *
 * And one guard was wrong in the other direction: `!monthly_fee` rejected a fee of 0 as "Missing
 * required fields", even though the column is NUMERIC(10,2) NOT NULL DEFAULT 0 — a scholarship or
 * free bed could not be recorded. That case is the last test here.
 *
 * Integration test: needs the seeded test DB (globalSetup) + Redis. Skips if DATABASE_URL unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import {
  OWNER_A_EMAIL, LOGIN_IP, loginAs,
  HOSTEL_A_STUDENT_ID, HOSTEL_A_ROOM_ID, HOSTEL_A_BED_ID,
} from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;
const ZERO_FEE_PHONE = '+920000000999';
/** Its own phone so the record-view fixtures clean up independently of the zero-fee student. */
const CNIC_PHONE = '+920000000998';

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

  // Idempotent re-runs against a persistent local DB.
  await pool.query('DELETE FROM public.students WHERE phone = ANY($1)', [[ZERO_FEE_PHONE, CNIC_PHONE]]);

  app = await buildApp();
  await app.ready();
  tokenA = await loginAs(app, OWNER_A_EMAIL, LOGIN_IP.students);
});

afterAll(async () => {
  if (HAS_DB && pool) {
    await pool
      .query('DELETE FROM public.students WHERE phone = ANY($1)', [[ZERO_FEE_PHONE, CNIC_PHONE]])
      .catch(() => {});
    // The CNIC student occupies the shared bed; leaving it 'occupied' would fail any later run
    // of the admission test, which asserts the bed is free to take.
    await pool
      .query(`UPDATE public.beds SET status = 'vacant' WHERE id = $1`, [HOSTEL_A_BED_ID])
      .catch(() => {});
  }
  if (app) await app.close();
});

describe.skipIf(!HAS_DB)('students.ts — malformed input is 400, not 500', () => {
  it('GET /students/:id rejects a non-uuid id', async () => {
    const res = await get('/api/v1/students/not-a-uuid');
    expect(res.statusCode, 'must not reach Postgres as a uuid cast').toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('GET /students rejects a non-numeric limit', async () => {
    const res = await get('/api/v1/students?limit=abc');
    expect(res.statusCode, 'Number("abc") used to reach SQL as NaN').toBe(400);
  });

  it('GET /students rejects a status outside the CHECK constraint', async () => {
    const res = await get('/api/v1/students?status=bogus');
    expect(res.statusCode).toBe(400);
  });

  it('GET /students/search rejects a one-character query', async () => {
    const res = await get('/api/v1/students/search?q=a');
    expect(res.statusCode).toBe(400);
  });

  it('PATCH /students/:id rejects a status outside the CHECK constraint', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/students/${HOSTEL_A_STUDENT_ID}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { status: 'bogus' },
    });
    expect(res.statusCode, 'used to become a constraint violation (500)').toBe(400);
  });

  it('GET /students accepts a well-formed query', async () => {
    const res = await get('/api/v1/students?limit=10&offset=0&status=active');
    expect(res.statusCode, res.body).toBe(200);
  });
});

describe.skipIf(!HAS_DB)('students.ts — monthly_fee of 0 is a valid fee', () => {
  it('POST /students accepts monthly_fee: 0 (regression: !monthly_fee)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        name: 'Scholarship Student',
        phone: ZERO_FEE_PHONE,
        room_id: HOSTEL_A_ROOM_ID,
        bed_id: HOSTEL_A_BED_ID,
        monthly_fee: 0,
        join_date: '2026-09-01',
      },
    });

    expect(res.statusCode, res.body).toBe(201);

    const r = await pool.query('SELECT monthly_fee FROM public.students WHERE phone = $1', [
      ZERO_FEE_PHONE,
    ]);
    expect(r.rows).toHaveLength(1);
    expect(Number(r.rows[0].monthly_fee)).toBe(0);
  });

  // Same request, different property: creating that student must also mark the bed occupied.
  // Until 2026-07-27 it did not — beds.status was only ever written by /rooms/shift and
  // cancellation-restore, so every student added through the normal flow left their bed 'vacant'.
  // Double-booking was still prevented (that check reads the students table), but the dashboard
  // and /rooms both derive occupancy from beds.status, so a full hostel reported 0%. Found by
  // building the dashboard against real data, not by any test.
  it('marks the assigned bed occupied, and frees it again on delete', async () => {
    const bed = await pool.query('SELECT status FROM public.beds WHERE id = $1', [HOSTEL_A_BED_ID]);
    expect(bed.rows[0]?.status, 'creating a student must occupy the bed').toBe('occupied');

    const student = await pool.query('SELECT id FROM public.students WHERE phone = $1', [ZERO_FEE_PHONE]);
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/students/${student.rows[0].id}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(del.statusCode, del.body).toBe(200);

    const after = await pool.query('SELECT status FROM public.beds WHERE id = $1', [HOSTEL_A_BED_ID]);
    expect(after.rows[0]?.status, 'deleting the student must free the bed').toBe('vacant');
  });
});

/**
 * GET /students/:id — the record the student screen is built on.
 *
 * The endpoint used to `SELECT s.*`, which shipped the stored `cnic_encrypted`
 * ciphertext to every caller, and to hardcode `masked_cnic` to the constant mask
 * for every student including those who have never given a CNIC. Both are the
 * kind of defect that returns the moment someone reaches for `s.*` again, so
 * they are asserted rather than trusted.
 */
describe.skipIf(!HAS_DB)('GET /students/:id — the student record', () => {
  it('never returns the encrypted CNIC column', async () => {
    const res = await get(`/api/v1/students/${HOSTEL_A_STUDENT_ID}`);
    expect(res.statusCode, res.body).toBe(200);

    const data = res.json().data;
    // Asserted on the key, not on the value: `SELECT s.*` would return the column as null for a
    // student without a CNIC, and a value-based check would pass against exactly the bug it is
    // meant to catch.
    expect(Object.keys(data)).not.toContain('cnic_encrypted');
    // The whole payload, in case a future join re-introduces it under another name.
    expect(res.body).not.toContain('cnic_encrypted');
  });

  it('masks the CNIC only when there is one — null when none was ever collected', async () => {
    // The seeded student A is created with no CNIC.
    const none = await get(`/api/v1/students/${HOSTEL_A_STUDENT_ID}`);
    expect(none.json().data.masked_cnic, 'no CNIC on record must read as null, not as a mask').toBeNull();

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        name: 'Student With Cnic',
        phone: CNIC_PHONE,
        room_id: HOSTEL_A_ROOM_ID,
        bed_id: HOSTEL_A_BED_ID,
        monthly_fee: 5000,
        join_date: '2026-09-01',
        cnic: '35202-1948576-3',
      },
    });
    expect(created.statusCode, created.body).toBe(201);

    const withCnic = await get(`/api/v1/students/${created.json().data.student_id}`);
    expect(withCnic.json().data.masked_cnic).toBe('XXXXX-XXXXXXX-X');
  });

  /**
   * The load-bearing one. The record screen prints four stat tiles above the
   * payment table and claims they summarise it; if the SQL sums and the returned
   * rows can disagree, the operator has two different answers on one screen and
   * no way to tell which is right. Recomputing the totals from what the endpoint
   * itself returned is what makes that impossible to regress silently.
   */
  it('totals the payments it returns, and nothing else', async () => {
    const res = await get(`/api/v1/students/${HOSTEL_A_STUDENT_ID}`);
    const data = res.json().data;

    const rows: { amount_paid_pkr: string | number; unpaid_pkr: string | number; status: string }[] =
      data.payments;
    expect(Array.isArray(rows), 'the record must carry its payment rows').toBe(true);

    const paid = rows.reduce((s, r) => s + Number(r.amount_paid_pkr), 0);
    const unpaid = rows.reduce((s, r) => s + Number(r.unpaid_pkr), 0);

    expect(Number(data.total_paid_pkr)).toBeCloseTo(paid, 2);
    expect(Number(data.outstanding_pkr)).toBeCloseTo(unpaid, 2);
    expect(data.payments_total).toBe(rows.length);
    expect(data.payments_made).toBe(rows.filter((r) => r.status === 'paid').length);
    // A voided payment is money never collected. If one leaked into the rows it would inflate
    // both the count and the total the screen prints beneath it.
    expect(rows.every((r) => r.status !== 'void')).toBe(true);
  });
});
