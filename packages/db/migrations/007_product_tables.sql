-- Migration 007: feedback, nps_responses, onboarding_events, referral_payouts, api_keys

-- =====================
-- FEEDBACK TABLE
-- =====================
CREATE TABLE feedback (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id),
  message           TEXT NOT NULL CHECK (LENGTH(message) <= 500),
  page_url          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback: tenant isolation"
  ON feedback
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_feedback_hostel_id ON feedback(hostel_id);

-- =====================
-- NPS RESPONSES TABLE
-- =====================
CREATE TABLE nps_responses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id),
  score             INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nps_responses: tenant isolation"
  ON nps_responses
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_nps_hostel_id ON nps_responses(hostel_id);

-- =====================
-- ONBOARDING EVENTS TABLE
-- =====================
CREATE TABLE onboarding_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id),
  event             TEXT NOT NULL,
  step              INTEGER,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_events: tenant isolation"
  ON onboarding_events
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_onboarding_hostel_id ON onboarding_events(hostel_id);

-- =====================
-- REFERRAL PAYOUTS TABLE
-- =====================
CREATE TABLE referral_payouts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  referred_hostel_id UUID REFERENCES hostels(id),
  amount            NUMERIC(10,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_payouts: tenant isolation"
  ON referral_payouts
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_referral_payouts_hostel_id ON referral_payouts(hostel_id);

-- =====================
-- API KEYS TABLE
-- =====================
CREATE TABLE api_keys (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  key_hash          TEXT NOT NULL UNIQUE,
  last_used_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys: tenant isolation"
  ON api_keys
  USING (hostel_id::text = current_setting('app.hostel_id', true));

CREATE INDEX idx_api_keys_hostel_id ON api_keys(hostel_id);

-- Triggers
CREATE TRIGGER referral_payouts_updated_at
  BEFORE UPDATE ON referral_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();