/**
 * Soft-delete gate (Phase 1). Proves that DELETE /students/:id is a SOFT delete and that the
 * list + detail endpoints filter `deleted_at IS NULL` — a deleted student disappears from the
 * API but the row (and its history) remains in the DB.
 *
 * Integration test: needs the seeded test DB (globalSetup) + Redis. Skips if DATABASE_URL unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { OWNER_A_EMAIL, TEST_PASSWORD, HOSTEL_A_ID } from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;
// A dedicated hostel-A student, created fresh here so the test owns its lifecycle.
const STUDENT_ID = '0a000099-0000-4000-8000-00000000a099';

let app: FastifyInstance;
let pool: Pool;
let tokenA = '';

async function login(email: string): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: TEST_PASSWORD } });
  return JSON.parse(res.body).data?.accessToken ?? '';
}
function get(url: string, token: string) {
  return app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
}
function listIds(body: string): string[] {
  return JSON.parse(body).data.students.map((s: { student_id: string }) => s.student_id);
}

beforeAll(async () => {
  if (!HAS_DB) return;
  // Privileged pool (postgres) — bypasses RLS via the current_user='postgres' escape (migration 010).
  ({ pool } = await import('../lib/db.js'));
  await pool.query('DELETE FROM public.students WHERE id = $1', [STUDENT_ID]);
  await pool.query(
    `INSERT INTO public.students (id, hostel_id, name, monthly_fee, status)
     VALUES ($1, $2, 'SoftDelete Probe', 5000, 'active')`,
    [STUDENT_ID, HOSTEL_A_ID]
  );

  const { buildApp } = await import('../app.js');
  app = await buildApp();
  await app.ready();
  tokenA = await login(OWNER_A_EMAIL);
});

afterAll(async () => {
  if (HAS_DB && pool) await pool.query('DELETE FROM public.students WHERE id = $1', [STUDENT_ID]).catch(() => {});
  if (app) await app.close();
});

describe.skipIf(!HAS_DB)('Soft delete — students', () => {
  it('detail endpoint returns the student before delete (200)', async () => {
    const res = await get(`/api/v1/students/${STUDENT_ID}`, tokenA);
    expect(res.statusCode).toBe(200);
  });

  it('list endpoint includes the student before delete', async () => {
    const res = await get('/api/v1/students', tokenA);
    expect(res.statusCode).toBe(200);
    expect(listIds(res.body)).toContain(STUDENT_ID);
  });

  it('DELETE performs a soft delete (200)', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/v1/students/${STUDENT_ID}`, headers: { authorization: `Bearer ${tokenA}` } });
    expect(res.statusCode).toBe(200);
  });

  it('detail endpoint 404s after soft delete (deleted_at filter)', async () => {
    const res = await get(`/api/v1/students/${STUDENT_ID}`, tokenA);
    expect(res.statusCode).toBe(404);
  });

  it('list endpoint excludes the soft-deleted student', async () => {
    const res = await get('/api/v1/students', tokenA);
    expect(listIds(res.body)).not.toContain(STUDENT_ID);
  });

  it('still excluded even when its own status is queried (deleted_at wins)', async () => {
    // status is now 'vacated'; the deleted_at IS NULL filter must still hide it.
    const res = await get('/api/v1/students?status=vacated', tokenA);
    expect(res.statusCode).toBe(200);
    expect(listIds(res.body)).not.toContain(STUDENT_ID);
  });

  it('row survives in the DB with deleted_at set (SOFT, not hard, delete)', async () => {
    const r = await pool.query('SELECT deleted_at, status FROM public.students WHERE id = $1', [STUDENT_ID]);
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].deleted_at).not.toBeNull();
    expect(r.rows[0].status).toBe('vacated');
  });
});
