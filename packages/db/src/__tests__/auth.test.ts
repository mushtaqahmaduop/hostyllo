/**
 * Auth integration tests.
 * Phase 1 exit gate: bcrypt rounds ≥ 12 and RS256 pin must pass.
 *
 * Run: pnpm --filter @hostyllo/api exec vitest run src/__tests__/auth.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { pool } from '../lib/db.js';
import { buildApp } from '../app.js';

const TEST_EMAIL    = process.env.TEST_OWNER_EMAIL    ?? 'zeerak@hostyllo.app';
const TEST_PASSWORD = process.env.TEST_OWNER_PASSWORD ?? 'Test@1234';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('Auth — security invariants', () => {

  it('bcrypt rounds on stored password hash are >= 12', async () => {
    const { rows } = await pool.query(
      'SELECT password_hash FROM public.users WHERE email = $1 LIMIT 1',
      [TEST_EMAIL]
    );
    expect(rows[0], 'Test user must exist in DB').toBeTruthy();
    const rounds = parseInt(rows[0].password_hash.split('$')[2]);
    expect(rounds, `bcrypt rounds must be >= 12, got ${rounds}`).toBeGreaterThanOrEqual(12);
  });

  it('Login with correct credentials returns accessToken', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.accessToken).toBeTruthy();
  });

  it('Login with wrong password returns 401 — same message as wrong email (no enumeration)', async () => {
    const wrongPass = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL, password: 'wrongpassword' },
    });
    const wrongEmail = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nonexistent@hostyllo.app', password: 'anything' },
    });

    expect(wrongPass.statusCode).toBe(401);
    expect(wrongEmail.statusCode).toBe(401);

    const a = JSON.parse(wrongPass.body);
    const b = JSON.parse(wrongEmail.body);
    // Must return identical message — prevents user enumeration
    expect(a.message).toBe(b.message);
  });

  it('Logout invalidates the access token', async () => {
    // Login to get token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const { accessToken } = JSON.parse(loginRes.body).data;

    // Logout
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Token must now be rejected
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/students',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).code).toBe('UNAUTHORIZED');
  });

  it('Rate limiting fires after 10 bad login attempts', async () => {
    const badCreds = { email: 'ratelimit-test@hostyllo.app', password: 'wrong' };
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: badCreds,
      });
      lastStatus = res.statusCode;
    }
    // 11th attempt must be rate-limited
    expect(lastStatus).toBe(429);
  });

});
