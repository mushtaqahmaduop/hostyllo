# HOSTYLLO — Engineering Operating System

> Auto-loaded by Claude Code every session. This is the behavioral contract for the
> HOSTYLLO engineering team (architect, backend, frontend, database, security, devops, qa).
> **PRD authority:** `docs/01_MASTER_PRD_v15.md`. If anything here conflicts with the PRD, the PRD wins.
> **UI authority:** `docs/15_UI_SPEC_v1.md` — appearance only; behaviour still follows the PRD.
> It supersedes `docs/04_UX_DESIGN_SYSTEM.md`'s palette, tokens and type (the gold/teal dark-first
> system is dead). Tokens live in `apps/web/src/styles/tokens.css`; a hardcoded hex, px font-size or
> ms duration in a component is a build failure. Read §16 (hard NO list) before generating any screen.
> **Deep reference:** `docs/06_CLAUDE_MD_v15.md` (full stack/queue/redis/env tables).

---

## WHAT WE ARE BUILDING

HOSTYLLO — a multi-tenant SaaS hostel-management platform for Pakistan (global-ready).
- Each hostel = one isolated tenant. Isolation enforced at PostgreSQL Row Level Security (RLS).
- Source of all business logic: a 12,000-line Electron desktop app live at 50+ real hostels.
- **Do not reinvent logic that exists in the Electron app — port it verbatim.**

---

## ⚠️ GROUND TRUTH — READ FIRST (reconciled 2026-07-22, session 3)

**Rule:** Never trust the tracker over the code. Inspect the code, then reconcile the tracker.
The tracker (`docs/09_BUILD_STATE_v15.md`) has drifted more than once — always verify.

Current reality (Phase 1, code ~95% authored, gated on live-DB verification):
- 11 DB migrations (`packages/db/migrations/001–011`) — the 28-table schema + FORCE-RLS/app-role
  + function hardening. ⚠️ Live **production has no `schema_migrations` ledger** (hand-migrated,
  never baselined) and carries a legacy `users.totp_secret` column that a migrated-from-scratch DB
  does not have — staging and prod schemas are NOT identical. See `docs/AUDIT_2026-07-27.md`.
- `packages/db`: canonical `withTenant.ts` (single pool layer), `paymentService.ts`, `formatters.ts` + tests.
- `apps/api`: full Fastify server, **16 route modules** (auth, students, rooms, payments, expenses,
  dashboard, cancellations, maintenance, complaints, checkin, notices, transfers, fines, users,
  settings, audit-log) totalling 65 endpoints, auth middleware, global error handler, and
  **4 workers** (auto-cancel, billing-sync, email-send, rent-generate) plus the `dlq.ts` helper.
  The "7 queues" in `docs/06_CLAUDE_MD_v15.md` counts two WhatsApp queues that are not built — a
  Phase-2 feature, not missing Phase-1 work.
  ⚠️ **No BullMQ *producer* exists anywhere in `apps/api`** — only `Worker` is ever constructed, so
  none of the four receives a job. Under investigation; see `tasks/todo`.
  `pdf-receipts` was deleted 2026-07-28: receipts are rendered on demand by
  `GET /payments/:id/receipt`. See `docs/05_API_SPECIFICATION.md` Module 4 for why.
- `packages/config/eslint-plugin-hostyllo` (withTenant + no-hostel-id-from-request rules).
- `tsc --strict` clean; 14/14 payment unit tests green.

### Status of prior known defects — ALL FIXED (see tasks/todo + git log)
- The 4 payment defects (leftover comment · `extra_charges` dropped · PATCH `[]` recalc ·
  missing `audit_log`) → FIXED (commit `ef4bbbc`).
- The 5 ARB-audit critical blockers C1–C4 (RLS not FORCEd · weak ENCRYPTION_KEY · secrets
  hygiene · broken PITR gate) → FIXED IN CODE (mig 010 + lib/env.ts + .env.example +
  verify-pitr.sh); ⚠️ **C1/C3/C4 need founder live-DB/secret-store steps** — see
  `docs/ENGINEERING_AUDIT_ARB_2026-07-22.md` + `tasks/todo §1.8`.

### Current open work (in priority order)
See `tasks/todo`: remaining audit majors (M2–M5 in progress), CNIC plaintext encryption
(last Phase-1 code item), and the live-DB verification gate.

---

## THE 6 INVARIANTS — NEVER VIOLATE

```
INVARIANT-1  jwtVerify uses algorithms: ['RS256'] ONLY — never HS256
INVARIANT-2  withTenant() wraps EVERY tenant-table query — no raw queries
INVARIANT-3  hostel_id comes from JWT (req.hostelId) ONLY — never body/params/query
INVARIANT-4  Money columns are NUMERIC(10,2) ONLY — FLOAT is forbidden
INVARIANT-5  audit_log is INSERT-ONLY — never UPDATE, never DELETE
INVARIANT-6  Supabase PITR active before any client data — Free tier forbidden in prod
```

**How each is actually enforced (do not overstate):** INVARIANT-2 & 3 are the only two checked
by the ESLint plugin (`packages/config/eslint-plugin-hostyllo`), and only over
`apps/api/src/routes/**` — workers and the pre-auth bootstrap use the privileged pool by design
(migration 010 defines two connection identities), so the rules would report ~90 correct-by-design
calls if run workspace-wide. The handful of privileged queries inside `src/routes` carry a
line-level `eslint-disable` with a justification, and an exception that stops being needed fails
the build (`reportUnusedDisableDirectives: 'error'`). The rules run in CI via `pnpm run lint` and
have their own regression tests (`packages/config/eslint-plugin-hostyllo/index.test.js`) — until
2026-07-27 the plugin was never loaded by any ESLint config, so both rules had in fact never run.
INVARIANT-1 is enforced in
`lib/jwt.ts` (`algorithms:['RS256']`); INVARIANT-4 by the schema; INVARIANT-5 by a DB trigger
(`audit_log_immutable`, migration 006) + FORCE RLS (migration 010); INVARIANT-6 is operational
(verify with `scripts/verify-pitr.sh`). The broader rules 1–30 live in `docs/06_CLAUDE_MD_v15.md`
(the 6 above are the non-negotiable core, not the full list).

The `withTenant()` pattern (`packages/db/src/withTenant.ts`) and the payment formula
(`packages/db/src/paymentService.ts`) are architectural cornerstones — do not modify without
re-running the full test suite.

---

## THE ENGINEERING TEAM (subagents in `.claude/agents/`)

Delegate to the right specialist. One focused task per agent. The orchestrator (main thread)
owns integration and final review.

| Agent | Use it for | Posture |
|-------|-----------|---------|
| `architect` | System design, phase/scope decisions, doc reconciliation, trade-offs, migration strategy | Plans, does not bulk-edit |
| `backend` | Fastify routes, auth, services, BullMQ workers, business logic | Implements + tests |
| `frontend` | Next.js screens, components, design-token fidelity, mobile-first, a11y | Implements UI |
| `database` | Migrations, RLS, indexes, query performance, schema integrity | Implements DB |
| `security` | Audits against the 34 risks + 6 invariants, IDOR/tenant-isolation, secrets | Finds + patches |
| `devops` | CI/CD, Railway/Vercel/Supabase config, env/secrets, observability, releases | Config + pipelines |
| `qa` | Test strategy, the 14 payment tests, cross-tenant isolation tests, regression | Writes + runs tests |

**Routing rule:** security and database changes must be reviewed by their specialist agent before merge.
Anything touching `payments`, `withTenant`, RLS, or auth requires the relevant invariant test to pass.

## REUSABLE WORKFLOWS (skills in `.claude/skills/`)

`code-review` · `security-audit` · `ui-review` · `database-review` · `deployment-check` · `refactor-plan`
Invoke a skill with the Skill tool (e.g. `/security-audit`) when its procedure fits the task.

---

## SESSION START PROTOCOL (non-negotiable)

```
1. Read tasks/lessons (internalize prior lessons)
2. Inspect the CODE for the area you're touching — do NOT trust the tracker
3. State the session goal in ONE sentence
4. Write the plan to tasks/todo with checkable items
5. Only then write code
```

## WORKFLOW (every task)

1. **Understand** — read the relevant code + PRD requirement ID (e.g. FR-PAY-02). No guessing.
2. **Plan** — problem statement, affected files, risks, solution. Plan mode for 3+ step work.
3. **Implement** — minimal, production-grade, matches surrounding patterns. No hacks, no magic numbers.
4. **Verify** — lint, typecheck, unit tests, the invariant tests below. Never mark done unproven.
5. **Review** — re-read as a security engineer before declaring complete.

## VERIFICATION GATES

```bash
# If payment code was touched — all 14 must pass, zero partial credit
pnpm --filter @hostyllo/db exec vitest run src/__tests__/paymentService.test.ts

# Cross-tenant isolation — after EVERY endpoint: A's JWT → B's data MUST return 404 (not 403/200).
# Needs a LOCAL Postgres + Redis: globalSetup refuses any non-localhost DATABASE_URL, because it
# applies every migration and seeds tenants. Without a DB the suite SKIPS and still exits 0 —
# a green run proves nothing unless the log says the tests ran. CI is the real gate.
pnpm --filter @hostyllo/api exec vitest run src/__tests__/isolation.test.ts

# RLS must be ENABLE + FORCE on every tenant table. ENABLE alone lets the owner bypass it.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-rls-ci.sql
```

## CODE QUALITY

Readable · typed · no duplication · errors handled · follows existing patterns.
Reject: temporary hacks, quick fixes, magic numbers, unnecessary complexity, leftover AI/edit comments.

## GIT DISCIPLINE

Commit after every working unit (endpoint/migration/component) — not batched.
`git commit -m "feat: <exactly what was built>"`. `Develop` is the default/integration branch;
branch off it and PR into it — never force-push a shared branch. Commit/push only when the user asks.

---

## PHASE DISCIPLINE (solo founder)

Active phases 0–6 (24 months). Phases 7–8 DEFERRED until MRR > PKR 500k/mo + a hire.
Do not build, design, or discuss deferred features (Stripe/USD, ML rent suggestion, NLP search,
native apps, offline SQLite before Phase 5, student portal) until the trigger is met.
If asked to build a deferred item, state the trigger first.

**Phase 1 is the current frontier.** Ship Phase 1 to its Definition of Done
(`docs/09_BUILD_STATE_v15.md`) before any Phase 2 scope.

---

## TECH STACK (locked — change only via PRD update)

Next.js 14 (Vercel) · Fastify 4 (Railway) · PostgreSQL/Supabase + RLS (Mumbai ap-south-1) ·
Redis (Railway, `redis://` private net) · BullMQ · JWT RS256 · Vitest/Playwright/k6 · Sentry + uptime probe.
PgBouncer **transaction mode** (required for `withTenant()` — never session mode).

Full stack/queue/redis-key/env tables: `docs/06_CLAUDE_MD_v15.md`.

*Update this file after any significant architectural change.*
