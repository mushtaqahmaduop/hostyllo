# ⚠️ SUPERSEDED — ENGINEERING AUDIT (CORRECTED 2026-07-22)

> **This document replaces the June 2026 "CRITICAL ENGINEERING AUDIT" (score 34/100,
> verdict "Code does not exist").** That audit was **factually incorrect**: it was generated
> by an AI agent (GitHub Copilot) that trusted the stale build tracker and the docs over the
> code, then reported "zero implementation" with claimed 100% confidence — on the very
> branch that contained ~1,900 lines of route code, 7 migrations, 6 workers, and a passing
> 14-test payment suite.
>
> **Ground truth for build state:** `docs/09_BUILD_STATE_v15.md` (reconciled 2026-07-22).
> **Do NOT treat the original audit's "MISSING" claims as fact.** They are preserved only as
> a lesson at the bottom of this file.

---

## What the original audit got WRONG (verified against code, 2026-07-22)

| Original claim | Verified reality |
|---|---|
| "routes/ EMPTY — auth, students, rooms, payments not implemented" | 6 route files, 1,899 lines total (payments.ts alone = 546) |
| "packages/db/migrations EMPTY" | 7 migrations, full 28-table schema with RLS declarations |
| "Payment tests: 0 exist (14 required)" | `paymentService.test.ts` exists; **14/14 pass** (run 2026-07-22) |
| "JWT authentication not implemented" | `routes/auth.ts` (367 lines: login/refresh/logout/reset/TOTP) + `middleware/auth.ts` |
| "Workers imported but empty (5 claimed)" | 6 worker files: auto-cancel, billing-sync, email-send, pdf-receipts, rent-generate, dlq |
| "No database connection pooling" | `lib/db.ts` uses `pg.Pool({ max: 25 })` |
| "No input validation exists" | JSON-Schema validation with `additionalProperties:false` on payments/rooms/expenses (students routes DO lack schemas — partially valid) |
| "Redis client / db pool / auth middleware MISSING" | `lib/redis.ts`, `lib/db.ts`, `lib/jwt.ts`, `lib/bullmq-redis.ts`, `middleware/auth.ts` all exist |

**Root cause of the false audit:** the tracker (`09_BUILD_STATE_v15.md`) still said "Phase 0 —
nothing built." The auditing agent resolved the docs↔code contradiction in the wrong
direction — believing the docs and "confirming" empty directories it never actually read.

---

## What the original audit got RIGHT (all verified 2026-07-22 — KEEP these)

These five findings are real and are now tracked in `tasks/todo`:

1. **TypeScript strict mode disabled** — `apps/api/tsconfig.json:8` has `"strict": false`.
   For a codebase doing money math, enable full strict + `tsc --noEmit` CI gate.
2. **`/health` endpoint is hardcoded** — `server.ts` returns `{ db: 'ok', redis: 'ok' }`
   unconditionally. A real `dbHealthCheck()` already exists in `lib/db.ts` but is never called.
   Wire it (and a Redis ping) in, or the Phase 1 gate "`/health` returns db: ok" is meaningless.
3. **No global error handler** — zero `setErrorHandler` in `apps/api`. Unhandled errors leak
   stack traces / return unstructured 500s.
4. **No rate limiting** — the tracker requires 10 attempts/15min/IP on login (`rl:login:{ip}`);
   nothing implements it.
5. *(Missed by the audit, found during verification)* **TLS verification disabled to the DB** —
   `lib/db.ts` sets `ssl: { rejectUnauthorized: false }`. Production Postgres traffic is open to
   MITM. Use the provider CA instead.

Also directionally correct: the closing advice — *stop expanding documentation, ship one
complete vertical feature at a time* — stands, and matches the reconciled plan in
`09_BUILD_STATE_v15.md`.

---

## Lesson (for every agent reading this repo)

- **Never trust the tracker or the docs over the code.** Inspect files before declaring them
  missing. The original audit shipped fabricated evidence (an invented `server.ts` listing)
  with "Confidence: Very High (100%)".
- An AI audit that doesn't cite verifiable file/line evidence is a narrative, not an audit.
- This file previously existed in two diverged copies (`docs/` and `docs/`); the root
  copy was deleted 2026-07-22. This is the only canonical version.

---

*Corrected 2026-07-22 · Original audit: June 2026, commits `be7f5b3`/`3502eaf` (available in git history)*
