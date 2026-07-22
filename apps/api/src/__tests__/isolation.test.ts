/**
 * Cross-tenant isolation tests (audit M5 — the Phase-1 isolation gate).
 * Rule: cross-tenant access must return 404 (not 403 — 403 leaks existence, not 200 — leak).
 *
 * Integration test: needs the seeded test DB (globalSetup) + Redis. Skips if DATABASE_URL unset.
 * Run: pnpm --filter @hostyllo/api test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  OWNER_A_EMAIL, OWNER_B_EMAIL, TEST_PASSWORD,
  HOSTEL_A_ID, HOSTEL_B_STUDENT_ID, HOSTEL_B_ROOM_ID, HOSTEL_B_PAYMENT_ID,
} from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;

let app: FastifyInstance;
let tokenA = '';

async function login(email: string): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: TEST_PASSWORD } });
  return JSON.parse(res.body).data?.accessToken ?? '';
}
function get(url: string, token: string) {
  return app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
}

beforeAll(async () => {
  if (!HAS_DB) return;
  // Lazy import: the route modules validate secrets at load, so only import when we actually
  // have a DB/env to run against (keeps a no-DB `pnpm test` a clean skip, not an import crash).
  const { buildApp } = await import('../app.js');
  app = await buildApp();
  await app.ready();
  tokenA = await login(OWNER_A_EMAIL);
  await login(OWNER_B_EMAIL); // exercises the second tenant's login path
});

afterAll(async () => {
  if (app) await app.close();
});

describe.skipIf(!HAS_DB)('Cross-tenant isolation', () => {
  it('GET /students/:id — A cannot read B student (404)', async () => {
    const res = await get(`/api/v1/students/${HOSTEL_B_STUDENT_ID}`, tokenA);
    expect(res.statusCode, 'Must be 404 — not 403, not 200').toBe(404);
  });

  it('GET /rooms/:id — A cannot read B room (404)', async () => {
    const res = await get(`/api/v1/rooms/${HOSTEL_B_ROOM_ID}`, tokenA);
    expect(res.statusCode).toBe(404);
  });

  it('GET /payments/:id — A cannot read B payment (404)', async () => {
    const res = await get(`/api/v1/payments/${HOSTEL_B_PAYMENT_ID}`, tokenA);
    expect(res.statusCode).toBe(404);
  });

  it('GET /students — A sees only its own students', async () => {
    const res = await get('/api/v1/students', tokenA);
    expect(res.statusCode).toBe(200);
    const ids: string[] = JSON.parse(res.body).data.students.map((s: { studentId: string }) => s.studentId);
    expect(ids).not.toContain(HOSTEL_B_STUDENT_ID);
  });

  it('GET /rooms — A sees only its own rooms', async () => {
    const res = await get('/api/v1/rooms', tokenA);
    expect(res.statusCode).toBe(200);
    const ids: string[] = JSON.parse(res.body).data.rooms.map((r: { roomId: string }) => r.roomId);
    expect(ids).not.toContain(HOSTEL_B_ROOM_ID);
  });

  it('GET /payments — A sees only its own payments', async () => {
    const res = await get('/api/v1/payments', tokenA);
    expect(res.statusCode).toBe(200);
    const ids: string[] = JSON.parse(res.body).data.payments.map((p: { paymentId: string }) => p.paymentId);
    expect(ids).not.toContain(HOSTEL_B_PAYMENT_ID);
  });

  it('GET /dashboard/stats — does not 500', async () => {
    const res = await get('/api/v1/dashboard/stats', tokenA);
    expect(res.statusCode).toBe(200);
  });
});

describe.skipIf(!HAS_DB)('Auth security', () => {
  it('HS256 token is rejected (algorithm-confusion)', async () => {
    const fake =
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' +
      Buffer.from(JSON.stringify({ sub: 'attacker', hostelId: HOSTEL_A_ID, role: 'hostel_owner' })).toString('base64url') +
      '.fakesig';
    const res = await get('/api/v1/students', fake);
    expect(res.statusCode).toBe(401);
  });

  it('Missing Bearer token returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/students' });
    expect(res.statusCode).toBe(401);
  });

  it('Health endpoint is public (never 401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).not.toBe(401);
  });
});
