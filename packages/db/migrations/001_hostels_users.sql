-- Migration 001: hostels + users tables
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================
-- HOSTELS TABLE
-- =====================
CREATE TABLE hostels (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  address           TEXT,
  city              TEXT,
  phone             TEXT,
  email             TEXT,
  logo_url          TEXT,
  plan              TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  plan_status       TEXT NOT NULL DEFAULT 'trial' CHECK (plan_status IN ('trial', 'active', 'suspended', 'cancelled')),
  trial_ends_at     TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  timezone          TEXT NOT NULL DEFAULT 'Asia/Karachi',
  currency          TEXT NOT NULL DEFAULT 'PKR',
  language          TEXT NOT NULL DEFAULT 'en',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hostels: service role only"
  ON hostels
  USING (auth.role() = 'service_role');

-- =====================
-- USERS TABLE
-- =====================
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  password_hash     TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'warden' CHECK (role IN ('hostel_owner', 'chain_manager', 'warden', 'viewer')),
  totp_secret       TEXT,
  totp_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE(email, hostel_id)
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: tenant isolation"
  ON users
  USING (hostel_id::text = current_setting('app.hostel_id', true));

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hostels_updated_at
  BEFORE UPDATE ON hostels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- INDEXES
-- =====================
CREATE INDEX idx_users_hostel_id ON users(hostel_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_hostels_plan_status ON hostels(plan_status);