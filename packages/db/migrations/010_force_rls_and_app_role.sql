-- Migration 010: make tenant isolation actually enforced by the database (audit C1)
--
-- PROBLEM (ARB audit C1): every tenant table had ENABLE ROW LEVEL SECURITY but none had
-- FORCE. The application connects as the table OWNER (the Supabase `postgres` role), and in
-- PostgreSQL the owner BYPASSES RLS unless FORCE is set. So the `current_setting('app.hostel_id')`
-- policies were never evaluated for the app's own queries — isolation rested entirely on every
-- route remembering to add an explicit `hostel_id = current_setting('app.hostel_id')` filter.
-- One forgotten filter = silent cross-tenant leak, with no DB safety net.
--
-- FIX: FORCE ROW LEVEL SECURITY on all tenant tables, and rewrite every policy to add a
-- system-context escape hatch:
--
--     USING ( hostel_id::text = current_setting('app.hostel_id', true)
--             OR current_setting('app.system_context', true) = 'on' )
--
-- Two connection identities then exist:
--   • Per-request (tenant) path  — role `hostyllo_app`, system_context = 'off'. Fully
--     constrained by RLS: a query with no/incorrect app.hostel_id returns ZERO rows (fail
--     closed). `withTenant()` sets app.hostel_id per transaction.
--   • Privileged (system) path   — the existing `postgres` role, system_context = 'on'.
--     Intentionally cross-tenant, used ONLY by the auth bootstrap (cross-tenant user lookup
--     at login, before a tenant is known) and the background workers (platform-wide jobs).
--
-- SAFE FALLBACK: until the app is pointed at `hostyllo_app` (DATABASE_URL_APP), every
-- connection is `postgres` (system_context='on') and this migration changes nothing
-- observable — the explicit filters still scope queries, nothing breaks. Enforcement turns
-- on the moment the per-request pool connects as hostyllo_app. So this migration is safe to
-- apply immediately; it is INERT until the role is configured.
--
-- ⚠️ MUST be verified on a live/staging DB (I cannot run it here). Verification query in
--    scripts/verify-rls.sql must return 0 rows. Founder steps at the bottom of this file.

-- ── 1. Privileged (system) role default ──────────────────────────────────────────────────
-- The app's current connecting role runs cross-tenant. If your connecting role is not
-- literally `postgres`, change it here to match the role in DATABASE_URL.
ALTER ROLE postgres SET app.system_context = 'on';

-- ── 2. Least-privilege per-request role ──────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hostyllo_app') THEN
    CREATE ROLE hostyllo_app NOLOGIN;   -- founder sets LOGIN + PASSWORD out of band
  END IF;
END $$;

ALTER ROLE hostyllo_app SET app.system_context = 'off';  -- never cross-tenant

GRANT USAGE ON SCHEMA public TO hostyllo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO hostyllo_app;
GRANT USAGE, SELECT                 ON ALL SEQUENCES  IN SCHEMA public TO hostyllo_app;
GRANT EXECUTE                       ON ALL FUNCTIONS  IN SCHEMA public TO hostyllo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO hostyllo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT                 ON SEQUENCES TO hostyllo_app;

-- ── 3. hostels: replace the service-role-only policy with tenant scoping ──────────────────
-- hostels keys on `id` (not hostel_id). The old `auth.role() = 'service_role'` check never
-- matched a direct-Postgres connection, so the app could not read its own hostel under FORCE.
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hostels: service role only" ON hostels;
DROP POLICY IF EXISTS "hostels: tenant isolation"  ON hostels;
CREATE POLICY "hostels: tenant isolation" ON hostels
  USING (
    id::text = current_setting('app.hostel_id', true)
    OR current_setting('app.system_context', true) = 'on'
  );

-- ── 4. All hostel_id tenant tables: FORCE + rewrite policy with the system escape ─────────
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'users','rooms','beds','students','room_shifts',
    'payments','payment_extra_charges','expenses','owner_transfers','fines','receipt_counter',
    'cancellations','maintenance_requests','complaints','checkin_log','notices',
    'room_inspections','bill_splits',
    'subscriptions','audit_log','warden_shift_log','dlq_jobs',
    'feedback','nps_responses','onboarding_events','referral_payouts','api_keys'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE  ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || ': tenant isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING ('
      || 'hostel_id::text = current_setting(''app.hostel_id'', true) '
      || 'OR current_setting(''app.system_context'', true) = ''on'')',
      t || ': tenant isolation', t
    );
  END LOOP;
END $$;

-- ── FOUNDER STEPS (out of band — cannot be done from this migration) ──────────────────────
--   1. Give the per-request role a login + password:
--        ALTER ROLE hostyllo_app LOGIN PASSWORD '<strong-random>';
--      On Supabase, also grant it to the pooler/authenticator as their docs require.
--   2. Set DATABASE_URL_APP to a connection string using hostyllo_app (same DB/host, that role).
--      Leave DATABASE_URL as the privileged (postgres) connection for auth + workers.
--   3. Redeploy. Then run scripts/verify-rls.sql — it must return 0 rows.
--   4. Prove isolation: with DATABASE_URL_APP active, a raw `SELECT * FROM students`
--      WITHOUT set_config('app.hostel_id', ...) must return 0 rows.
