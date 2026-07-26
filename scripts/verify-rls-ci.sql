-- verify-rls-ci.sql — the machine-checkable half of the audit C1 gate.
--
-- Asserts that EVERY table in `public` has both ENABLE and FORCE row level security.
-- ENABLE alone is not enough: without FORCE, the table owner bypasses RLS entirely, which is
-- exactly the hole migration 010 closed. A new table added without RLS is a tenant-isolation
-- regression, and this is what stops one reaching production.
--
-- Raises (and so exits non-zero under `psql -v ON_ERROR_STOP=1 -f`) instead of printing rows,
-- so it works as a CI gate and as a manual check. The human-facing companion with the live
-- isolation proof and role config is scripts/verify-rls.sql.
--
-- Run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-rls-ci.sql

DO $$
DECLARE
  offenders text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
    INTO offenders
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    -- genuinely global (non-tenant) tables belong here; keep this list SHORT and justified
    AND c.relname NOT IN ('schema_migrations')
    AND (c.relrowsecurity = false OR c.relforcerowsecurity = false);

  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION
      'RLS GATE FAILED — table(s) without ENABLE+FORCE row level security: %', offenders;
  END IF;

  RAISE NOTICE 'RLS gate passed — every public table has ENABLE + FORCE row level security.';
END $$;
