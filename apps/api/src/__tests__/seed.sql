-- Integration-test seed (audit M5). Two isolated tenants A and B. Idempotent (ON CONFLICT).
-- IDs must match src/__tests__/fixtures.ts. Applied by globalSetup as the privileged role.

INSERT INTO hostels (id, name) VALUES
  ('0000000a-0000-4000-8000-00000000000a', 'Test Hostel A'),
  ('0000000b-0000-4000-8000-00000000000b', 'Test Hostel B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, hostel_id, name, email, password_hash, role) VALUES
  ('0a000010-0000-4000-8000-00000000a010', '0000000a-0000-4000-8000-00000000000a',
   'Owner A', 'owner-a@test.hostyllo.app', '$2b$12$7RlRAntjfQSoQXWgfKHALeDbKjapQRb.M/7anoAuEPJbk8ha/sfE.', 'hostel_owner'),
  ('0b000010-0000-4000-8000-00000000b010', '0000000b-0000-4000-8000-00000000000b',
   'Owner B', 'owner-b@test.hostyllo.app', '$2b$12$7RlRAntjfQSoQXWgfKHALeDbKjapQRb.M/7anoAuEPJbk8ha/sfE.', 'hostel_owner'),
  -- Hostel A also has one of every other role, so the PRD §4.2 matrix can be asserted end to end
  -- rather than by reading the guards. `viewer` in particular existed only in the DB CHECK
  -- constraint until 2026-07-27 — no endpoint admitted it, so such a user 403'd everywhere.
  ('0a000011-0000-4000-8000-00000000a011', '0000000a-0000-4000-8000-00000000000a',
   'Chain A', 'chain-a@test.hostyllo.app', '$2b$12$7RlRAntjfQSoQXWgfKHALeDbKjapQRb.M/7anoAuEPJbk8ha/sfE.', 'chain_manager'),
  ('0a000012-0000-4000-8000-00000000a012', '0000000a-0000-4000-8000-00000000000a',
   'Warden A', 'warden-a@test.hostyllo.app', '$2b$12$7RlRAntjfQSoQXWgfKHALeDbKjapQRb.M/7anoAuEPJbk8ha/sfE.', 'warden'),
  ('0a000013-0000-4000-8000-00000000a013', '0000000a-0000-4000-8000-00000000000a',
   'Viewer A', 'viewer-a@test.hostyllo.app', '$2b$12$7RlRAntjfQSoQXWgfKHALeDbKjapQRb.M/7anoAuEPJbk8ha/sfE.', 'viewer')
ON CONFLICT (id) DO NOTHING;

-- Hostel A data — A's OWN room + student, so tests can exercise real write paths (payments with
-- extra charges, audit rows) as owner A. The isolation tests assert `not.toContain` on B's ids,
-- never a row count, so adding A-side rows does not disturb them.
INSERT INTO rooms (id, hostel_id, number, monthly_fee) VALUES
  ('0a000002-0000-4000-8000-00000000a002', '0000000a-0000-4000-8000-00000000000a', 'A-101', 8000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (id, hostel_id, room_id, name, monthly_fee) VALUES
  ('0a000001-0000-4000-8000-00000000a001', '0000000a-0000-4000-8000-00000000000a',
   '0a000002-0000-4000-8000-00000000a002', 'Student A', 8000)
ON CONFLICT (id) DO NOTHING;

-- A free bed in room A. students.bed_id is a FK to beds(id), so POST /students needs a real one.
INSERT INTO beds (id, hostel_id, room_id, label) VALUES
  ('0a000003-0000-4000-8000-00000000a003', '0000000a-0000-4000-8000-00000000000a',
   '0a000002-0000-4000-8000-00000000a002', 'A-101-1')
ON CONFLICT (id) DO NOTHING;

-- Hostel B data (the target hostel A must not be able to reach).
INSERT INTO rooms (id, hostel_id, number, monthly_fee) VALUES
  ('0b000002-0000-4000-8000-00000000b002', '0000000b-0000-4000-8000-00000000000b', 'B-101', 5000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (id, hostel_id, room_id, name, monthly_fee) VALUES
  ('0b000001-0000-4000-8000-00000000b001', '0000000b-0000-4000-8000-00000000000b',
   '0b000002-0000-4000-8000-00000000b002', 'Student B', 5000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, hostel_id, student_id, room_id, month, rent, total_due, unpaid, status) VALUES
  ('0b000003-0000-4000-8000-00000000b003', '0000000b-0000-4000-8000-00000000000b',
   '0b000001-0000-4000-8000-00000000b001', '0b000002-0000-4000-8000-00000000b002',
   '2026-07-01', 5000, 5000, 5000, 'pending')
ON CONFLICT (id) DO NOTHING;
