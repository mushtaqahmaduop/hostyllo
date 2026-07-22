// Shared fixed IDs for the integration suite (audit M5). The seed (globalSetup) inserts exactly
// these rows; the tests reference the same constants. Two isolated tenants, A and B.
export const HOSTEL_A_ID = '0000000a-0000-4000-8000-00000000000a';
export const HOSTEL_B_ID = '0000000b-0000-4000-8000-00000000000b';

export const OWNER_A_EMAIL = 'owner-a@test.hostyllo.app';
export const OWNER_B_EMAIL = 'owner-b@test.hostyllo.app';
export const TEST_PASSWORD = 'Test@1234';
// bcrypt(Test@1234, 12) — the auth suite asserts rounds >= 12 on this exact hash.
export const TEST_PASSWORD_HASH = '$2b$12$7RlRAntjfQSoQXWgfKHALeDbKjapQRb.M/7anoAuEPJbk8ha/sfE.';

// Hostel B data — hostel A's token must never see any of these.
export const HOSTEL_B_STUDENT_ID = '0b000001-0000-4000-8000-00000000b001';
export const HOSTEL_B_ROOM_ID    = '0b000002-0000-4000-8000-00000000b002';
export const HOSTEL_B_PAYMENT_ID = '0b000003-0000-4000-8000-00000000b003';
