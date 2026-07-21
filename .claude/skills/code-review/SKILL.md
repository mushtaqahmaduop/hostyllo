---
name: code-review
description: Review HOSTYLLO changes (a diff, a route, a PR) for correctness, the 6 invariants, security, and quality before merge. Use after implementing a feature/fix or when asked to review code. Produces severity-ranked findings, not a rewrite.
---

# Code Review

Review the target change as a senior HOSTYLLO reviewer. Read the actual files — never review from
description alone.

## Steps
1. Determine scope: `git diff` (or the named files/PR). List what changed.
2. For each changed file, check against the checklist below.
3. Report findings ranked **Blocker / High / Medium / Nit**, each with `file:line`, the problem, and the fix.
4. End with a verdict: **APPROVE / APPROVE WITH NITS / CHANGES REQUIRED**.

## Checklist
**Invariants (any violation = Blocker):**
- [ ] Every tenant-table query inside `withTenant(req.hostelId, ...)`.
- [ ] `hostel_id` from JWT only — never read from body/params/query.
- [ ] JWT verify `algorithms: ['RS256']`; bcrypt rounds ≥ 12.
- [ ] Money is `NUMERIC(10,2)` in SQL; no FLOAT.
- [ ] `audit_log` written (INSERT-only) for create/edit/void/delete of financial or sensitive data.

**Correctness:**
- [ ] Request schema declares every field the handler reads (watch `additionalProperties:false`
      silently dropping fields — e.g. the `extra_charges` bug).
- [ ] Edits recompute derived values from real data, not hardcoded placeholders.
- [ ] IDOR → 404 not 403. Soft-deleted rows excluded from lists. Error codes from PRD Section 24.
- [ ] Idempotent operations actually idempotent (payment create, generate-monthly).

**Quality:**
- [ ] Matches surrounding patterns; no duplication; typed; errors handled.
- [ ] No leftover AI/edit comments, no `console.log`, no magic numbers, no dead code.

**Verification:**
- [ ] Relevant tests exist and pass (payment formula if payments touched; isolation test per endpoint).
