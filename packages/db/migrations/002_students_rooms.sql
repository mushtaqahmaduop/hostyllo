-- Migration 002: students, rooms, beds, room_shifts

-- =====================
-- ROOMS TABLE
-- =====================
CREATE TABLE rooms (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  number            TEXT NOT NULL,
  floor             TEXT,
  type              TEXT NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'ac', 'deluxe', 'dormitory')),
  capacity          INTEGER NOT NULL DEFAULT 1,
  monthly_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  color             TEXT DEFAULT '#6366f1',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE(hostel_id, number)
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms: tenant isolation"
  ON rooms
  USING (hostel_id::text = current_setting('app.hostel_id', true));

-- =====================
-- BEDS TABLE
-- =====================
CREATE TABLE beds (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id           UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, label)
);

ALTER TABLE beds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "beds: tenant isolation"
  ON beds
  USING (hostel_id::text = current_setting('app.hostel_id', true));

-- =====================
-- STUDENTS TABLE
-- =====================
CREATE TABLE students (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id           UUID REFERENCES rooms(id),
  bed_id            UUID REFERENCES beds(id),
  name              TEXT NOT NULL,
  father_name       TEXT,
  cnic_encrypted    TEXT,
  phone             TEXT,
  emergency_contact TEXT,
  email             TEXT,
  photo_url         TEXT,
  address           TEXT,
  monthly_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  admission_fee     NUMERIC(10,2) NOT NULL DEFAULT 0,
  join_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  vacate_date       DATE,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'vacating', 'vacated')),
  search_vector     TSVECTOR,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students: tenant isolation"
  ON students
  USING (hostel_id::text = current_setting('app.hostel_id', true));

-- GIN index for fast search
CREATE INDEX idx_students_search ON students USING GIN(search_vector);
CREATE INDEX idx_students_hostel_id ON students(hostel_id);
CREATE INDEX idx_students_room_id ON students(room_id);
CREATE INDEX idx_students_status ON students(hostel_id, status) WHERE deleted_at IS NULL;

-- Auto-update search_vector
CREATE OR REPLACE FUNCTION students_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.father_name, '') || ' ' ||
    COALESCE(NEW.phone, '') || ' ' ||
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_search_vector_trigger
  BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION students_search_vector_update();

-- =====================
-- ROOM SHIFTS TABLE
-- =====================
CREATE TABLE room_shifts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id),
  from_room_id      UUID REFERENCES rooms(id),
  to_room_id        UUID NOT NULL REFERENCES rooms(id),
  from_bed_id       UUID REFERENCES beds(id),
  to_bed_id         UUID REFERENCES beds(id),
  shift_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  reason            TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE room_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_shifts: tenant isolation"
  ON room_shifts
  USING (hostel_id::text = current_setting('app.hostel_id', true));

-- Triggers for updated_at
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER beds_updated_at
  BEFORE UPDATE ON beds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();