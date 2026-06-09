-- Migration 003: payments, payment_extra_charges, expenses, owner_transfers, fines

-- =====================
-- PAYMENTS TABLE
-- =====================
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id           UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id),
  room_id             UUID REFERENCES rooms(id),
  month               DATE NOT NULL,
  rent                NUMERIC(10,2) NOT NULL DEFAULT 0,
  admission_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  concession          NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_due           NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid                NUMERIC(10,2) NOT NULL DEFAULT 0,
  unpaid              NUMERIC(10,2) NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'partial', 'pending', 'voided')),
  payment_date        DATE,
  payment_method      TEXT CHECK (payment_method IN ('cash', 'jazzcash', 'easypaisa', 'bank', 'other')),
  receipt_number      TEXT,
  idempotency_key     TEXT UNIQUE,
  void_requested_by   UUID REFERENCES users(id),
  void_reason         TEXT,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: tenant isolation"
  ON payments
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_payments_hostel_id ON payments(hostel_id);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_month ON payments(hostel_id, month);
CREATE INDEX idx_payments_status ON payments(hostel_id, status) WHERE deleted_at IS NULL;

-- =====================
-- PAYMENT EXTRA CHARGES
-- =====================
CREATE TABLE payment_extra_charges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  payment_id        UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_extra_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_extra_charges: tenant isolation"
  ON payment_extra_charges
  USING (hostel_id::text = current_setting('app.hostel_id', true));

-- =====================
-- EXPENSES TABLE
-- =====================
CREATE TABLE expenses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  category          TEXT NOT NULL CHECK (category IN ('electricity', 'water', 'gas', 'maintenance', 'salary', 'rent', 'supplies', 'other')),
  description       TEXT,
  amount            NUMERIC(10,2) NOT NULL,
  expense_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses: tenant isolation"
  ON expenses
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_expenses_hostel_id ON expenses(hostel_id);
CREATE INDEX idx_expenses_date ON expenses(hostel_id, expense_date);

-- =====================
-- OWNER TRANSFERS TABLE
-- =====================
CREATE TABLE owner_transfers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL,
  description       TEXT,
  transfer_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE owner_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_transfers: tenant isolation"
  ON owner_transfers
  USING (hostel_id::text = current_setting('app.hostel_id', true));

-- =====================
-- FINES TABLE
-- =====================
CREATE TABLE fines (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id),
  reason            TEXT NOT NULL,
  amount            NUMERIC(10,2) NOT NULL,
  is_paid           BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at           TIMESTAMPTZ,
  fine_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE fines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fines: tenant isolation"
  ON fines
  USING (hostel_id::text = current_setting('app.hostel_id', true));

-- Triggers
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER owner_transfers_updated_at
  BEFORE UPDATE ON owner_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER fines_updated_at
  BEFORE UPDATE ON fines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- RECEIPT COUNTER
-- =====================
CREATE TABLE receipt_counter (
  hostel_id         UUID PRIMARY KEY REFERENCES hostels(id) ON DELETE CASCADE,
  last_number       INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE receipt_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipt_counter: tenant isolation"
  ON receipt_counter
  USING (hostel_id::text = current_setting('app.hostel_id', true));

-- Atomic receipt number function
CREATE OR REPLACE FUNCTION get_next_receipt_number(p_hostel_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  INSERT INTO receipt_counter (hostel_id, last_number)
  VALUES (p_hostel_id, 1)
  ON CONFLICT (hostel_id)
  DO UPDATE SET
    last_number = receipt_counter.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO next_number;
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;