-- Migration 010: make tenant isolation actually enforced by the database (audit C1)
--
-- PROBLEM: every tenant table had ENABLE ROW LEVEL SECURITY but none had FORCE. The app
-- connects as the table OWNER (Supabase `postgres`), and in PostgreSQL the owner BYPASSES RLS
-- unless FORCE is set. So the current_setting('app.hostel_id') policies never protected the app —
-- isolation rested entirely on every route remembering an explicit hostel_id filter.
--
-- FIX: FORCE ROW LEVEL SECURITY on every tenant table, and rewrite each policy with an escape:
--
--     USING ( hostel_id::text = current_setting('app.hostel_id', true)
--             OR current_setting('app.system_context', true) = 'on'
--             OR current_user = 'postgres' )
--
-- Two connection identities:
--   • Per-request (tenant): role `hostyllo_app` (NOT postgres) — fully constrained by RLS. A query
--     with no/incorrect app.hostel_id returns ZERO rows (fail closed). withTenant() sets it.
--   • Privileged (system): the `postgres` role — the `current_user = 'postgres'` branch lets it
--     run cross-tenant (auth bootstrap + background workers). No role-level GUC is used because
--     Supabase's postgres cannot `ALTER ROLE ... SET` a custom parameter (permission denied); the
--     current_user check is also reconnection-safe (no timing window on existing connections).
--   • `service_role` (PostgREST) has BYPASSRLS in Supabase and is unaffected.
--
-- SAFE FALLBACK: until the app is pointed at `hostyllo_app` (DATABASE_URL_APP), it connects as
-- postgres → the current_user branch keeps it working exactly as before (explicit filters still
-- scope). Enforcement activates the moment the per-request pool connects as hostyllo_app.
--
-- APPLIED + VERIFIED live on 2026-07-22 (project eprrhckgtrerknenngdy): 28/28 tables forced;
-- as hostyllo_app with no context → 0 rows, wrong hostel → 0 rows, correct hostel → its rows only.

-- 1. Least-privilege per-request role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hostyllo_app') THEN
    CREATE ROLE hostyllo_app NOLOGIN;   -- founder sets LOGIN + PASSWORD out of band
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO hostyllo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO hostyllo_app;
GRANT USAGE, SELECT                 ON ALL SEQUENCES  IN SCHEMA public TO hostyllo_app;
GRANT EXECUTE                       ON ALL FUNCTIONS  IN SCHEMA public TO hostyllo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO hostyllo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT                 ON SEQUENCES TO hostyllo_app;

-- 2. hostels: replace the service-role-only policy with tenant scoping (keys on id).
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hostels: service role only" ON hostels;
DROP POLICY IF EXISTS "hostels: tenant isolation"  ON hostels;
CREATE POLICY "hostels: tenant isolation" ON hostels
  USING (
    id::text = current_setting('app.hostel_id', true)
    OR current_setting('app.system_context', true) = 'on'
    OR current_user = 'postgres'
  );

-- 3. All hostel_id tenant tables: FORCE + rewrite policy with the escape.
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
      || 'OR current_setting(''app.system_context'', true) = ''on'' '
      || 'OR current_user = ''postgres'')',
      t || ': tenant isolation', t
    );
  END LOOP;
END $$;

-- ── FOUNDER STEP (out of band, done via secret store — NOT in this migration) ──────────────
--   ALTER ROLE hostyllo_app LOGIN PASSWORD '<strong-random>';   -- then set DATABASE_URL_APP
--   Verify: scripts/verify-rls.sql returns 0 rows; as hostyllo_app a raw SELECT with no
--   app.hostel_id set returns 0 rows.
