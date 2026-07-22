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
   'Owner B', 'owner-b@test.hostyllo.app', '$2b$12$7RlRAntjfQSoQXWgfKHALeDbKjapQRb.M/7anoAuEPJbk8ha/sfE.', 'hostel_owner')
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
