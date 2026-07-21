---
name: database-review
description: Review HOSTYLLO database changes — migrations, RLS policies, indexes, and queries — for tenant isolation, integrity, and performance. Use when adding/altering tables or writing SQL under packages/db.
---

# Database Review

Review against the schema rules in `CLAUDE.md` and PRD Section 17. Delegate deep work to the
`database` agent. Read the migration(s) and affected queries.

## Steps
1. Identify the migration / SQL changed. Confirm migrations are additive (new numbered file, old ones
   never edited once applied).
2. Check against the checklist. Report **Blocker / High / Medium / Nit** with the fix.

## Checklist
**Every new/altered tenant table:**
- [ ] `hostel_id UUID NOT NULL REFERENCES hostels(hostel_id)`.
- [ ] `created_at TIMESTAMPTZ DEFAULT now()` and `deleted_at TIMESTAMPTZ` (soft delete).
- [ ] `ENABLE ROW LEVEL SECURITY` + `tenant_iso` policy on `current_setting('app.hostel_id')::uuid`.
- [ ] Money columns are `NUMERIC(10,2)` — never FLOAT.
- [ ] CNIC stored as `cnic_encrypted` — no plaintext column.

**Integrity & performance:**
- [ ] `audit_log` cannot be UPDATEd/DELETEd (rule/trigger enforced).
- [ ] `get_next_receipt_number()` is atomic, per-hostel, never resets.
- [ ] Indexes for hot paths: `pg_trgm` GIN for student search; FKs and month/status filters indexed.
- [ ] No N+1 / per-row loops where a set-based query works (flag the `generate-monthly` loop).

**Verification:**
- [ ] `SELECT tablename FROM pg_tables WHERE rowsecurity=false` returns 0 rows.
- [ ] Isolation test passes; PgBouncer is transaction mode.
