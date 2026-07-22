---
name: deployment-check
description: Pre-deploy / release-readiness check for HOSTYLLO. Use before deploying or cutting a release to verify CI gates, infra gates, secrets hygiene, and the current phase's Definition of Done. Delegate to the devops agent for fixes.
---

# Deployment Check

Verify the system is safe to deploy. Read CI config and run the gate checks. Report a clear
**GO / NO-GO** with the blocking items.

## Steps
1. Confirm CI pipeline order intact: `lint-and-typecheck → unit-tests → infra-gates → deploy`.
2. Run/inspect each gate. Any failure = NO-GO with the specific blocker.
3. Walk the current phase's Definition of Done (`docs/docs/09_BUILD_STATE_v15.md`) against the
   actual code — report true status (the tracker is known to be stale).

## Gates (all must pass)
- [ ] Lint clean, incl. `hostyllo/require-with-tenant` + `hostyllo/no-hostel-id-from-request`.
- [ ] Typecheck clean.
- [ ] 14 payment tests pass; isolation tests pass for all endpoints.
- [ ] RLS on all tenant tables (`rowsecurity=false` → 0 rows).
- [ ] PITR enabled ≥ 7-day retention; Supabase NOT free tier; last backup < 48h (INVARIANT-6).
- [ ] No secrets in git: `git log -p | grep -iE "key|secret|password"` empty.
- [ ] `GET /api/v1/health` returns `db: ok`, `redis: ok`.
- [ ] Redis URL is `rediss://`; PgBouncer transaction mode; BullMQ stalled-job config set.
- [ ] Sentry receiving events with PII/secret filter active.

## Phase-1 DoD spot-checks
28 tables + RLS · CNIC encrypted (no plaintext column) · receipt counter concurrency-safe ·
BullMQ DLQ on all 7 queues · soft-delete excluded from lists.

Output: **GO** or **NO-GO** + the ordered list of blockers.
