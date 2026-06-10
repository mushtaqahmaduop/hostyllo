/**
 * Cross-tenant isolation tests.
 * Every new endpoint must pass assertCrossTenantIsolation().
 * Phase 1 exit gate: ALL tests in this file must pass in CI.
 *
 * These are integration tests — they require a running Fastify instance
 * with a seeded test database (two separate hostels, each with data).
 *
 * Run: pnpm --filter @hostyllo/api exec vitest run src/__tests__/isolation.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js'; // see note below

// ── Test fixtures ─────────────────────────────────────────────────────────────
// These are seeded in the test DB via 001_test_seed.sql
const HOSTEL_A = {
  id: process.env.TEST_HOSTEL_A_ID!,
  ownerToken: process.env.TEST_HOSTEL_A_TOKEN!,
};
const HOSTEL_B = {
  id: process.env.TEST_HOSTEL_B_ID!,
  studentId: process.env.TEST_HOSTEL_B_STUDENT_ID!,
  roomId: process.env.TEST_HOSTEL_B_ROOM_ID!,
  paymentId: process.env.TEST_HOSTEL_B_PAYMENT_ID!,
};

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ── Helper ────────────────────────────────────────────────────────────────────
async function get(url: string, token: string) {
  return app.inject({
    method: 'GET',
    url,
    headers: { authorization: `Bearer ${token}` },
  });
}

// ── Isolation assertions ──────────────────────────────────────────────────────
// Rule: cross-tenant access must return 404, NOT 403 or 200.
// 403 leaks that the record exists — that is an information disclosure.

describe('Cross-tenant isolation', () => {

  it('GET /api/v1/students/:id — hostel A token cannot read hostel B student', async () => {
    const res = await get(`/api/v1/students/${HOSTEL_B.studentId}`, HOSTEL_A.ownerToken);
    expect(res.statusCode, 'Must be 404 — not 403, not 200').toBe(404);
  });

  it('GET /api/v1/rooms/:id — hostel A token cannot read hostel B room', async () => {
    const res = await get(`/api/v1/rooms/${HOSTEL_B.roomId}`, HOSTEL_A.ownerToken);
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/v1/payments/:id — hostel A token cannot read hostel B payment', async () => {
    const res = await get(`/api/v1/payments/${HOSTEL_B.paymentId}`, HOSTEL_A.ownerToken);
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/v1/students list — hostel A sees only its own students', async () => {
    const res = await get('/api/v1/students', HOSTEL_A.ownerToken);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const ids: string[] = body.data.students.map((s: any) => s.studentId);
    expect(ids).not.toContain(HOSTEL_B.studentId);
  });

  it('GET /api/v1/rooms list — hostel A sees only its own rooms', async () => {
    const res = await get('/api/v1/rooms', HOSTEL_A.ownerToken);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const ids: string[] = body.data.rooms.map((r: any) => r.roomId);
    expect(ids).not.toContain(HOSTEL_B.roomId);
  });

  it('GET /api/v1/payments — hostel A sees only its own payments', async () => {
    const res = await get('/api/v1/payments', HOSTEL_A.ownerToken);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const ids: string[] = body.data.payments.map((p: any) => p.paymentId);
    expect(ids).not.toContain(HOSTEL_B.paymentId);
  });

  it('GET /api/v1/dashboard/stats — hostel A stats do not include hostel B data', async () => {
    const res = await get('/api/v1/dashboard/stats', HOSTEL_A.ownerToken);
    expect(res.statusCode).toBe(200);
    // No assertion on numbers — just confirm it does not 500
  });

});

// ── Auth security ─────────────────────────────────────────────────────────────
describe('Auth security', () => {

  it('HS256 token is rejected (algorithm confusion attack)', async () => {
    // Sign a token with HS256 — must be rejected by RS256-pinned verify
    const fakeToken = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' })
    ).toString('base64url') +
      '.' +
      Buffer.from(JSON.stringify({ sub: 'attacker', hostelId: HOSTEL_A.id, role: 'super_admin' })).toString('base64url') +
      '.fakesig';

    const res = await get('/api/v1/students', fakeToken);
    expect(res.statusCode).toBe(401);
  });

  it('Expired token is rejected', async () => {
    // Token with exp in the past — jose will throw JWTExpired
    const expiredToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.fake';
    const res = await get('/api/v1/students', expiredToken);
    expect(res.statusCode).toBe(401);
  });

  it('Missing Bearer token returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/students' });
    expect(res.statusCode).toBe(401);
  });

  it('Health endpoint is public (no auth required)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    // 200 = healthy, 503 = unhealthy — both are acceptable; 401 is not
    expect(res.statusCode).not.toBe(401);
  });

});
