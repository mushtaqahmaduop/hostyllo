# 04_DATABASE_ARCHITECTURE.md
## HOSTYLLO — Database Architecture
### v1.0 · June 2026 · Traceable to PRD v15.0 Section 17

---

## SCOPE

This document is the complete database architecture reference for HOSTYLLO. It covers all 28 tables, relationships, index strategy, query strategy, tenant isolation, RLS architecture, backup, archiving, data retention, migration strategy, performance, and failure recovery.

**Authority:** PRD v15.0 Section 17 defines table inventory and invariants. This document is the build authority for `packages/db/src/schema.sql`.

---

## 1. SYSTEM OVERVIEW

**Engine:** PostgreSQL 15 via Supabase (Mumbai, ap-south-1)
**Connection pooler:** PgBouncer in transaction mode (NOT session mode)
**Multi-tenancy:** Row Level Security (RLS) with per-request `SET LOCAL`
**Backup:** Point-in-Time Recovery (PITR) — 7-day retention, Supabase Pro required

### Critical Invariants (Never Violate)

```
INV-DB-1: Every money column is NUMERIC(10,2). FLOAT forbidden.
INV-DB-2: CNIC is always cnic_encrypted TEXT (AES-256). No plaintext cnic column.
INV-DB-3: Every tenant table has hostel_id UUID NOT NULL REFERENCES hostels(hostel_id).
INV-DB-4: Every tenant table has ENABLE ROW LEVEL SECURITY.
INV-DB-5: Every tenant table has deleted_at TIMESTAMPTZ (soft delete).
INV-DB-6: audit_log is INSERT ONLY. No UPDATE, no DELETE. Hash chain enforces this.
INV-DB-7: SET LOCAL must be inside explicit BEGIN/COMMIT transaction.
INV-DB-8: Supabase PITR must be active before any client data is written.
```

---

## 2. ENTITY RELATIONSHIP DIAGRAM (TEXT FORM)

```
hostels (1) ──────── (N) users
hostels (1) ──────── (N) students
hostels (1) ──────── (N) rooms
rooms (1) ──────────── (N) beds
rooms (1) ──────────── (N) room_shifts
students (1) ──────── (N) room_shifts
rooms (1) ──────────── (N) maintenance_requests
students (1) ──────── (N) payments
payments (1) ──────── (N) payment_extra_charges
students (1) ──────── (N) cancellations
students (1) ──────── (N) checkin_log
students (1) ──────── (N) fines
hostels (1) ──────── (N) expenses
hostels (1) ──────── (N) owner_transfers
hostels (1) ──────── (N) notices
hostels (1) ──────── (1) subscriptions
hostels (1) ──────── (1) receipt_counter
hostels (1) ──────── (N) audit_log
hostels (1) ──────── (N) complaints
hostels (1) ──────── (N) warden_shift_log
hostels (1) ──────── (N) onboarding_events
hostels (1) ──────── (N) referral_payouts
rooms (1) ──────────── (N) room_inspections
users (1) ────────── (N) warden_shift_log
beds (1) ────────────── (0..1) students  [current occupant]
```

---

## 3. COMPLETE TABLE DEFINITIONS

### 3.1 Core Tables

```sql
-- MIGRATION 001

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE hostels (
  hostel_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(200) NOT NULL,
  tagline           VARCHAR(300),
  city              VARCHAR(100),
  phone             VARCHAR(20),
  email             VARCHAR(200),
  logo_url          TEXT,
  brand_color       VARCHAR(7) DEFAULT '#c9a84c',
  accent_font       VARCHAR(50) DEFAULT 'Figtree',
  currency          VARCHAR(10) DEFAULT 'PKR',
  timezone          VARCHAR(50) DEFAULT 'Asia/Karachi',
  plan              VARCHAR(20) NOT NULL DEFAULT 'trial'
                    CHECK (plan IN ('trial','starter','pro','enterprise')),
  plan_status       VARCHAR(20) NOT NULL DEFAULT 'trialing'
                    CHECK (plan_status IN ('trialing','active','past_due','suspended','cancelled')),
  trial_ends_at     TIMESTAMPTZ,
  subscription_id   UUID,                -- FK to subscriptions
  show_branding     BOOLEAN DEFAULT true,
  whatsapp_opt_in   BOOLEAN DEFAULT false,
  auto_month_advance BOOLEAN DEFAULT true,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
-- No RLS on hostels — accessed by service_role for tenant management

CREATE TABLE users (
  user_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  email             VARCHAR(200) NOT NULL,
  password_hash     TEXT NOT NULL,        -- bcrypt, cost >= 12
  role              VARCHAR(20) NOT NULL
                    CHECK (role IN ('super_admin','hostel_owner','chain_manager','warden','viewer')),
  -- Per-warden flags (fetched from DB every request, NEVER from JWT)
  can_delete        BOOLEAN DEFAULT true,
  can_settings      BOOLEAN DEFAULT false,
  can_edit          BOOLEAN DEFAULT true,
  -- MFA
  totp_enabled      BOOLEAN DEFAULT false,
  totp_secret_enc   TEXT,                 -- AES-256 encrypted TOTP secret
  -- Profile
  display_name      VARCHAR(200),
  theme             VARCHAR(10) DEFAULT 'dark' CHECK (theme IN ('dark','light','system')),
  language          VARCHAR(5) DEFAULT 'en' CHECK (language IN ('en','ur')),
  -- Session management
  last_login_at     TIMESTAMPTZ,
  last_login_ip     INET,
  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE(email)     -- global uniqueness
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON users
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_users_hostel ON users(hostel_id) WHERE deleted_at IS NULL;
```

### 3.2 Student and Room Tables

```sql
-- MIGRATION 002

CREATE TABLE students (
  student_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  -- Identity
  full_name         VARCHAR(200) NOT NULL,
  father_name       VARCHAR(200),
  cnic_encrypted    TEXT,                 -- AES-256-GCM. Never plaintext.
  phone             VARCHAR(20),          -- formatted: 03XX-XXXXXXX
  emergency_contact VARCHAR(20),
  email             VARCHAR(200),
  occupation        VARCHAR(100),
  city              VARCHAR(100),
  address           TEXT,
  -- Room assignment
  room_id           UUID REFERENCES rooms(room_id) ON DELETE SET NULL,
  bed_id            UUID REFERENCES beds(bed_id) ON DELETE SET NULL,
  rent_pkr          NUMERIC(10,2) NOT NULL DEFAULT 0,
  admission_fee_pkr NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Deposit tracking
  deposit_pkr       NUMERIC(10,2) DEFAULT 0,
  deposit_status    VARCHAR(20) DEFAULT 'pending'
                    CHECK (deposit_status IN ('pending','paid','refunded')),
  deposit_paid_at   TIMESTAMPTZ,
  deposit_notes     TEXT,
  -- Status
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','on_leave','vacated')),
  join_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  vacate_date       DATE,
  -- Photo
  photo_url         TEXT,
  -- Search
  search_vector     TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(full_name,'') || ' ' ||
      coalesce(father_name,'') || ' ' ||
      coalesce(city,'') || ' ' ||
      coalesce(phone,'')
    )
  ) STORED,
  -- Risk scoring (Phase 3 — computed rule-based)
  payment_risk_score VARCHAR(10) DEFAULT 'low'
                    CHECK (payment_risk_score IN ('low','medium','high')),
  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON students
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_students_hostel ON students(hostel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_search ON students USING GIN(search_vector);
CREATE INDEX idx_students_cnic_hostel ON students(cnic_encrypted, hostel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_room ON students(room_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_status ON students(hostel_id, status) WHERE deleted_at IS NULL;

CREATE TABLE rooms (
  room_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  number            VARCHAR(20) NOT NULL,
  floor             VARCHAR(20),
  room_type         VARCHAR(50),
  color_hex         VARCHAR(7) DEFAULT '#6366f1',
  capacity          INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  default_rent_pkr  NUMERIC(10,2) NOT NULL DEFAULT 0,
  amenities         TEXT[],               -- Array of amenity strings
  notes             TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','maintenance','closed')),
  maintenance_until DATE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON rooms
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_rooms_hostel ON rooms(hostel_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_rooms_number_hostel ON rooms(hostel_id, number) WHERE deleted_at IS NULL;

CREATE TABLE beds (
  bed_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  room_id           UUID NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
  label             VARCHAR(20) NOT NULL, -- e.g., 'A', 'B', '1', '2'
  status            VARCHAR(20) NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','occupied','maintenance')),
  current_student_id UUID REFERENCES students(student_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON beds
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_beds_room ON beds(room_id);
CREATE INDEX idx_beds_hostel ON beds(hostel_id);

CREATE TABLE room_shifts (
  shift_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  student_id        UUID NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
  from_room_id      UUID REFERENCES rooms(room_id) ON DELETE SET NULL,
  from_bed_id       UUID REFERENCES beds(bed_id) ON DELETE SET NULL,
  to_room_id        UUID REFERENCES rooms(room_id) ON DELETE SET NULL,
  to_bed_id         UUID REFERENCES beds(bed_id) ON DELETE SET NULL,
  shift_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  old_rent_pkr      NUMERIC(10,2),
  new_rent_pkr      NUMERIC(10,2),
  notes             TEXT,
  initiated_by      UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE room_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON room_shifts
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_room_shifts_student ON room_shifts(student_id);
CREATE INDEX idx_room_shifts_hostel ON room_shifts(hostel_id);
```

### 3.3 Finance Tables

```sql
-- MIGRATION 003

CREATE TABLE payments (
  payment_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  student_id        UUID NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
  -- Month this payment covers
  payment_month     DATE NOT NULL, -- store as first day of month: 2026-05-01
  -- Fee breakdown (all NUMERIC — never FLOAT)
  rent_pkr          NUMERIC(10,2) NOT NULL DEFAULT 0,
  admission_fee_pkr NUMERIC(10,2) NOT NULL DEFAULT 0,
  concession_pkr    NUMERIC(10,2) NOT NULL DEFAULT 0,
  concession_note   TEXT,
  total_due_pkr     NUMERIC(10,2) NOT NULL DEFAULT 0, -- computed by calculateUnpaid()
  amount_paid_pkr   NUMERIC(10,2) NOT NULL DEFAULT 0,
  unpaid_pkr        NUMERIC(10,2) NOT NULL DEFAULT 0, -- Math.max(0, totalDue - paid)
  -- Status
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('paid','partial','pending','void')),
  -- Payment details
  payment_method    VARCHAR(50), -- 'Cash', 'JazzCash', 'Easypaisa', 'Bank Transfer'
  payment_date      DATE,
  due_date          DATE,
  notes             TEXT,
  -- Receipt
  receipt_id        VARCHAR(20),   -- e.g., 'RCP-000042' from get_next_receipt_number()
  receipt_url       TEXT,          -- Supabase Storage signed URL
  receipt_generated_at TIMESTAMPTZ,
  -- Idempotency
  idempotency_key   VARCHAR(100) UNIQUE, -- X-Idempotency-Key header value
  -- Void workflow
  void_requested_by UUID REFERENCES users(user_id),
  void_requested_at TIMESTAMPTZ,
  void_confirmed_by UUID REFERENCES users(user_id),
  void_confirmed_at TIMESTAMPTZ,
  -- Soft delete
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON payments
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE UNIQUE INDEX idx_payments_student_month ON payments(student_id, payment_month)
  WHERE deleted_at IS NULL AND status != 'void';
CREATE INDEX idx_payments_hostel_month ON payments(hostel_id, payment_month) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_status ON payments(hostel_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_student ON payments(student_id) WHERE deleted_at IS NULL;

CREATE TABLE payment_extra_charges (
  charge_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  payment_id        UUID NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
  label             VARCHAR(100) NOT NULL, -- e.g., 'Electricity', 'Internet'
  amount_pkr        NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE payment_extra_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON payment_extra_charges
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_extra_charges_payment ON payment_extra_charges(payment_id);

CREATE TABLE expenses (
  expense_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  category          VARCHAR(100) NOT NULL,
  description       TEXT,
  amount_pkr        NUMERIC(10,2) NOT NULL,
  expense_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON expenses
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_expenses_hostel_date ON expenses(hostel_id, expense_date) WHERE deleted_at IS NULL;

CREATE TABLE owner_transfers (
  transfer_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  description       TEXT,
  amount_pkr        NUMERIC(10,2) NOT NULL,
  payment_method    VARCHAR(50),
  received_by       VARCHAR(200),
  transfer_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
ALTER TABLE owner_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON owner_transfers
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_transfers_hostel_date ON owner_transfers(hostel_id, transfer_date) WHERE deleted_at IS NULL;

CREATE TABLE fines (
  fine_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  student_id        UUID NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
  reason            TEXT NOT NULL,
  amount_pkr        NUMERIC(10,2) NOT NULL,
  fine_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  paid              BOOLEAN DEFAULT false,
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  created_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON fines
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_fines_student ON fines(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fines_hostel ON fines(hostel_id) WHERE deleted_at IS NULL;
```

### 3.4 Operations Tables

```sql
-- MIGRATION 004

CREATE TABLE cancellations (
  cancellation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  student_id        UUID NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
  reason            TEXT,
  vacate_date       DATE NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','restored')),
  notes             TEXT,
  confirmed_by      UUID REFERENCES users(user_id) ON DELETE SET NULL,
  confirmed_at      TIMESTAMPTZ,
  restored_by       UUID REFERENCES users(user_id) ON DELETE SET NULL,
  restored_at       TIMESTAMPTZ,
  created_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
ALTER TABLE cancellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON cancellations
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_cancellations_hostel ON cancellations(hostel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cancellations_vacate ON cancellations(vacate_date) WHERE status='pending';

CREATE TABLE maintenance_requests (
  request_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  room_id           UUID REFERENCES rooms(room_id) ON DELETE SET NULL,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  priority          VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','urgent')),
  category          VARCHAR(100), -- 'Plumbing', 'Electrical', etc.
  status            VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','resolved')),
  resolved_at       TIMESTAMPTZ,
  resolution_notes  TEXT,
  reported_by       UUID REFERENCES users(user_id) ON DELETE SET NULL,
  assigned_to       VARCHAR(200),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON maintenance_requests
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_maintenance_hostel ON maintenance_requests(hostel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_status ON maintenance_requests(hostel_id, status) WHERE deleted_at IS NULL;

CREATE TABLE complaints (
  complaint_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  student_id        UUID REFERENCES students(student_id) ON DELETE SET NULL,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  priority          VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','urgent')),
  status            VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','resolved')),
  response_text     TEXT,
  resolved_at       TIMESTAMPTZ,
  created_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON complaints
  USING (hostel_id = current_setting('app.hostel_id')::uuid);

CREATE TABLE checkin_log (
  log_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  student_id        UUID NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
  log_type          VARCHAR(20) NOT NULL
                    CHECK (log_type IN ('check_in','check_out','leave','return')),
  log_datetime      TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes             TEXT,
  logged_by         UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE checkin_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON checkin_log
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_checkin_student ON checkin_log(student_id);
CREATE INDEX idx_checkin_hostel ON checkin_log(hostel_id, log_datetime DESC);

CREATE TABLE notices (
  notice_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID REFERENCES hostels(hostel_id) ON DELETE CASCADE,
  -- hostel_id NULL = Super Admin global broadcast
  title             VARCHAR(200) NOT NULL,
  content           TEXT NOT NULL,
  notice_type       VARCHAR(20) DEFAULT 'info'
                    CHECK (notice_type IN ('info','warning','urgent','announcement')),
  expires_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON notices
  USING (hostel_id = current_setting('app.hostel_id')::uuid OR hostel_id IS NULL);
CREATE INDEX idx_notices_hostel ON notices(hostel_id, expires_at);
```

### 3.5 Phase 2 Operations Tables

```sql
-- MIGRATION 005

CREATE TABLE room_inspections (
  inspection_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  room_id           UUID NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
  inspector_name    VARCHAR(200),
  rating            INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes             TEXT,
  issues            TEXT[],
  inspected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE room_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON room_inspections
  USING (hostel_id = current_setting('app.hostel_id')::uuid);

CREATE TABLE bill_splits (
  split_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  total_amount_pkr  NUMERIC(10,2) NOT NULL,
  split_type        VARCHAR(20) NOT NULL CHECK (split_type IN ('equal','custom')),
  participants      JSONB NOT NULL,  -- [{student_id, share_pkr}]
  utility_type      VARCHAR(100),    -- 'Electricity', 'Gas', etc.
  billing_month     DATE,
  notes             TEXT,
  created_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE bill_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON bill_splits
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
```

### 3.6 Billing and System Tables

```sql
-- MIGRATION 006

CREATE TABLE subscriptions (
  subscription_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL UNIQUE REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  plan              VARCHAR(20) NOT NULL CHECK (plan IN ('trial','starter','pro','enterprise')),
  status            VARCHAR(20) NOT NULL DEFAULT 'trialing'
                    CHECK (status IN ('trialing','active','past_due','suspended','cancelled')),
  -- Trial
  trial_starts_at   TIMESTAMPTZ DEFAULT now(),
  trial_ends_at     TIMESTAMPTZ,
  -- Billing
  billing_cycle     VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual')),
  amount_pkr        NUMERIC(10,2),
  paymob_subscription_id VARCHAR(200),
  paymob_order_id   VARCHAR(200),
  -- Dates
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  -- Dunning
  payment_failed_at TIMESTAMPTZ,
  dunning_day       INTEGER DEFAULT 0,
  next_dunning_at   TIMESTAMPTZ,
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT,
  -- Data management
  data_export_sent_at TIMESTAMPTZ,
  pii_purged_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
-- No RLS on subscriptions — managed by service_role in billing worker

CREATE TABLE audit_log (
  log_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  -- hostel_id NULL for platform-level events
  actor_id          UUID REFERENCES users(user_id) ON DELETE SET NULL,
  impersonated_by   UUID REFERENCES users(user_id) ON DELETE SET NULL,
  -- What happened
  action            VARCHAR(100) NOT NULL,
  entity_type       VARCHAR(50) NOT NULL,
  entity_id         UUID,
  old_values        JSONB,
  new_values        JSONB,
  -- CNIC reveal
  cnic_revealed     BOOLEAN DEFAULT false,
  -- Integrity
  prev_hash         TEXT,               -- SHA-256 of previous log entry
  entry_hash        TEXT,               -- SHA-256 of this entry's content
  -- Context
  ip_address        INET,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
  -- NO updated_at — this table is INSERT ONLY
  -- NO deleted_at — this table CANNOT be soft-deleted
);
-- INSERT ONLY enforced via trigger:
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is INSERT ONLY. Modification forbidden.';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON audit_log
  USING (hostel_id = current_setting('app.hostel_id')::uuid OR hostel_id IS NULL);
CREATE INDEX idx_audit_hostel ON audit_log(hostel_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);

CREATE TABLE warden_shift_log (
  log_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  user_id           UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  event_type        VARCHAR(20) NOT NULL CHECK (event_type IN ('login','logout')),
  ip_address        INET,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE warden_shift_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON warden_shift_log
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_shift_log_hostel ON warden_shift_log(hostel_id, created_at DESC);

CREATE TABLE receipt_counter (
  hostel_id         UUID PRIMARY KEY REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  last_number       INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT now()
);
-- No RLS — accessed by service_role for atomic increment

-- Atomic receipt number function — handles concurrent requests safely
CREATE OR REPLACE FUNCTION get_next_receipt_number(p_hostel_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_number INTEGER;
BEGIN
  INSERT INTO receipt_counter (hostel_id, last_number)
  VALUES (p_hostel_id, 1)
  ON CONFLICT (hostel_id) DO UPDATE
    SET last_number = receipt_counter.last_number + 1,
        updated_at = now()
  RETURNING last_number INTO v_number;

  RETURN 'RCP-' || LPAD(v_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE dlq_jobs (
  job_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID REFERENCES hostels(hostel_id) ON DELETE SET NULL,
  queue_name        VARCHAR(100) NOT NULL,
  bullmq_job_id     TEXT,
  payload           JSONB,
  error_message     TEXT,
  attempts          INTEGER DEFAULT 0,
  status            VARCHAR(20) DEFAULT 'failed'
                    CHECK (status IN ('failed','resolved','ignored')),
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dlq_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY super_admin_only ON dlq_jobs USING (
  current_setting('app.role', true) = 'super_admin'
);
CREATE INDEX idx_dlq_status ON dlq_jobs(status, created_at DESC);
CREATE INDEX idx_dlq_queue ON dlq_jobs(queue_name, status);
```

### 3.7 Product Tables

```sql
-- MIGRATION 007

CREATE TABLE api_keys (
  key_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  key_prefix        VARCHAR(10) NOT NULL,   -- e.g., 'hst_'
  key_hash          TEXT NOT NULL,          -- SHA-256 of full key — never store plaintext
  name              VARCHAR(200),
  scopes            TEXT[],                 -- ['students:read', 'payments:read']
  last_used_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users(user_id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  revoked_at        TIMESTAMPTZ
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON api_keys
  USING (hostel_id = current_setting('app.hostel_id')::uuid);

CREATE TABLE feedback (
  feedback_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  user_id           UUID REFERENCES users(user_id) ON DELETE SET NULL,
  content           TEXT NOT NULL CHECK (length(content) <= 500),
  category          VARCHAR(50), -- 'bug', 'feature', 'other'
  page_url          TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON feedback
  USING (hostel_id = current_setting('app.hostel_id')::uuid);

CREATE TABLE nps_responses (
  response_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  user_id           UUID REFERENCES users(user_id) ON DELETE SET NULL,
  score             INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment           TEXT,
  triggered_at      TIMESTAMPTZ DEFAULT now(),
  responded_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON nps_responses
  USING (hostel_id = current_setting('app.hostel_id')::uuid);

CREATE TABLE onboarding_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  event_name        VARCHAR(50) NOT NULL,
  step_number       INTEGER CHECK (step_number BETWEEN 1 AND 7),
  skipped           BOOLEAN DEFAULT false,
  completed_at      TIMESTAMPTZ DEFAULT now(),
  metadata          JSONB DEFAULT '{}'
);
ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON onboarding_events
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
CREATE INDEX idx_onboarding_hostel ON onboarding_events(hostel_id);

CREATE TABLE referral_payouts (
  payout_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_hostel_id UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  referred_hostel_id UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  amount_pkr        NUMERIC(10,2) NOT NULL DEFAULT 500,
  status            VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','credited','paid')),
  credited_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON referral_payouts
  USING (referrer_hostel_id = current_setting('app.hostel_id')::uuid);
```

---

## 4. INDEX STRATEGY

### 4.1 Index Categories

**Search indexes (GIN — full-text and trigram):**
- `students.search_vector` — GIN, for pg_trgm name/city/phone search
- Additional trigram indexes added if LIKE queries on CNIC search are needed

**Tenant isolation indexes (B-tree with partial WHERE):**
- Every tenant table has `idx_{table}_hostel ON {table}(hostel_id) WHERE deleted_at IS NULL`
- These are the most frequently used indexes in the system

**Uniqueness indexes:**
- `payments(student_id, payment_month)` — prevents duplicate payment records for same month
- `rooms(hostel_id, number)` — prevents duplicate room numbers within a hostel
- `users(email)` — global uniqueness

**Status/filter indexes:**
- `payments(hostel_id, status)` — defaulters list query
- `cancellations(vacate_date)` — nightly auto-confirm cron
- `audit_log(hostel_id, created_at DESC)` — activity log pagination

### 4.2 Index Monitoring

Unused indexes waste write performance. Run quarterly:
```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename;
```

Remove any index with 0 scans after 90 days of production data.

---

## 5. QUERY STRATEGY

### 5.1 The withTenant Pattern (Mandatory)

Every query touching a tenant table uses this pattern. No exceptions.

```typescript
export async function withTenant<T>(
  hostelId: string,
  queryFn: (db: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT set_config($1, $2, true)',
      ['app.hostel_id', hostelId]
    );
    const result = await queryFn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

`true` as the third argument to `set_config` means the value is LOCAL to the transaction. It is automatically reset when the transaction ends. This is the correct isolation mechanism.

### 5.2 Dashboard Aggregation (Single Query)

The dashboard loads 5 KPI values in a single query:

```sql
WITH month_payments AS (
  SELECT
    SUM(amount_paid_pkr) AS revenue,
    SUM(unpaid_pkr) FILTER (WHERE status != 'paid') AS pending
  FROM payments
  WHERE hostel_id = current_setting('app.hostel_id')::uuid
    AND payment_month = date_trunc('month', CURRENT_DATE)
    AND deleted_at IS NULL
),
month_expenses AS (
  SELECT SUM(amount_pkr) AS expenses
  FROM expenses
  WHERE hostel_id = current_setting('app.hostel_id')::uuid
    AND date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE)
    AND deleted_at IS NULL
),
month_transfers AS (
  SELECT SUM(amount_pkr) AS transfers
  FROM owner_transfers
  WHERE hostel_id = current_setting('app.hostel_id')::uuid
    AND date_trunc('month', transfer_date) = date_trunc('month', CURRENT_DATE)
    AND deleted_at IS NULL
)
SELECT
  COALESCE(p.revenue, 0)    AS revenue,
  COALESCE(p.pending, 0)    AS pending,
  COALESCE(e.expenses, 0)   AS expenses,
  COALESCE(t.transfers, 0)  AS transfers,
  COALESCE(p.revenue, 0) - COALESCE(e.expenses, 0) - COALESCE(t.transfers, 0) AS net_fund
FROM month_payments p, month_expenses e, month_transfers t;
```

This is a single round-trip to the database. Not 5 separate queries.

### 5.3 Pagination Strategy

All list endpoints use cursor-based pagination for large datasets, limit/offset for small:

- `payments`, `students`, `audit_log`: cursor-based (keyed on `created_at` + `id`)
- `rooms`, `beds`, `expenses`: limit/offset (max 100 rows, small datasets)
- Default page size: 25 rows
- Maximum page size: 100 rows

---

## 6. TENANT ISOLATION STRATEGY

Three layers enforce isolation. All three must work. If any one fails, the others prevent breach.

**Layer 1 — Application:** `hostel_id` sourced from JWT (`req.hostelId`). Never from request body.

**Layer 2 — ESLint:** Custom rule `hostyllo/require-with-tenant` blocks any `pool.query()` call outside `withTenant()`. CI fails on violation.

**Layer 3 — Database RLS:** `SET LOCAL app.hostel_id` inside transaction. RLS policy filters all reads and writes to matching `hostel_id`.

**Cross-tenant test (mandatory after every endpoint):**
```bash
# Create two tenants: hostel_A and hostel_B
# Login as hostel_A user → get JWT_A
# Create a student in hostel_A → student_id_A

# Attempt to access hostel_A student with hostel_B JWT
curl -H "Authorization: Bearer JWT_B" \
  https://api.hostyllo.app/api/v1/students/{student_id_A}

# Expected: 404 Not Found (not 403, not 200)
# 403 reveals the record exists — information leak
# 404 is indistinguishable from "record does not exist"
```

---

## 7. BACKUP ARCHITECTURE

**Primary backup:** Supabase PITR (Point-in-Time Recovery)
- Retention: 7 days
- Recovery granularity: Any point within 7 days
- Coverage: Full PostgreSQL WAL streaming — all tables, all changes
- Verification: `verify-pitr.sh` runs monthly, exit code must be 0

**Verification script (`scripts/verify-pitr.sh`):**
```bash
#!/bin/bash
# Run on the 1st of every month. Log output.
set -e
echo "[$(date -u)] Verifying PITR status..."

RESPONSE=$(curl -s -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/backups")

PITR_ENABLED=$(echo $RESPONSE | jq -r '.pitr_enabled')
RECOVERY_WINDOW=$(echo $RESPONSE | jq -r '.pitr_recovery_window_days')

if [ "$PITR_ENABLED" != "true" ]; then
  echo "[ERROR] PITR is NOT enabled. Fix immediately."
  exit 1
fi

if [ "$RECOVERY_WINDOW" -lt 7 ]; then
  echo "[ERROR] PITR recovery window is $RECOVERY_WINDOW days (required: 7)."
  exit 1
fi

echo "[OK] PITR is active. Recovery window: $RECOVERY_WINDOW days."
echo "[$(date -u)] PITR verification passed." >> logs/pitr-verification.log
exit 0
```

---

## 8. ARCHIVING AND DATA RETENTION

### 8.1 Retention Policy

| Data Type | Retention | Policy |
|-----------|-----------|--------|
| Active tenant data | Indefinite while subscribed | Normal database |
| Soft-deleted records | Indefinite | `deleted_at IS NOT NULL`, excluded from queries |
| Audit log | Minimum 7 years | INSERT-only, never purged |
| Payment records | Minimum 7 years | Soft-deleted only, never purged |
| Student PII (CNIC, name) | 31 days after account deletion | Auto-purge via BullMQ job |
| Aggregated financial totals | Minimum 7 years | Even after PII purge |
| PDF receipts | 7 years | Supabase Storage private bucket |
| Tenant exports | 28 days from deletion | S3 temporary bucket |

### 8.2 PII Purge on Account Deletion (AUTO-11)

```sql
-- Runs on Day 31 after subscription cancellation
-- Removes identifiable data, preserves financial aggregates

UPDATE students SET
  full_name = 'REDACTED',
  father_name = NULL,
  cnic_encrypted = NULL,
  phone = NULL,
  emergency_contact = NULL,
  email = NULL,
  address = NULL,
  photo_url = NULL
WHERE hostel_id = $1
  AND deleted_at IS NOT NULL;

-- Payments: preserve amounts, remove student link details
-- audit_log: NEVER modified — integrity must be preserved
-- receipts: delete from Supabase Storage
```

---

## 9. MIGRATION STRATEGY

### 9.1 Migration Numbering

```
Migration 001: hostels, users
Migration 002: students, rooms, beds, room_shifts
Migration 003: payments, payment_extra_charges, expenses, owner_transfers, fines
Migration 004: cancellations, maintenance_requests, complaints, checkin_log, notices
Migration 005: room_inspections, bill_splits (Phase 2)
Migration 006: subscriptions, audit_log, warden_shift_log, receipt_counter, dlq_jobs
Migration 007: api_keys, feedback, nps_responses, onboarding_events, referral_payouts
```

### 9.2 Migration Rules

1. Never modify existing columns in production — add new columns with defaults.
2. Never rename columns — add new column, migrate data, deprecate old.
3. Every migration is reversible (down migration defined).
4. Migrations run in CI before deployment.
5. RLS check runs after every migration: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false` must return 0 rows.

### 9.3 Electron Client Data Migration

For migrating existing Electron clients (50+ hostels), a one-time import tool is required:

```
Input: Electron app data export (JSON file from localStorage)
Output: API calls to POST /students, POST /payments (historical)
Process:
  1. Client exports data from Electron app (Settings → Export)
  2. Migration tool validates JSON schema against PRD field definitions
  3. Tool strips formula injection characters from all text fields
  4. Tool re-encrypts CNIC values using production ENCRYPTION_KEY
  5. Tool imports via API (not direct DB) to enforce all validations
  6. Tool reports: X students imported, Y payments imported, Z errors
  7. Client verifies counts match Electron app
```

This tool does not exist yet. It must be built before Phase 1 client onboarding.

---

## 10. PERFORMANCE STRATEGY

### 10.1 Performance Targets

| Query | Target | Index Used |
|-------|--------|------------|
| Student search (pg_trgm) | < 200ms p95 | GIN on search_vector |
| Dashboard aggregate | < 200ms p95 | hostel+month composite indexes |
| Payment list (current month) | < 100ms p95 | hostel+month index |
| Defaulters list | < 200ms p95 | hostel+status index |
| Audit log (paginated) | < 100ms p95 | hostel+created_at index |

### 10.2 Connection Pool Configuration

PgBouncer in transaction mode (Supabase default):
- `pool_size`: 20 connections per application instance
- `max_overflow`: 10 (Railway auto-scaling handles spikes via new replicas)
- `pool_timeout`: 30 seconds
- `connection_timeout`: 5 seconds

Transaction mode is compatible with `withTenant()` because `SET LOCAL` is inside explicit `BEGIN/COMMIT`. Session-level settings would not survive PgBouncer transaction mode.

---

## 11. DATABASE FAILURE RECOVERY

### 11.1 Failure Scenarios

**Scenario: Database connection pool exhausted**
- Symptom: API returns 500, logs show "pool timeout"
- Response: Check Railway replicas (scale down if CPU is low, meaning traffic spike is the cause), check for long-running queries in Supabase dashboard
- Resolution: Kill blocking queries, scale API replicas, increase pool_size if sustained

**Scenario: Supabase region outage (Mumbai)**
- Symptom: All DB connections fail, `/health` returns `db: error`
- Response: This is a vendor incident. Monitor status.supabase.com. No mitigation available without a secondary region (not configured).
- Recovery: PITR restore to new project in alternate region (Singapore). DNS update to new API connecting to restored DB. Estimated RTO: 4-8 hours.

**Scenario: Corrupted data from bad migration**
- Response: Identify the time of corruption from `audit_log` timestamps. Use PITR to restore to a point before migration. Re-apply migrations after fix.
- Required: `verify-pitr.sh` must have passed within 30 days to guarantee 7-day window is available.

**Scenario: Accidental deletion of critical records**
- Response: All records are soft-deleted (`deleted_at IS NOT NULL`). Recovery is `UPDATE table SET deleted_at = NULL WHERE id = $1`.
- Audit log records the deletion event with actor_id, enabling attribution.

---

*HOSTYLLO Database Architecture v1.0 · June 2026 · Traceable to PRD v15.0 Section 17*
*Schema file authority: packages/db/src/schema.sql*
