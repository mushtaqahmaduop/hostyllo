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
  OWNER_A_EMAIL, TEST_PASSWORD,
  HOSTEL_A_STUDENT_ID, HOSTEL_A_ROOM_ID, HOSTEL_A_BED_ID,
} from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;
const ZERO_FEE_PHONE = '+920000000999';

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
  await pool.query('DELETE FROM public.students WHERE phone = $1', [ZERO_FEE_PHONE]);

  app = await buildApp();
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: OWNER_A_EMAIL, password: TEST_PASSWORD },
  });
  tokenA = JSON.parse(res.body).data?.accessToken ?? '';
});

afterAll(async () => {
  if (HAS_DB && pool) {
    await pool.query('DELETE FROM public.students WHERE phone = $1', [ZERO_FEE_PHONE]).catch(() => {});
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
});
