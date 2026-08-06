-- 013_payments_notes.sql
--
-- Adds the `notes` column that POST /payments and PATCH /payments/:id have been advertising since
-- they were written.
--
-- Background: both routes declare `notes` in their JSON Schema, but migration 003 never created a
-- column for it and neither handler referenced one — the INSERT column list stopped at
-- `created_by`. A client could send a note, receive 201, and have it silently vanish. That is the
-- same defect class as the `extra_charges` bug fixed in July (declared in the schema, never
-- persisted), which is why it is worth closing rather than tolerating.
--
-- Of the two honest fixes — persist it, or drop it from both schemas so the contract stops
-- promising it — persisting is the useful one. A warden recording "paid in two instalments, second
-- by JazzCash" has nowhere else to put that, and the alternative is the note living in nobody's
-- record at all.
--
-- TEXT rather than VARCHAR(n): there is no length the domain actually implies, and the route
-- caps input through its JSON Schema, which is the layer that can return a 400 instead of a
-- constraint violation. Nullable with no default — an absent note is genuinely absent, and
-- defaulting to '' would make "no note" and "an empty note" indistinguishable in the audit trail.
--
-- IF NOT EXISTS keeps this a no-op on any database where it has already been applied, so the same
-- ordered set of files produces an identical schema in every environment.

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.payments.notes IS
  'Free-text note recorded with the payment (e.g. instalment or channel detail). Set on create and editable by the owner through PATCH /payments/:id.';
