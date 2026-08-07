// Shared fixed IDs for the integration suite (audit M5). The seed (globalSetup) inserts exactly
// these rows; the tests reference the same constants. Two isolated tenants, A and B.
export const HOSTEL_A_ID = '0000000a-0000-4000-8000-00000000000a';
export const HOSTEL_B_ID = '0000000b-0000-4000-8000-00000000000b';

export const OWNER_A_EMAIL = 'owner-a@test.hostyllo.app';
// One user per role in hostel A — lets the PRD §4.2 matrix be asserted against live responses.
export const CHAIN_A_EMAIL = 'chain-a@test.hostyllo.app';
export const WARDEN_A_EMAIL = 'warden-a@test.hostyllo.app';
export const VIEWER_A_EMAIL = 'viewer-a@test.hostyllo.app';
export const OWNER_B_EMAIL = 'owner-b@test.hostyllo.app';
export const TEST_PASSWORD = 'Test@1234';
// bcrypt(Test@1234, 12) — the auth suite asserts rounds >= 12 on this exact hash.
export const TEST_PASSWORD_HASH = '$2b$12$7RlRAntjfQSoQXWgfKHALeDbKjapQRb.M/7anoAuEPJbk8ha/sfE.';

// Hostel A's own data — used to exercise real write paths as owner A.
export const HOSTEL_A_STUDENT_ID = '0a000001-0000-4000-8000-00000000a001';
export const HOSTEL_A_ROOM_ID    = '0a000002-0000-4000-8000-00000000a002';
export const HOSTEL_A_BED_ID     = '0a000003-0000-4000-8000-00000000a003';

// Hostel B data — hostel A's token must never see any of these.
export const HOSTEL_B_STUDENT_ID = '0b000001-0000-4000-8000-00000000b001';
export const HOSTEL_B_ROOM_ID    = '0b000002-0000-4000-8000-00000000b002';
export const HOSTEL_B_PAYMENT_ID = '0b000003-0000-4000-8000-00000000b003';

// ---------------------------------------------------------------------------
// Logging in from a test.
//
// `auth.ts` rate-limits login to 10 attempts per 15 minutes per IP (`rl:login:{ip}`), and the
// suite runs serially against one app instance, so every suite that logs in from the DEFAULT
// address draws on the SAME budget. Cross the line and the extra logins come back without a
// token — after which every request in that file fails 401 and the file looks broken in a way
// that has nothing to do with what it tests. That is exactly how adding three new suites broke
// `soft-delete.test.ts`, which had not changed.
//
// The rule: a suite that logs in gets its own address. `loginAs` takes one so it cannot be
// forgotten, and the constants below keep them from colliding. A new suite adds a new constant.
export const LOGIN_IP = {
  auth:         '10.10.10.20',
  authRateLimit:'10.10.10.10', // the 11-attempt burst that proves the limiter fires
  roles:        '10.10.10.30',
  softDelete:   '10.10.20.2',
  students:     '10.10.20.3',
  defaulters:   '10.10.20.4',
  numericTypes: '10.10.20.5',
  paymentNotes: '10.10.20.6',
  isolation:    '10.10.20.7',
  payments:     '10.10.20.8',
  paymentsLedger: '10.10.20.9',
} as const;

/**
 * Log in and return the access token. Throws rather than returning '' on failure: a missing token
 * otherwise surfaces as a wall of 401s much later, pointing at the endpoints instead of at the
 * login that actually failed.
 */
export async function loginAs(
  app: { inject: (o: Record<string, unknown>) => Promise<{ statusCode: number; body: string }> },
  email: string,
  remoteAddress: string,
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    remoteAddress,
    payload: { email, password: TEST_PASSWORD },
  });
  if (res.statusCode !== 200) {
    throw new Error(`login failed for ${email} from ${remoteAddress}: ${res.statusCode} ${res.body}`);
  }
  const token = JSON.parse(res.body).data?.accessToken;
  if (!token) throw new Error(`login for ${email} returned no accessToken: ${res.body}`);
  return token;
}
