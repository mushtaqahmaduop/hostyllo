-- Migration 004: cancellations, maintenance, complaints, checkin_log, notices

-- =====================
-- CANCELLATIONS TABLE
-- =====================
CREATE TABLE cancellations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id),
  reason            TEXT,
  vacate_date       DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'restored')),
  confirmed_at      TIMESTAMPTZ,
  confirmed_by      UUID REFERENCES users(id),
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cancellations: tenant isolation"
  ON cancellations
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_cancellations_hostel_id ON cancellations(hostel_id);
CREATE INDEX idx_cancellations_status ON cancellations(hostel_id, status);

-- =====================
-- MAINTENANCE REQUESTS
-- =====================
CREATE TABLE maintenance_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id           UUID REFERENCES rooms(id),
  title             TEXT NOT NULL,
  description       TEXT,
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES users(id),
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_requests: tenant isolation"
  ON maintenance_requests
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_maintenance_hostel_id ON maintenance_requests(hostel_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(hostel_id, status);

-- =====================
-- COMPLAINTS TABLE
-- =====================
CREATE TABLE complaints (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id        UUID REFERENCES students(id),
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES users(id),
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "complaints: tenant isolation"
  ON complaints
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_complaints_hostel_id ON complaints(hostel_id);

-- =====================
-- CHECKIN LOG TABLE
-- =====================
CREATE TABLE checkin_log (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id),
  type              TEXT NOT NULL CHECK (type IN ('checkin', 'checkout')),
  note              TEXT,
  logged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE checkin_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_log: tenant isolation"
  ON checkin_log
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_checkin_hostel_id ON checkin_log(hostel_id);
CREATE INDEX idx_checkin_student_id ON checkin_log(student_id);

-- =====================
-- NOTICES TABLE
-- =====================
CREATE TABLE notices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  priority          TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notices: tenant isolation"
  ON notices
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_notices_hostel_id ON notices(hostel_id);

-- Triggers
CREATE TRIGGER cancellations_updated_at
  BEFORE UPDATE ON cancellations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER maintenance_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notices_updated_at
  BEFORE UPDATE ON notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();