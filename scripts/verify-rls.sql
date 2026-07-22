-- verify-rls.sql — audit C1 gate. Run against the live/staging DB (Supabase SQL editor or psql).
-- Every query below must return ZERO rows. Any row is a tenant-isolation regression.

-- (1) Tenant tables that do NOT have FORCE ROW LEVEL SECURITY (owner would bypass RLS):
SELECT c.relname AS table_without_force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname NOT IN ('schema_migrations')          -- add any genuinely global tables here
  AND (c.relrowsecurity = false OR c.relforcerowsecurity = false);

-- (2) Live isolation proof — must be run on the hostyllo_app (per-request) connection,
--     WITHOUT setting app.hostel_id. Expect 0 rows. If it returns data, RLS is not enforcing.
--     (Run manually as hostyllo_app; commented out so this file is safe to paste as postgres.)
-- SELECT count(*) AS should_be_zero FROM students;

-- (3) Confirm the privileged role is the only one flagged cross-tenant:
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname IN ('postgres', 'hostyllo_app');
