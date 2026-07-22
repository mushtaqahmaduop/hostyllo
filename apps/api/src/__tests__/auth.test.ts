/**
 * Auth integration tests (audit M5). bcrypt rounds >= 12, no user enumeration, logout revokes,
 * login rate-limit fires. Needs the seeded DB (globalSetup) + Redis. Skips if DATABASE_URL unset.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { OWNER_A_EMAIL, TEST_PASSWORD } from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;
let app: FastifyInstance;
let pool: pg.Pool;

beforeAll(async () => {
  if (!HAS_DB) return;
  // Lazy import (see isolation.test.ts) — route modules validate secrets at load.
  const [{ buildApp }, db] = await Promise.all([import('../app.js'), import('../lib/db.js')]);
  pool = db.pool;
  app = await buildApp();
  await app.ready();
});
afterAll(async () => {
  if (app) await app.close();
});

describe.skipIf(!HAS_DB)('Auth — security invariants', () => {
  it('stored password hash uses bcrypt rounds >= 12', async () => {
    const { rows } = await pool.query('SELECT password_hash FROM public.users WHERE email = $1 LIMIT 1', [OWNER_A_EMAIL]);
    expect(rows[0], 'seeded owner must exist').toBeTruthy();
    const rounds = parseInt(rows[0].password_hash.split('$')[2], 10);
    expect(rounds, `bcrypt rounds must be >= 12, got ${rounds}`).toBeGreaterThanOrEqual(12);
  });

  it('login with correct credentials returns an accessToken', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: OWNER_A_EMAIL, password: TEST_PASSWORD } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.accessToken).toBeTruthy();
  });

  it('wrong password and wrong email return the same 401 message (no enumeration)', async () => {
    const wrongPass = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: OWNER_A_EMAIL, password: 'wrongpassword' } });
    const wrongEmail = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'nobody@test.hostyllo.app', password: 'anything' } });
    expect(wrongPass.statusCode).toBe(401);
    expect(wrongEmail.statusCode).toBe(401);
    expect(JSON.parse(wrongPass.body).message).toBe(JSON.parse(wrongEmail.body).message);
  });

  it('logout revokes the access token', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: OWNER_A_EMAIL, password: TEST_PASSWORD } });
    const { accessToken } = JSON.parse(login.body).data;
    await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { authorization: `Bearer ${accessToken}` } });
    const res = await app.inject({ method: 'GET', url: '/api/v1/students', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).code).toBe('UNAUTHORIZED');
  });

  it('login rate-limit fires after 10 attempts from one IP', async () => {
    // Dedicated remoteAddress so these 11 attempts don't consume the default-IP budget the
    // other login tests (and isolation.test.ts) rely on — rl:login is keyed per IP.
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await app.inject({
        method: 'POST', url: '/api/v1/auth/login', remoteAddress: '10.10.10.10',
        payload: { email: 'ratelimit@test.hostyllo.app', password: 'wrong' },
      });
      lastStatus = res.statusCode;
    }
    expect(lastStatus).toBe(429);
  });
});
