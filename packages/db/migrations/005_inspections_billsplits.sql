-- Migration 005: room_inspections, bill_splits

-- =====================
-- ROOM INSPECTIONS
-- =====================
CREATE TABLE room_inspections (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id           UUID NOT NULL REFERENCES rooms(id),
  rating            INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes             TEXT,
  inspected_by      UUID REFERENCES users(id),
  inspected_at      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE room_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_inspections: tenant isolation"
  ON room_inspections
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_room_inspections_hostel_id ON room_inspections(hostel_id);
CREATE INDEX idx_room_inspections_room_id ON room_inspections(room_id);

-- =====================
-- BILL SPLITS TABLE
-- =====================
CREATE TABLE bill_splits (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  total_amount      NUMERIC(10,2) NOT NULL,
  split_count       INTEGER NOT NULL,
  amount_per_head   NUMERIC(10,2) NOT NULL,
  bill_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE bill_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_splits: tenant isolation"
  ON bill_splits
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_bill_splits_hostel_id ON bill_splits(hostel_id);

-- Triggers
CREATE TRIGGER room_inspections_updated_at
  BEFORE UPDATE ON room_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bill_splits_updated_at
  BEFORE UPDATE ON bill_splits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();