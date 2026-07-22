-- Migration 009: add user/hostel columns the code already reads but the schema never had
--
-- These are runtime blockers, not enhancements — the following queries reference
-- columns that migration 001 never created, so they fail with
-- "column ... does not exist" the moment they run:
--
--   routes/auth.ts  login       SELECT u.display_name, u.theme, u.language      (every login)
--   routes/auth.ts  totp/setup  UPDATE totp_secret_enc, totp_backup_codes       (MFA enrol)
--   routes/auth.ts  totp/verify SELECT totp_secret_enc, display_name, theme, language
--   workers/pdf-receipts.ts     SELECT h.tagline                                (every receipt)
--
-- auth.ts stores the TOTP secret AES-256-GCM-encrypted (encryptSecret/decryptSecret)
-- and reads it back as `totp_secret_enc`, so the existing plaintext-named column is
-- renamed rather than duplicated. On any DB seeded before this migration the column
-- holds at most a dev secret; renaming preserves it (it will simply fail to decrypt
-- and force a fresh TOTP setup, which is the correct fail-safe).
--
-- Only columns with a live code reader are added here. Spec-anticipated fields with
-- no consumer yet (hostels.brand_color/show_branding/auto_month_advance,
-- users.can_edit/can_delete/can_settings) are intentionally deferred until the
-- feature that uses them lands — see tasks/todo §1.5.

ALTER TABLE users RENAME COLUMN totp_secret TO totp_secret_enc;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT,
  ADD COLUMN IF NOT EXISTS display_name      TEXT,
  ADD COLUMN IF NOT EXISTS theme             TEXT NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS language          TEXT NOT NULL DEFAULT 'en';

ALTER TABLE hostels
  ADD COLUMN IF NOT EXISTS tagline TEXT;
