-- Migration 008: one non-void payment per student per month
--
-- generate-monthly (route) and rent-generate (worker) rely on
-- ON CONFLICT DO NOTHING for idempotency, but the only UNIQUE constraint on
-- payments was idempotency_key — which is NULL for generated rows, and NULLs
-- never conflict in Postgres. Re-running generation therefore duplicated every
-- student's rent for the month.
--
-- All writers store `month` normalised to the first of the month
-- ('YYYY-MM-01'), so a plain column index is sufficient — no date_trunc needed.
-- Voided and soft-deleted payments are excluded so a voided payment can be
-- re-issued for the same month (mirrors the duplicate-month check in
-- POST /payments).

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_student_month
  ON payments (hostel_id, student_id, month)
  WHERE status != 'void' AND deleted_at IS NULL;
