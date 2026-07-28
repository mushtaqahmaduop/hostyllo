# Phase 2 Kickoff — Proposal for Founder Approval

> Written 2026-07-26 by the overnight session. **Nothing here has been built.** `CLAUDE.md` and
> `tasks/todo` both gate Phase 2 behind Phase 1's Definition of Done plus a full audit, so this is
> a document for you to approve, amend, or reject — not a licence that was self-granted.
>
> Everything below was checked against the code, not against the tracker.

---

## 1. Phase 1 vs the PRD's own entry gate

`docs/01_MASTER_PRD_v15.md` line 141: *"Phase 2 does not begin until every item below is checked.
No exceptions."* Assessed honestly:

| # | Gate item | State | Evidence |
|---|-----------|:-----:|----------|
| 1 | All 28 tables created with RLS enabled | ✅ | RLS CI gate asserts ENABLE **+ FORCE** on every public table, every run |
| 2 | `verify-pitr.sh` exits 0, logged | ❌ | Needs `SUPABASE_ACCESS_TOKEN` + Supabase Pro/PITR — **founder** |
| 3 | 14 payment unit tests pass in CI | ✅ | Unit Tests job, every run |
| 4 | Cross-tenant isolation for **every endpoint** | ⚠️ | Covers students, rooms, payments — **3 of 16 route modules**. See §2 |
| 5 | `withTenant()` ESLint rule active + blocking | ❌ | **The plugin is not loaded at all.** See §3 — this is the significant finding |
| 6 | `/health` returns `db: ok`, `redis: ok` | ✅ | Live since 2026-07-23 |
| 7 | bcrypt rounds ≥ 12 in auth integration test | ✅ | `auth.test.ts` |
| 8 | CNIC encrypted at rest, no plaintext column | ⚠️ | Code encrypts; live-DB verify + `backfill-cnic.mjs` outstanding — **founder** |
| 9 | Soft-delete excluded from list endpoints | ✅ | `soft-delete.test.ts` |
| 10 | Receipt counter atomic + concurrency tested | ✅ | `receipt-counter.test.ts` |
| 11 | BullMQ DLQ confirmed on **all 7 queues** | ⚠️ | `dlq.test.ts` proves the `moveToDLQ` mechanism once; not per-queue, and there are 5 workers, not 7. See §2 |
| 12 | Sentry receiving events | ✅ | `HOSTYLLO-API-2` arriving proves the pipeline |
| 13 | No secrets in git | ✅ / ⚠️ | Secrets Scan green; but `apps/api/.env` holds **live production credentials** in your working tree (gitignored, not committed) |

**Verdict: Phase 1 is not at DoD.** Two hard failures (#2, #5), three partials (#4, #8, #11).
The code backlog is closed; what remains is verification and your dashboard actions.

---

## 2. Gaps that are real work, not paperwork

**#4 — isolation coverage.** The gate says *every* endpoint. Today `isolation.test.ts` proves
`GET /students/:id`, `/rooms/:id`, `/payments/:id` return 404 across tenants. The other 13 route
modules (expenses, fines, transfers, cancellations, maintenance, complaints, checkin, notices,
users, settings, audit-log, dashboard, receipts) are unproven. With FORCE RLS live this is
*probably* fine — but "probably" is what the gate exists to eliminate. Suggested: a table-driven
test that walks every registered route and asserts A's token → B's id is 404. Roughly half a day.

**#11 — DLQ per queue.** `dlq.test.ts` proves the mechanism, not that each worker wires it up.
`CLAUDE.md` says every worker MUST call `moveToDLQ` on failure; that is currently a convention, not
a test. Suggested: one failure-injection test per worker. Note the PRD says 7 queues and the repo
has 5 workers — **that discrepancy needs resolving**; either the PRD is stale or two queues are
missing.

---

## 3. The significant finding — INVARIANT-2/3 are unenforced

`apps/api/eslint.config.js` registers only `@typescript-eslint`. It never loads
`eslint-plugin-hostyllo`, and `@hostyllo/config` is not a dependency of `apps/api`, so it could
not have. **`require-with-tenant` and `no-hostel-id-from-request` have never run in CI.**

CLAUDE.md states these two rules are the enforcement for INVARIANT-2 and INVARIANT-3. That claim
is currently false and should be corrected whichever way you decide.

Measured, not guessed (throwaway probe config, since deleted; `eslint.config.js` untouched):

- `require-with-tenant` → **90 errors**
- `no-hostel-id-from-request` → **0 errors** — INVARIANT-3 does appear genuinely respected

I did not wire it up, because doing so as `error` would simply redden CI. The rule matches any
`.query/.select/.insert/.update/.delete` member call, so most of the 90 are correct-by-design or
false positives: privileged-pool use in workers and the auth bootstrap (migration 010 defines two
connection identities on purpose), tests and `globalSetup`, and 2 hits in `lib/crypto.ts`, which
touches no database.

**Options — your call:**

- **(a) Scope it** — run the rules over `src/routes/**` only. Cheap, and routes are where
  INVARIANT-2 actually matters. Leaves workers unchecked.
- **(b) Refine it** — teach the rule the difference between `tenantPool` and the privileged `pool`,
  so it can police both routes and workers. Better enforcement, maybe a day of rule work.
- **(c) Drop the claim** — delete the rules and correct CLAUDE.md + the PRD to say INVARIANT-2/3
  are convention-enforced by review. Honest, and cheaper than a rule nobody trusts.

My recommendation: **(a) now** to close the gate item and get real coverage where it counts, with
**(b)** logged as follow-up. Avoid (c) — with 16 route modules and more coming in Phase 2, a
mechanical check on the tenant boundary earns its keep.

---

## 4. What the "full audit" gate should cover

`tasks/todo` line 18 requires a full audit before Phase 2. Proposed scope:

1. **Tenant boundary** — every route: does it go through `withTenant`, and is `hostel_id` taken
   from the JWT only? This is §3 done by hand, and the reason to prefer a rule.
2. **Authorization matrix** — the `chain_manager` inconsistency in §1.5 of `tasks/todo` is still
   open: student read/write excludes it while import/reveal-cnic include it. Decide and make it
   uniform.
3. **The 34 risks + 6 invariants** from the security architecture, re-checked against code.
4. **Migrations vs live schema** — `migrate.mjs` has a `schema_migrations` ledger, but the live DB
   was hand-migrated and baselined. Confirm they agree.
5. **Docs vs reality** — this session found two false claims (§3, and CLAUDE.md's line about
   `isolation.test.ts` living in `packages/db` when it is in `apps/api`). Assume more.
6. **Dependency + secret hygiene** — `.env` in the working tree with production credentials.

---

## 5. Proposed Phase 2 scope (from the PRD, unchanged)

Per `docs/01_MASTER_PRD_v15.md` line 301 and the module table at 313-318, Phase 1 ships only the
core modules; Phase 2 is the frontend completion phase, with these deferred to Phase 2/2.5:

Cancellations · Maintenance & Complaints · Reports & Annual Archive · Check-In/Out Log ·
Notices Board · Fines · Room inspections

Note the APIs for most of these already exist (16 route modules were built in Phase 1) — Phase 2 is
predominantly **frontend**, whose exit condition is *"Warden can manage an entire hostel entirely in
the browser, Lighthouse mobile > 90"*.

**This matters for sequencing:** the Vercel frontend deploy is currently red and untouched
(`tasks/todo` line 19). Phase 2 is mostly frontend work, so that deploy is a hard prerequisite,
not a side issue. I would fix it *first*.

---

## 6. Entry criteria I propose for actually starting Phase 2

1. PR #28 reviewed and merged (all Phase 1 code-backlog work).
2. Gate #5 resolved via §3 option (a), (b), or (c).
3. Gate #2 (PITR) and #8 (CNIC live verification) cleared — both founder actions.
4. Isolation coverage extended to all 16 route modules (§2).
5. Live secrets rotated (C3) and moved out of the working-tree `.env`.
6. Vercel frontend deploy green.
7. The 5-vs-7 queue discrepancy resolved.

Items 1, 4 and 7 I can do on your say-so. Items 2, 3, 5, 6 are yours.

---

## 7. Open questions

1. **§3 — which option?** This is the one blocking decision.
2. **`chain_manager` on student read/write** — add it, or keep it excluded deliberately?
3. **5 workers or 7 queues?** Which is right — the PRD or the repo?
4. **Frontend before backend Phase 2?** I think yes, per §5.
5. **Is `limit` clamping correct?** `students.ts` clamps an over-large limit to 100 rather than
   400-ing. I preserved existing behaviour, but if you would rather reject, say so and I will make
   it consistent across every paginated route.
