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

  // TOTP enrolment is the one authenticated write in auth.ts, so it goes through withTenant
  // (INVARIANT-2) rather than the privileged pool. That means it is also the only auth path where
  // the RLS-bound `hostyllo_app` role has to be able to read and update a users row — if the
  // policy or the tenant context were wrong, this would silently affect 0 rows.
  describe('POST /auth/totp/setup', () => {
    // Dedicated IP: rl:login is keyed per IP and the shared budget is 10 per 15 minutes.
    const login = () => app.inject({
      method: 'POST', url: '/api/v1/auth/login', remoteAddress: '10.10.10.20',
      payload: { email: OWNER_A_EMAIL, password: TEST_PASSWORD },
    });

    afterAll(async () => {
      if (!HAS_DB) return;
      await pool.query(
        `UPDATE public.users
            SET totp_secret_enc = NULL, totp_backup_codes = NULL, totp_enabled = false
          WHERE email = $1`,
        [OWNER_A_EMAIL],
      );
    });

    it('writes the secret and the backup codes in one transaction', async () => {
      const { accessToken } = JSON.parse((await login()).body).data;
      const res = await app.inject({
        method: 'POST', url: '/api/v1/auth/totp/setup',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const { otpAuthUri, backupCodes } = JSON.parse(res.body).data;
      expect(otpAuthUri).toContain('otpauth://');
      expect(backupCodes).toHaveLength(8);

      const { rows } = await pool.query(
        'SELECT totp_secret_enc, totp_backup_codes, totp_enabled FROM public.users WHERE email = $1',
        [OWNER_A_EMAIL],
      );
      // Both columns, or neither: they used to be two separate UPDATEs, so a failure between them
      // left an account holding a TOTP secret with no way to recover it.
      expect(rows[0].totp_secret_enc, 'secret must be persisted').toBeTruthy();
      expect(rows[0].totp_secret_enc).not.toContain('otpauth'); // stored encrypted, not raw
      const codes = typeof rows[0].totp_backup_codes === 'string'
        ? JSON.parse(rows[0].totp_backup_codes)
        : rows[0].totp_backup_codes;
      expect(codes, 'backup codes must land in the same write').toHaveLength(8);
      // Enrolment is not complete until /totp/verify succeeds.
      expect(rows[0].totp_enabled).toBe(false);
    });

    it('refuses to re-enrol an account that already has TOTP enabled', async () => {
      await pool.query('UPDATE public.users SET totp_enabled = true WHERE email = $1', [OWNER_A_EMAIL]);
      const { accessToken } = JSON.parse((await login()).body).data;
      const res = await app.inject({
        method: 'POST', url: '/api/v1/auth/totp/setup',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body).code).toBe('AUTH_TOTP_ALREADY_ENABLED');
    });
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
