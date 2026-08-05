-- 014_students_mess_nationality_course.sql
--
-- Adds the four things the redesigned Students screen needs and the schema does not have:
-- `mess_fee`, `nationality`, `course`, and a `blacklisted` status.
--
-- ── Why these are new rather than ported ─────────────────────────────────────────────────────
--
-- Hostyllo's information architecture is lifted from HOSTIX, the offline Electron app, so the
-- default assumption for any field is that it already exists there and needs porting. Three of
-- these four break that assumption, and it is worth writing down which, so nobody goes looking
-- for legacy semantics that were never there:
--
--   mess_fee     Does not exist in HOSTIX in any form. A grep for mess_fee|messFee|mess fee|
--                messCharge across the renderer, the main process and its docs returns nothing.
--                There is no board line item, no formula and no data to migrate. The closest
--                thing is a free-text {label, amount} extras array on a *payment*, where a warden
--                could type "Mess" — not a modelled field. So the semantics below are a product
--                decision (owner, 2026-08-05), not a reconstruction.
--   nationality  Not in HOSTIX either. The design brief already flagged it as new.
--   course       Exists in HOSTIX as `occupation` and is genuinely used. Named `course` here
--                because that is what the column says on the redesigned screen and what a hostel
--                manager calls it. Worth knowing: HOSTIX also reads a `t.course` field in three
--                places that nothing ever writes — dead legacy, not a second source.
--   blacklisted  HOSTIX reaches this state only through the Edit form's status dropdown: no
--                button, no reason, no confirmation, no audit entry. Adding the value here is
--                deliberately just that — a label — until the product decides what blacklisting
--                should actually do.
--
-- ── mess_fee semantics ───────────────────────────────────────────────────────────────────────
--
-- Per student, billed with rent. The displayed monthly figure is monthly_fee + mess_fee, with the
-- two shown broken out beneath it. NULL means mess is not included, which the screen renders as
-- "Mess not included" — and it is why this column is nullable with no default rather than
-- NOT NULL DEFAULT 0. Zero and absent are different facts here: a student on a zero-rated mess
-- plan is included, a student with no mess is not, and collapsing both to 0 would make the two
-- indistinguishable in exactly the cell that exists to distinguish them.
--
-- NUMERIC(10,2) matches monthly_fee and admission_fee, so the three can be summed without a cast
-- and without float error.
--
-- ── The status widening ──────────────────────────────────────────────────────────────────────
--
-- The existing CHECK is (active, vacating, vacated). `vacating` is a genuine improvement on
-- HOSTIX, whose equivalent 'Cancelling' status is reachable and badge-styled but appears in no
-- filter tab — so a cancelling student is visible only under "All", and opening the Edit form on
-- one silently rewrites them to Active because the dropdown has no matching option. Keeping
-- `vacating` and surfacing it in the UI closes that hole.
--
-- A CHECK constraint cannot be extended in place, so it is dropped and recreated. Both statements
-- are cheap: Postgres validates the new constraint against existing rows, and every existing row
-- already holds one of the three values it is keeping.
--
-- IF NOT EXISTS / IF EXISTS throughout keeps this a no-op on any database where it has already
-- been applied, so the same ordered set of files produces an identical schema in every
-- environment.

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mess_fee    NUMERIC(10,2);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS course      TEXT;

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE public.students ADD  CONSTRAINT students_status_check
  CHECK (status IN ('active', 'vacating', 'vacated', 'blacklisted'));

COMMENT ON COLUMN public.students.mess_fee IS
  'Monthly mess charge in PKR, billed together with monthly_fee. NULL means mess is not included — distinct from 0.00, which means included and zero-rated.';

COMMENT ON COLUMN public.students.nationality IS
  'Free text (Pakistani, Afghan, …). Not an enum: the set is open, and a CHECK would turn an unanticipated nationality into a 500.';

COMMENT ON COLUMN public.students.course IS
  'Course or field of study. Called `occupation` in the HOSTIX Electron app; renamed to match what the screen and the operator both call it.';

-- The Students screen's own default sort is room ascending, which is served by the existing
-- rooms join. This index serves the Nationality filter pill instead — cheap, and the column is
-- low-cardinality enough that a partial index on the live rows is the whole of it.
CREATE INDEX IF NOT EXISTS idx_students_nationality
  ON public.students (hostel_id, nationality)
  WHERE deleted_at IS NULL;
