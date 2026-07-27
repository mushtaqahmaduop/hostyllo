/**
 * Role matrix gate — asserts the live API matches PRD v15.0 §4.2.
 *
 * The matrix used to live as an inline array in each of 64 route handlers, which is why it drifted
 * without anyone noticing: `chain_manager` could reveal a student's CNIC and bulk-import students
 * but not read one, and `viewer` — permitted by the users.role CHECK constraint — appeared in zero
 * guards, so such an account logged in successfully and then received 403 from the entire product.
 *
 * These cases assert responses, not source code, so a future edit to `lib/roles.ts` that widens a
 * boundary fails here rather than in production.
 *
 * Integration test: needs the seeded DB (globalSetup) + Redis. Skips if DATABASE_URL unset.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  OWNER_A_EMAIL, CHAIN_A_EMAIL, WARDEN_A_EMAIL, VIEWER_A_EMAIL,
  TEST_PASSWORD, HOSTEL_A_STUDENT_ID, HOSTEL_A_ROOM_ID, HOSTEL_A_BED_ID,
} from './fixtures.js';

const HAS_DB = !!process.env.DATABASE_URL;
let app: FastifyInstance;
const token: Record<string, string> = {};

// rl:login is keyed per IP and allows 10 per 15 minutes; four logins from the shared default
// address would eat the budget the auth suite depends on.
const LOGIN_IP = '10.10.10.30';

beforeAll(async () => {
  if (!HAS_DB) return;
  const { buildApp } = await import('../app.js');
  app = await buildApp();
  await app.ready();

  for (const [role, email] of [
    ['owner', OWNER_A_EMAIL], ['chain', CHAIN_A_EMAIL],
    ['warden', WARDEN_A_EMAIL], ['viewer', VIEWER_A_EMAIL],
  ] as const) {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/auth/login', remoteAddress: LOGIN_IP,
      payload: { email, password: TEST_PASSWORD },
    });
    expect(res.statusCode, `${role} must be able to log in`).toBe(200);
    token[role] = JSON.parse(res.body).data.accessToken;
  }
});

afterAll(async () => {
  if (app) await app.close();
});

/**
 * A 403 means the guard rejected the role; anything else means it let the role through (a 404 or
 * a 409 from the handler still proves the guard passed).
 *
 * Fastify validates the body BEFORE preHandler runs, so a request that fails schema validation
 * returns 400 without the role guard ever executing. Denial cases must therefore send a
 * schema-valid payload — otherwise the test passes for the wrong reason and would keep passing if
 * the guard were removed entirely.
 */
async function status(role: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: Record<string, unknown>) {
  const res = await app.inject({
    method,
    url,
    headers: {
      authorization: `Bearer ${token[role]}`,
      // POST /payments declares x-idempotency-key as a required header, and headers are validated
      // in the same pass as the body — omitting it would 400 before the guard, same trap as above.
      'x-idempotency-key': `role-probe-${role}-${method}-${url}`,
    },
    payload: payload ?? undefined,
  });
  return res.statusCode;
}

async function allowed(role: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: Record<string, unknown>) {
  const code = await status(role, method, url, payload);
  // A 400 means validation rejected the request before the guard was consulted, so this helper
  // cannot tell whether the role would have been allowed. Fail loudly rather than assert nothing.
  expect(code, `${method} ${url} as ${role} returned 400 — the body never reached the role guard, so this assertion proves nothing`).not.toBe(400);
  return code !== 403;
}

/** Schema-valid bodies, so denial is decided by the role guard rather than by validation. */
const VALID_BODY: Record<string, Record<string, unknown>> = {
  '/api/v1/students': {
    name: 'Role Probe', phone: '03001234567', room_id: HOSTEL_A_ROOM_ID,
    bed_id: HOSTEL_A_BED_ID, monthly_fee: 8000, join_date: '2026-07-01',
  },
  '/api/v1/payments': { studentId: HOSTEL_A_STUDENT_ID, month: '2026-07', rent: 8000, paid: 0 },
  '/api/v1/rooms': { number: 'ROLE-PROBE-1', capacity: 1, monthly_fee: 8000 },
  '/api/v1/complaints': { title: 'Role probe' },
};

describe.skipIf(!HAS_DB)('Role matrix — PRD §4.2', () => {
  describe('viewer is read-only, not locked out', () => {
    // The bug this pins: before 2026-07-27 every one of these was 403.
    it.each([
      ['/api/v1/students'],
      ['/api/v1/rooms'],
      ['/api/v1/payments'],
      ['/api/v1/expenses'],
      ['/api/v1/dashboard/stats'],
      ['/api/v1/complaints'],
      ['/api/v1/notices'],
    ])('can read %s', async (url) => {
      expect(await allowed('viewer', 'GET', url)).toBe(true);
    });

    it.each([
      ['POST', '/api/v1/students'],
      ['POST', '/api/v1/payments'],
      ['POST', '/api/v1/rooms'],
      ['POST', '/api/v1/complaints'],
    ] as const)('cannot write %s %s', async (method, url) => {
      expect(await allowed('viewer', method, url, VALID_BODY[url])).toBe(false);
    });

    it('cannot read the audit log (a security log is not a report)', async () => {
      expect(await allowed('viewer', 'GET', '/api/v1/audit-log')).toBe(false);
    });

    it('cannot reveal a stored CNIC', async () => {
      expect(await allowed('viewer', 'GET', `/api/v1/students/${HOSTEL_A_STUDENT_ID}/reveal-cnic`)).toBe(false);
    });
  });

  describe('chain_manager matches the matrix', () => {
    // Previously denied — the inconsistency the audit flagged: it could reveal a CNIC and bulk
    // import students, but could not list or read one.
    it.each([
      ['GET', '/api/v1/students'],
      ['GET', `/api/v1/students/${HOSTEL_A_STUDENT_ID}`],
      ['POST', '/api/v1/students'],
      ['PATCH', `/api/v1/students/${HOSTEL_A_STUDENT_ID}`],
    ] as const)('can %s %s (PRD: add/edit student ✓)', async (method, url) => {
      const body = method === 'GET' ? undefined
        : method === 'POST' ? VALID_BODY['/api/v1/students']
        : { name: 'Role Probe Renamed' }; // PATCH has no required fields
      expect(await allowed('chain', method, url, body)).toBe(true);
    });

    it('cannot delete a student (PRD: —)', async () => {
      expect(await allowed('chain', 'DELETE', `/api/v1/students/${HOSTEL_A_STUDENT_ID}`)).toBe(false);
    });

    // Previously allowed — both were PRD violations.
    it('cannot edit a payment (PRD: edit payment —)', async () => {
      expect(await allowed('chain', 'PATCH', '/api/v1/payments/00000000-0000-4000-8000-000000000000', {})).toBe(false);
    });

    it('cannot reach settings (PRD: settings access —)', async () => {
      expect(await allowed('chain', 'GET', '/api/v1/settings/hostel-info')).toBe(false);
      expect(await allowed('chain', 'PATCH', '/api/v1/settings/hostel-info', {})).toBe(false);
    });

    it('cannot generate monthly billing (PRD: manage billing —)', async () => {
      expect(await allowed('chain', 'POST', '/api/v1/payments/generate-monthly', {})).toBe(false);
    });
  });

  describe('warden runs one hostel', () => {
    it('can record a payment and manage rooms (PRD: ✓)', async () => {
      expect(await allowed('warden', 'POST', '/api/v1/payments', VALID_BODY['/api/v1/payments'])).toBe(true);
      expect(await allowed('warden', 'PATCH', `/api/v1/rooms/${HOSTEL_A_ROOM_ID}`, { monthly_fee: 8000 })).toBe(true);
    });

    it('cannot move money between branches or administer users', async () => {
      expect(await allowed('warden', 'GET', '/api/v1/transfers')).toBe(false);
      expect(await allowed('warden', 'GET', '/api/v1/users')).toBe(false);
    });

    it('cannot edit a payment after the fact (PRD: void-request only)', async () => {
      expect(await allowed('warden', 'PATCH', '/api/v1/payments/00000000-0000-4000-8000-000000000000', {})).toBe(false);
    });
  });

  describe('hostel_owner is not restricted by any of the above', () => {
    it.each([
      ['GET', '/api/v1/settings/hostel-info'],
      ['GET', '/api/v1/audit-log'],
      ['GET', '/api/v1/users'],
      ['GET', '/api/v1/transfers'],
    ] as const)('can %s %s', async (method, url) => {
      expect(await allowed('owner', method, url)).toBe(true);
    });
  });
});
