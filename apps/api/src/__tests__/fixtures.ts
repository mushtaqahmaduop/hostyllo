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
