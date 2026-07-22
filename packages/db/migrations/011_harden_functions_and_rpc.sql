-- Migration 011: security-advisor hardening (applied + verified live 2026-07-22).
-- Surfaced by Supabase get_advisors after migration 010.

-- 1. rls_auto_enable() is an event-trigger function (auto-enables RLS on new public tables). It
--    should only ever be fired by the event-trigger system as its owner — no role needs direct
--    EXECUTE, and PostgREST was exposing it as an anon/authenticated RPC (/rest/v1/rpc/…).
--    Not exploitable (it errors outside a DDL-event context) but flagged; remove the exposure.
--    Guarded: rls_auto_enable() was added manually on the live Supabase DB and is NOT created by
--    any migration, so it is absent on a fresh DB (CI / a new project) — only revoke if present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, hostyllo_app';
  END IF;
END $$;

-- 2. Pin search_path on the flagged functions (prevents search_path manipulation, especially on
--    SECURITY DEFINER / trigger functions).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_next_receipt_number','update_updated_at','audit_log_immutable','students_search_vector_update')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public', r.sig);
  END LOOP;
END $$;

-- Not addressed here (deliberate): pg_trgm lives in `public` (moving it risks the trgm indexes);
-- Supabase-Auth leaked-password protection is off (the app uses its own JWT, not Supabase Auth).
