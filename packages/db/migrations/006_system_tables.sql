-- Migration 006: subscriptions, audit_log, warden_shift_log, dlq_jobs

-- =====================
-- SUBSCRIPTIONS TABLE
-- =====================
CREATE TABLE subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  plan              TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'enterprise')),
  status            TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'suspended', 'cancelled')),
  trial_ends_at     TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions: tenant isolation"
  ON subscriptions
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_subscriptions_hostel_id ON subscriptions(hostel_id);

-- =====================
-- AUDIT LOG TABLE
-- INSERT ONLY — NEVER UPDATE OR DELETE
-- =====================
CREATE TABLE audit_log (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id),
  action            TEXT NOT NULL,
  entity_type       TEXT NOT NULL,
  entity_id         UUID,
  old_data          JSONB,
  new_data          JSONB,
  ip_address        TEXT,
  user_agent        TEXT,
  hash              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log: tenant isolation"
  ON audit_log
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_audit_log_hostel_id ON audit_log(hostel_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);

-- Block UPDATE and DELETE on audit_log — INVARIANT-5
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'INVARIANT-5: audit_log is immutable — UPDATE and DELETE are forbidden';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- =====================
-- WARDEN SHIFT LOG
-- =====================
CREATE TABLE warden_shift_log (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),
  login_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at         TIMESTAMPTZ,
  ip_address        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE warden_shift_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warden_shift_log: tenant isolation"
  ON warden_shift_log
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_warden_shift_hostel_id ON warden_shift_log(hostel_id);

-- =====================
-- DLQ JOBS TABLE
-- =====================
CREATE TABLE dlq_jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID REFERENCES hostels(id) ON DELETE CASCADE,
  queue_name        TEXT NOT NULL,
  job_id            TEXT NOT NULL,
  job_name          TEXT NOT NULL,
  data              JSONB,
  error             TEXT,
  attempts          INTEGER NOT NULL DEFAULT 0,
  failed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dlq_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dlq_jobs: tenant isolation"
  ON dlq_jobs
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_dlq_jobs_queue ON dlq_jobs(queue_name);
CREATE INDEX idx_dlq_jobs_hostel_id ON dlq_jobs(hostel_id);

-- Trigger
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();