# HOSTYLLO — Build State
## 09_BUILD_STATE_v15.md
## Live Task Tracking — Updated Each Claude Code Session
## v15.0 · Created May 2026
### Classification: Confidential — Founder Only

---

> **How to use this document:**
> Open this file at the START of every Claude Code session.
> Read the "CURRENT STATUS" section and "NEXT SESSION" section.
> Update this file at the END of every session.
> Every task starts as ⬜ TODO. Mark ✅ DONE only when Definition of Done is fully met.
> Never mark a task done if the verification step has not passed.

> **How to open a Claude Code session:**
> ```
> "Read docs/09_BUILD_STATE_v15.md and docs/06_CLAUDE_MD_v15.md in full before doing anything.
>  Report back: what phase are we in, what is the last completed task, what is the next task?"
> ```

---

## CURRENT STATUS

| Field | Value |
|-------|-------|
| **Active Phase** | Phase 1 — Cloud API Foundation (**DEPLOYED LIVE on Railway**; tenant isolation live-verified in production) |
| **Overall Progress** | Phase 1 API + db lib + ALL endpoints exist, tsc strict-clean · **C1–C4 + M1–M5 audit findings all fixed** · CNIC encrypted · migrations 008–011 applied live to Supabase · **DEPLOYED LIVE on Railway (Develop), health green (`db:ok, redis:ok`); app runs as `hostyllo_app` — isolation live-proven in prod; Sentry + uptime monitoring wired; CI green; main synced** |
| **Last Session** | 2026-07-23 (sessions 6–7) — Built the **staging→production pipeline** (prod=`main`, staging=`Develop` on separate Supabase `ljnuwmfnpofzlmioskfc` + own Redis; `protect-main` gates on **Lint and Test + Staging Smoke Test**; per-env branch set via Railway GraphQL `deploymentTriggerUpdate`, NOT `service source connect` which is service-global). Separated Sentry envs via `SENTRY_ENVIRONMENT`; replaced flapping Sentry-Crons uptime with **UptimeRobot** (external, 5-min) on a new `/api/v1/ready` (503-when-unhealthy) probe. Added Phase-1 verification tests + generated DB types. See `14_DEPLOYMENT_RUNBOOK.md`. |
| **Last Completed Task** | Phase-1 verification gate: `soft-delete` + `receipt-counter` concurrency + `dlq` round-trip tests (CI-green), **fixed a silent DLQ bug** (moveToDLQ wrote non-existent columns), generated Supabase DB types |
| **Next Task** | Founder must do the 2 real go-live blockers: **(1) enable Supabase PITR/Pro on prod** (INVARIANT-6; `verify-pitr.sh` exit 0) and **(2) rotate live secrets (C3 — NOT `ENCRYPTION_KEY`)**. Then: verify DLQ wired into each worker → full audit → Phase 2. |
| **Blocking Issues** | None blocking the API — live on Railway with staging/prod pipeline + UptimeRobot + Sentry. Go-live blockers before real customer data: **PITR (C4/INVARIANT-6)** + **secret rotation (C3)**. Frontend (`apps/web`) not built = Phase 2; Vercel red is expected (empty app). |
| **Suite Version** | v15.0 |
| **PRD Authority** | docs/01_MASTER_PRD_v15.md |

---

## ⚠️ RECONCILIATION NOTE (2026-07-22)

This tracker previously declared **"Phase 0 — NOT STARTED, nothing built."** That was false.
The repo already contains the Phase 1 skeleton (7 migrations, `packages/db` with passing
payment tests, auth/students/rooms/payments/expenses/dashboard routes, 6 workers, eslint
invariant plugin, CI + infra config). The checkboxes below have been reconciled against the
**actual code** as of this date.

**Status legend (reconciled):**
```
✅ DONE            — verified complete (Definition of Done met, or test run green)
🟡 CODE EXISTS     — authored in repo, NOT yet verified against DoD (no live DB / CI / deploy proof)
⬜ TODO            — not started (no code in repo)
🐞 EXISTS-BUGGY    — code exists but has a known open defect (see defect list)
```
> `🟡` is the honest state of most Phase 1 code: it is written and compiles, but "done" per this
> tracker's own rule requires tests green in CI, RLS verified live, and cross-tenant isolation
> proven. Do not upgrade 🟡 → ✅ without running the verification gate.

---

## INVARIANTS — NEVER VIOLATE (hardcoded reminder)

```
INVARIANT-1: algorithms: ['RS256'] ONLY in jwtVerify() — never HS256
INVARIANT-2: withTenant() wraps EVERY DB query — no exceptions
INVARIANT-3: hostel_id from JWT only — never from body/params/query
INVARIANT-4: Payment amounts: NUMERIC(10,2) only — never FLOAT
INVARIANT-5: audit_log: INSERT only — never UPDATE or DELETE
INVARIANT-6: Supabase PITR active before any client data
```

---

## PRE-WORK CHECKLIST (Before Writing Code)

These have external approval timelines. Must be tracked from Day 1.

| Item | Status | Date Submitted | Expected Completion |
|------|:------:|:--------------:|:-------------------:|
| Apply for Meta WhatsApp Business API (via 360dialog) | ⬜ TODO | — | 4–8 weeks after submission |
| Apply for Paymob merchant account | ⬜ TODO | — | 1–3 business days after submission |
| Generate JWT RS256 keypair (`openssl genrsa`) | ⬜ TODO | — | Immediate |
| Add JWT keypair to Railway env vars | ⬜ TODO | — | Immediate |
| Delete local `.pem` files after uploading to Railway | ⬜ TODO | — | Immediately after above |

---

## PHASE 0 — INFRASTRUCTURE SETUP

**Exit condition: `verify-pitr.sh` exits 0. CI green on empty repo.**

> **Reconciled 2026-07-22:** Infra *config* is authored in the repo — `.github/workflows/ci.yml`,
> `railway.toml`, `railpack.json`, and `scripts/verify-pitr.sh` all exist (🟡). Everything that
> requires a live cloud account (Supabase PITR, Railway plan, Upstash, Vercel domains, GitHub
> branch protection, Sentry, Uptime Robot, secrets) **cannot be verified from the repo** and is
> left ⬜ pending founder confirmation. If already provisioned, the founder should tick these
> manually — Claude cannot see external dashboards.

### Railway

| Task | Status |
|------|:------:|
| Pro plan active with billing confirmed | ⬜ TODO |
| Backend service created (`hostyllo-api`) | ⬜ TODO |
| Railway cron jobs configured (auto-cancellations, rent-generate) | ⬜ TODO |
| Auto-scaling rules: CPU > 70% → add replica (max 5) | ⬜ TODO |

### Supabase

| Task | Status |
|------|:------:|
| Pro plan — NOT free tier | ⬜ TODO |
| PITR enabled, 7-day retention confirmed | ⬜ TODO |
| `./scripts/verify-pitr.sh` exits 0 — **LOGGED WITH TIMESTAMP** | 🟡 script authored — needs live Supabase to run |
| PgBouncer in transaction mode (NOT session mode) | ⬜ TODO |

### Upstash Redis

| Task | Status |
|------|:------:|
| Database created | ⬜ TODO |
| Connection URL confirmed starting with `rediss://` (TLS) | ⬜ TODO |
| `redis-cli ping` returns PONG | ⬜ TODO |

### Vercel

| Task | Status |
|------|:------:|
| `app.hostyllo.app` project created with custom domain | ⬜ TODO |
| `admin.hostyllo.app` project created with custom domain | ⬜ TODO |

### GitHub

| Task | Status |
|------|:------:|
| Repository created (private) | ⬜ TODO |
| Branch protection on `main` (require PR + CI pass) | ⬜ TODO |
| Direct push to `main` rejected (verified) | ⬜ TODO |

### CI / Monitoring

| Task | Status |
|------|:------:|
| GitHub Actions `ci.yml`: `lint-and-typecheck → unit-tests → infra-gates → deploy` | 🟡 CODE EXISTS (`.github/workflows/ci.yml` authored — green run unverified) |
| Empty repo: first green CI run confirmed | ⬜ TODO |
| Sentry project `hostyllo-api` created with PII filter active | ⬜ TODO |
| Test error thrown → appears in Sentry within 60 seconds | ⬜ TODO |
| Uptime Robot monitor on `GET /health` → SMS alert to phone | ⬜ TODO |
| Test alert fires correctly | ⬜ TODO |

### Secrets

| Task | Status |
|------|:------:|
| All secrets from PRD Section 23 added to Railway and Vercel | ⬜ TODO |
| `git log -p \| grep -iE "key\|secret\|password"` returns EMPTY | ⬜ TODO |

**Phase 0 DONE when:** All items above checked ✅ AND `verify-pitr.sh` logged with timestamp.

---

## PHASE 1 — CLOUD API FOUNDATION

**Do not start Phase 1 until all Phase 0 items are ✅ DONE.**

**Exit condition (ALL must be checked — no partial credit):**

| Gate | Status |
|------|:------:|
| All 28 tables with RLS enabled | ✅ **LIVE-VERIFIED 2026-07-22** — all 28 `ENABLE` **and `FORCE`** (migration 010); `verify-rls.sql` returns 0 rows |
| `verify-pitr.sh` returns exit 0 | 🟡 script fixed (uses SUPABASE_ACCESS_TOKEN now); needs a PAT + PITR add-on to run |
| All 14 payment unit tests pass in CI | ✅ **CI-GREEN** (run 29920423462, 14/14) |
| Cross-tenant isolation test passes on every endpoint (JWT A → data B → 404) | ✅ **DONE — proven live AND CI-green** (isolation.test.ts 10/10 in CI, app connects as RLS-constrained hostyllo_app; + live MCP proof) |
| `withTenant()` ESLint rule active and blocking violations in CI | ✅ **CI-GREEN** — lint job passes with the hostyllo rules |
| `/health` returns `db: ok` and `redis: ok` | ✅ CODE DONE — probes `dbHealthCheck()` + `redis.ping()`, 503 if either down |
| bcrypt rounds ≥ 12 in auth integration test | ✅ **CI-GREEN** — auth.test.ts asserts cost-12 on the seeded hash |
| CNIC encrypted — plaintext `cnic` column must not exist in DB | ✅ **FIXED** — `lib/crypto.ts` AES-256-GCM; POST/import encrypt, reveal decrypts; `scripts/backfill-cnic.mjs` for legacy rows |
| Soft-delete verified on all list endpoints | ✅ **CI-GREEN** — `soft-delete.test.ts`: DELETE → row survives with `deleted_at`+`status='vacated'`, hidden from list/detail (even when status=vacated is queried) |
| Receipt counter atomic function deployed and concurrency-tested | ✅ **CI-GREEN** — `receipt-counter.test.ts`: 50 concurrent `get_next_receipt_number()` calls → unique + gap-free 1..N |
| BullMQ DLQ confirmed on all 7 queues | 🟡 `dlq.test.ts` proves `moveToDLQ()` round-trips into `dlq_jobs` (CI-green) + **FIXED a silent bug** (it wrote non-existent columns job_data/error_message → every insert failed). Still ⬜: confirm `moveToDLQ` is wired into each of the 5 real workers' failed handlers |
| Sentry receiving events | ✅ **VERIFIED LIVE** 2026-07-23 (events in project `hostyllo-api`; staging vs prod separated via `SENTRY_ENVIRONMENT`) |
| No secrets in git | ✅ verified — `.env` git-ignored, never committed; CI secrets-scan active. ⚠️ live creds still need rotation (C3) since they sat in a working-tree `.env` |

### Monorepo Setup

| Task | Status |
|------|:------:|
| `pnpm workspaces` + Turborepo configured | 🟡 CODE EXISTS (`pnpm-workspace.yaml`, `turbo.json`) |
| `apps/web`, `apps/api`, `apps/admin`, `packages/db`, `packages/ui`, `packages/config` | 🟡 CODE EXISTS (api populated; web/admin are placeholders) |
| `packages/config/eslint-plugin-hostyllo` with both rules | 🟡 CODE EXISTS (both `withTenant` + `no-hostel-id-from-request` rules present) |

### Database — 28 Tables + RLS (Build in Order)

| Task | Status |
|------|:------:|
| Migration 001: `hostels`, `users` + RLS | 🟡 CODE EXISTS (`001_hostels_users.sql`) |
| Migration 002: `students`, `rooms`, `beds` + RLS + GIN indexes | 🟡 CODE EXISTS (`002_students_rooms.sql`) |
| Migration 003: `payments`, `payment_extra_charges`, `expenses`, `owner_transfers`, `fines` + RLS | 🟡 CODE EXISTS (`003_payments_finance.sql`) |
| Migration 004: `cancellations`, `room_shifts`, `maintenance_requests`, `complaints`, `checkin_log`, `notices` + RLS | 🟡 CODE EXISTS (`004_operations.sql`) |
| Migration 005: `room_inspections`, `bill_splits` + RLS | 🟡 CODE EXISTS (`005_inspections_billsplits.sql`) |
| Migration 006: `subscriptions`, `audit_log`, `receipt_counter`, `warden_shift_log`, `dlq_jobs` + RLS | 🟡 CODE EXISTS (`006_system_tables.sql`) |
| Migration 007: `feedback`, `nps_responses`, `onboarding_events`, `referral_payouts`, `api_keys` + RLS | 🟡 CODE EXISTS (`007_product_tables.sql`) |
| Migration 008: `uq_payments_student_month` partial unique index (rent idempotency) | 🟡 CODE EXISTS (`008_payments_unique_month.sql`) — ⚠️ must be applied to live DB |
| Migration 009: users `totp_secret_enc`/`totp_backup_codes`/`display_name`/`theme`/`language` + `hostels.tagline` (fixes auth + pdf-receipt runtime crashes) | 🟡 CODE EXISTS (`009_users_hostels_missing_columns.sql`, session 3) — ⚠️ must be applied to live DB |
| `get_next_receipt_number()` PL/pgSQL function deployed | 🟡 CODE EXISTS (called by payments/rent-generate — deployment unverified) |
| Dashboard aggregation SQL (single CTE query — not 5 separate SELECTs) | 🟡 CODE EXISTS (`dashboard.ts` — verify single-CTE) |
| CI check: `SELECT tablename WHERE rowsecurity=false` → fails build if any row returned | ⬜ TODO (verify wired into ci.yml) |

### packages/db — Core Library

| Task | Status |
|------|:------:|
| `withTenant.ts` implementation | 🟡 CODE EXISTS |
| TypeScript types generated from schema | ✅ `packages/db/src/database.types.ts` (generated via Supabase MCP; ready for the Phase 2 frontend) |
| `paymentService.ts`: `calculateUnpaid()` ported verbatim from Electron | 🟡 CODE EXISTS |
| `paymentService.test.ts`: all 14 test cases passing in CI | ✅ 14/14 PASS locally (2026-07-22) — CI run still to confirm |
| `formatters.ts`: `fmtCnic()` + `fmtPhone()` ported verbatim | 🟡 CODE EXISTS (`formatters.ts`) |

### Authentication Endpoints

| Task | Status |
|------|:------:|
| `POST /api/v1/auth/login` (bcrypt 12 rounds, RS256, TOTP check) | 🟡 CODE EXISTS |
| `POST /api/v1/auth/refresh` (rolling rotation, jti blocklist) | 🟡 CODE EXISTS |
| `POST /api/v1/auth/logout` (invalidate all tokens) | 🟡 CODE EXISTS |
| `POST /api/v1/auth/reset-password` (6-digit OTP, 5-attempt limit) | 🟡 CODE EXISTS |
| `POST /api/v1/auth/totp/setup` | 🟡 CODE EXISTS |
| `POST /api/v1/auth/totp/verify` | 🟡 CODE EXISTS |
| JWT middleware: RS256 verify + jti blocklist + role from DB | 🟡 CODE EXISTS (`middleware/auth.ts`, `lib/jwt.ts`) |
| Rate limit middleware: 10 attempts/15min/IP (Redis `rl:login:{ip}`) | ✅ CODE DONE (session 3) — `rl:login:{ip}` 10/15min → 429 in auth.ts login |
| Security headers: CSP + HSTS + X-Frame-Options on every response | 🟡 CODE EXISTS (`helmet` registered in `server.ts` — CSP/HSTS config to verify) |

### Student Endpoints

| Task | Status |
|------|:------:|
| `GET /api/v1/students` (pg_trgm search, < 200ms) | 🟡 CODE EXISTS (perf unverified) |
| `POST /api/v1/students` (CNIC encrypt, photo validate, bed assignment) | 🟡 CODE EXISTS (verify CNIC encryption) |
| `GET /api/v1/students/:id` | 🟡 CODE EXISTS |
| `PATCH /api/v1/students/:id` | 🟡 CODE EXISTS |
| `DELETE /api/v1/students/:id` (soft delete) | 🟡 CODE EXISTS |
| `POST /api/v1/students/import` (CSV, formula sanitization) | 🟡 CODE EXISTS (2026-07-22: multipart CSV, preview/confirm, formula-injection strip, trial 30-cap) |
| `GET /api/v1/students/:id/reveal-cnic` (audited reveal) | 🟡 CODE EXISTS (2026-07-22 — ⚠️ CNIC stored PLAINTEXT, encryption still TODO) |
| `GET /api/v1/students/search` | 🟡 CODE EXISTS |
| Cross-tenant isolation test on every student endpoint | 🟡 `isolation.test.ts` exists — needs live DB to run |

### Room & Bed Endpoints

| Task | Status |
|------|:------:|
| `GET /api/v1/rooms` | 🟡 CODE EXISTS |
| `POST /api/v1/rooms` | 🟡 CODE EXISTS |
| `PATCH /api/v1/rooms/:id` | 🟡 CODE EXISTS |
| `DELETE /api/v1/rooms/:id` (blocked if active occupants → RM_002) | 🟡 CODE EXISTS (verify RM_002 guard) |
| `POST /api/v1/rooms/shift` | 🟡 CODE EXISTS |
| `PATCH /api/v1/rooms/bulk-fee` (not in original list — extra endpoint) | 🟡 CODE EXISTS |
| Bed CRUD endpoints | ✅ RESOLVED 2026-07-22: per API spec Module 3, beds are folded into rooms — no separate bed CRUD exists or is required |
| Cross-tenant isolation test on every room endpoint | ⬜ TODO |

### Payment Endpoints

| Task | Status |
|------|:------:|
| `GET /api/v1/payments` | 🟡 CODE EXISTS |
| `POST /api/v1/payments` (idempotency key, X-Idempotency-Key Redis 24h) | 🟡 CODE EXISTS — defects FIXED (commit ef4bbbc): extra_charges persisted, audit_log on create |
| `PATCH /api/v1/payments/:id` | 🟡 CODE EXISTS — defect FIXED: recalcs with real DB extras + Number() coercion; audit_log on edit |
| `POST /api/v1/payments/generate-monthly` (idempotent) | 🟡 CODE EXISTS |
| `GET /api/v1/payments/defaulters` | 🟡 CODE EXISTS |
| `GET /api/v1/payments/summary` | 🟡 CODE EXISTS |
| `POST /api/v1/payments/:id/void-request` | 🟡 CODE EXISTS as `PATCH /:id` (voidRequest) + `POST /:id/void-confirm` — route name differs from tracker; audit_log on void-request + void-confirm NOW present (ef4bbbc) |
| `POST /api/v1/payments/:id/send-receipt` | 🟡 CODE EXISTS |
| Cross-tenant isolation test on every payment endpoint | ⬜ TODO |

### Finance Endpoints

| Task | Status |
|------|:------:|
| `GET/POST/PATCH/DELETE /api/v1/expenses` | 🟡 CODE EXISTS (+ `GET /expenses/summary`) |
| `GET/POST/PATCH/DELETE /api/v1/transfers` | 🟡 CODE EXISTS (2026-07-22, with audit_log on all mutations) |
| `GET/POST/PATCH/DELETE /api/v1/fines` | 🟡 CODE EXISTS (2026-07-22, incl. mark-paid/unpaid + audit_log) |

### Operations Endpoints

| Task | Status |
|------|:------:|
| `GET/POST/PATCH /api/v1/cancellations` | 🟡 CODE EXISTS (2026-07-22, student → 'vacating' on create) |
| `POST /api/v1/cancellations/:id/confirm` | 🟡 CODE EXISTS (2026-07-22, vacates student + frees bed + audit) |
| `POST /api/v1/cancellations/:id/restore` | 🟡 CODE EXISTS (2026-07-22, reactivates student + audit) |
| `GET/POST/PATCH /api/v1/maintenance` | 🟡 CODE EXISTS (2026-07-22, priority sort, resolved_at/by stamping) |
| `GET/POST/PATCH /api/v1/complaints` | 🟡 CODE EXISTS (2026-07-22) |
| `GET/POST /api/v1/checkin` | 🟡 CODE EXISTS (2026-07-22) |
| `GET/POST /api/v1/notices` | 🟡 CODE EXISTS (2026-07-22, + PATCH/DELETE, expiry filtering) |

### System Endpoints

| Task | Status |
|------|:------:|
| `GET /api/v1/dashboard/stats` (single CTE < 200ms) | 🟡 CODE EXISTS (verify single-CTE + perf) |
| `GET /api/v1/dashboard/alerts` | 🟡 CODE EXISTS |
| `GET/POST/PATCH/DELETE /api/v1/users` | 🟡 CODE EXISTS (2026-07-22: bcrypt 12, USER_EMAIL_TAKEN/SELF_DELETE/LAST_OWNER guards, audit; ⚠️ spec's can_edit/can_delete/can_settings flags NOT in schema) |
| `GET/PATCH /api/v1/settings/hostel-info` | 🟡 CODE EXISTS (2026-07-22 on real hostels columns; ⚠️ spec's tagline/brandColor/showBranding NOT in schema) |
| `GET /api/v1/audit-log` (+ `/:entityId`) | 🟡 CODE EXISTS (2026-07-22, actor join, CNIC keys stripped from old/new values) |
| `GET /api/v1/health` | ✅ CODE DONE (session 3) — real `dbHealthCheck()` + `redis.ping()`, 503 if either down |

### BullMQ Workers (All 7)

| Task | Status |
|------|:------:|
| `pdf-receipts` queue + worker (puppeteer → PDF → Supabase Storage) | 🟡 CODE EXISTS (`workers/pdf-receipts.ts`) |
| `whatsapp-notifications` queue + worker | ⬜ TODO (no worker file — Phase 3 copy-paste tier; full 360dialog is Phase 5) |
| `email-notifications` queue + worker (Resend) | 🟡 CODE EXISTS (`workers/email-send.ts`) |
| `auto-cancellations` queue + worker (Railway cron nightly) | 🟡 CODE EXISTS (`workers/auto-cancel.ts`) |
| `rent-generation` queue + worker (Railway cron 1st of month) | 🟡 CODE EXISTS (`workers/rent-generate.ts`) |
| `subscription-dunning` queue + worker | 🟡 CODE EXISTS (`workers/billing-sync.ts` — verify it covers dunning) |
| `sync-processing` queue + worker | ⬜ TODO (Phase 5 offline sync — no worker file) |
| `moveToDLQ()` utility deployed and wired to all 7 workers | 🟡 CODE EXISTS (`workers/dlq.ts` — verify wired into every worker) |
| Verified: manually trigger DLQ → appears in `dlq_jobs` table | ⬜ TODO (needs live Redis/DB) |

---

## PHASE 2 — WEB FRONTEND + CORE SCREENS

**Do not start Phase 2 until all Phase 1 exit conditions are ✅ DONE.**

**Exit condition:** Warden can manage an entire hostel entirely in the browser. Lighthouse mobile > 90.

### Frontend Setup

| Task | Status |
|------|:------:|
| Next.js 14 App Router shell in `apps/web` | ⬜ TODO |
| Tailwind CSS + shadcn/ui + Framer Motion installed | ⬜ TODO |
| Fonts: Figtree + DM Mono + Noto Nastaliq Urdu loaded | ⬜ TODO |
| All design tokens from `04_UX_DESIGN_SYSTEM.md` as CSS variables | ⬜ TODO |
| App shell: sidebar (260px desktop, icon rail on collapse) + top header | ⬜ TODO |
| Mobile bottom tab bar | ⬜ TODO |
| PWA: `manifest.json` + service worker + install prompt | ⬜ TODO |

### Core Screens (Mobile-First — 390px before desktop)

| Task | Status |
|------|:------:|
| Login screen | ⬜ TODO |
| Dashboard — 5 KPI cards + alert banners + occupancy grid + quick actions | ⬜ TODO |
| Students list + search | ⬜ TODO |
| Add student flow (3-step) | ⬜ TODO |
| Student profile (5-tab view) | ⬜ TODO |
| Payment recording (3-step mobile flow) | ⬜ TODO |
| Defaulters list | ⬜ TODO |
| Rooms list + occupancy grid (gold/green/grey) | ⬜ TODO |
| Expenses list + add modal | ⬜ TODO |
| Owner transfers list + add modal | ⬜ TODO |
| Cancellations list | ⬜ TODO |
| Maintenance requests list | ⬜ TODO |
| Complaints list | ⬜ TODO |
| Check-in/out log | ⬜ TODO |
| Notices board | ⬜ TODO |
| Fines list | ⬜ TODO |
| Room inspections list | ⬜ TODO |
| Bill split calculator | ⬜ TODO |
| Reports — monthly + export | ⬜ TODO |
| Annual archive | ⬜ TODO |
| Global search (header) | ⬜ TODO |
| Settings — all 11 tabs | ⬜ TODO |
| Activity log page | ⬜ TODO |

### Performance Gate

| Task | Status |
|------|:------:|
| Lighthouse mobile Performance > 90 | ⬜ TODO |
| Lighthouse mobile Best Practices > 90 | ⬜ TODO |
| Lighthouse mobile Accessibility > 80 | ⬜ TODO |
| All screens tested at 390px mobile viewport | ⬜ TODO |
| Dashboard stats load < 200ms (k6 smoke test) | ⬜ TODO |
| Student search < 200ms (k6 smoke test) | ⬜ TODO |

---

## PHASE 2.5 — OPERATIONS MODULES COMPLETION

**Exit condition:** All advanced operations modules live and tested.

| Task | Status |
|------|:------:|
| Room inspections CRUD (FR-INS-01/02) | ⬜ TODO |
| Bill split calculator (FR-BILL-01/02) | ⬜ TODO |
| Annual archive report (FR-RPT-07) | ⬜ TODO |
| User feedback widget (GAP-P01) | ⬜ TODO |
| "Download all my data" export (GAP-P05) | ⬜ TODO |

---

## PHASE 3 — ONBOARDING + SUPER ADMIN + GROWTH (Months 7–10)

**Exit condition:** New clients can sign up and onboard without calling Zeerak. ≥1 paying client.

| Task | Status |
|------|:------:|
| Onboarding wizard — all 7 steps with event tracking | ⬜ TODO |
| Cloudflare Turnstile on wizard Step 1 | ⬜ TODO |
| WhatsApp skip/fallback in wizard Step 6 works correctly | ⬜ TODO |
| Super Admin panel — all 8 tabs | ⬜ TODO |
| Tenant impersonation (1-hour JWT, logged with `impersonated_by`) | ⬜ TODO |
| BullMQ DLQ monitor in Super Admin (auto-refresh 10s) | ⬜ TODO |
| Security events monitor in Super Admin | ⬜ TODO |
| Trial expiry pipeline + engagement status | ⬜ TODO |
| Broadcast announcement to all tenants | ⬜ TODO |
| MRR trend chart (12-month) in Super Admin | ⬜ TODO |
| Onboarding funnel (7-step conversion rates) in Super Admin | ⬜ TODO |
| Chain manager role + cross-branch KPIs view | ⬜ TODO |
| Cross-branch CNIC duplicate detection | ⬜ TODO |
| Landing page (hostyllo.app) — all sections | ⬜ TODO |
| Privacy Policy page live at hostyllo.app/privacy | ⬜ TODO |
| Terms of Service page live at hostyllo.app/terms | ⬜ TODO |
| **AI Tier 1 — Rule-Based Intelligence** | |
| `computeRiskScore()` — risk badges in defaulters list | ⬜ TODO |
| Smart defaulter sort (risk × amount × days overdue) | ⬜ TODO |
| Maintenance pattern detection (3+ same-category in 90 days) | ⬜ TODO |
| Occupancy trend widget (moving average sparkline) | ⬜ TODO |
| **WhatsApp (Phase 3 copy-paste tier)** | |
| Pre-filled WhatsApp templates (payment reminder, receipt) | ⬜ TODO |
| Template preview modal with one-click copy | ⬜ TODO |
| Bulk copy-paste queue (one-by-one with student list) | ⬜ TODO |
| NPS survey (14-day trigger, 90-day cooldown) | ⬜ TODO |

---

## PHASE 4 — BILLING AUTOMATION (Months 10–13)

**Exit condition:** ≥5 clients auto-billed without manual intervention. Dunning tested end-to-end.

| Task | Status |
|------|:------:|
| `POST /billing/initiate` → Paymob authenticate → createOrder → getPaymentKey | ⬜ TODO |
| Frontend redirect to Paymob iframe (JazzCash/EasyPaisa) | ⬜ TODO |
| Webhook handler: HMAC-SHA512 verify FIRST via `crypto.timingSafeEqual()` | ⬜ TODO |
| Webhook replay protection (paymob_order_id in Redis 48h) | ⬜ TODO |
| Subscription lifecycle: trial → active → past_due → cancelled | ⬜ TODO |
| `checkPlanFeature()` middleware on all gated routes | ⬜ TODO |
| Plan limits enforced: student count, branch count per plan | ⬜ TODO |
| **Dunning Sequence (7 steps)** | |
| Day 0: Payment fails → `status = past_due` + error-specific email | ⬜ TODO |
| Day 1: Dunning email #1 "Payment failed" | ⬜ TODO |
| Day 3: Dunning email #2 "Action required" | ⬜ TODO |
| Day 7: Dunning email #3 | ⬜ TODO |
| Day 8: Account suspended — data READ-ONLY, API returns 402 BIL_001 | ⬜ TODO |
| Day 28: Auto-export ZIP emailed to owner (JSON + CSVs) | ⬜ TODO |
| Day 31: PII purge — aggregates retained, PII anonymized | ⬜ TODO |
| **Subscription UI** | |
| Subscription management page in Settings | ⬜ TODO |
| Upgrade/downgrade flow | ⬜ TODO |
| Invoice history | ⬜ TODO |
| **SEO** | |
| Blog: 4 articles published (hostel management tips, Pakistan-specific) | ⬜ TODO |
| SEO metadata on all landing pages (title, description, OG tags) | ⬜ TODO |
| Google Search Console setup + sitemap.xml | ⬜ TODO |
| Referral system: `referral_code` per hostel + PKR 500 credit on conversion | ⬜ TODO |
| **Compliance** | |
| Day 28 auto-export trigger confirmed working | ⬜ TODO |
| Day 31 PII purge with double-confirm in Super Admin | ⬜ TODO |
| Audit log of every purge operation | ⬜ TODO |

---

## PHASE 5 — WHATSAPP + OFFLINE + SCALE (Months 13–18)

**Exit condition:** 360dialog live. k6 load test passes (p95 < 200ms at 500 VUs). OWASP ZAP clean. Offline sync tested with 10 integration tests.

| Task | Status |
|------|:------:|
| **WhatsApp (Full 360dialog Integration)** | |
| 360dialog API integration confirmed approved | ⬜ TODO |
| Template management: `payment_reminder`, `receipt_confirmation`, `maintenance_update` | ⬜ TODO |
| Monthly blast cron (5th of month, 09:00 PKT) | ⬜ TODO |
| Second blast cron (15th of month, unpaid only) | ⬜ TODO |
| 250/day cap enforcement (Redis `rl:wa:{hostelId}:daily` TTL 86400s) | ⬜ TODO |
| 2-second delay between sends | ⬜ TODO |
| Jazz API SMS fallback | ⬜ TODO |
| WhatsApp health monitor in Super Admin | ⬜ TODO |
| **Offline Sync (Build in isolation first)** | |
| `packages/sync/` — isolated package | ⬜ TODO |
| SQLite via wa-sqlite (OPFS, browser-native) | ⬜ TODO |
| CRDT last-write-wins with vector clocks | ⬜ TODO |
| `sync_conflicts` table — no silent conflict discards | ⬜ TODO |
| 10 integration tests passing before connecting to any UI | ⬜ TODO |
| `POST /api/v1/sync/push` (max 500 rows per batch) | ⬜ TODO |
| Service Worker: offline-first app shell | ⬜ TODO |
| Connectivity indicator in header (green/amber/red) | ⬜ TODO |
| **Scaling Gates** | |
| k6 load test: 500 concurrent VUs, p95 < 200ms — **MUST PASS** | ⬜ TODO |
| OWASP ZAP scan clean — **MUST PASS** | ⬜ TODO |
| npm audit — zero critical CVEs | ⬜ TODO |
| Railway auto-scaling: CPU > 70% → add replica (max 5) | ⬜ TODO |
| PgBouncer transaction mode verified under load | ⬜ TODO |
| **Urdu UI** | |
| All UI strings translated via `next-intl` | ⬜ TODO |
| RTL layout active when Urdu selected | ⬜ TODO |
| Noto Nastaliq Urdu font rendering verified | ⬜ TODO |

---

## PHASE 6 — CHAIN + API + AI TIER 2 (Months 18–24)

**Exit condition:** Chain manager view live. External API accessible. NPS > 8.

| Task | Status |
|------|:------:|
| Cross-branch KPI dashboard (consolidated revenue, occupancy, student count) | ⬜ TODO |
| Branch-level breakdown with drill-down | ⬜ TODO |
| Student transfer workflow between branches | ⬜ TODO |
| Cross-branch CNIC duplicate detection | ⬜ TODO |
| Consolidated monthly report (all branches) | ⬜ TODO |
| `api_keys` table + API key generation UI (Enterprise plan only) | ⬜ TODO |
| `/api/v1/` endpoints accessible via API key | ⬜ TODO |
| Webhook catalog: 7 events with delivery + retry + signature | ⬜ TODO |
| **AI Tier 2 — Statistical Intelligence** | |
| Occupancy forecasting widget (PostgreSQL `regr_slope`/`regr_intercept`) | ⬜ TODO |
| Fee collection probability per student (logistic regression coefficients) | ⬜ TODO |
| Revenue forecast for current month (range: low/mid/high) | ⬜ TODO |
| Operational health score (composite 0–100, owner dashboard) | ⬜ TODO |
| Materialized view `monthly_hostel_analytics` (refreshed daily) | ⬜ TODO |
| **Phase 6 Exit Gate** | |
| Third-party pen test completed (PKR 150,000–300,000) | ⬜ TODO |
| All critical findings from pen test resolved | ⬜ TODO |

---

## PHASES 7–8 — DEFERRED

**Phase 7 (Student Portal, AI Tier 3, White-Label):** DEFERRED
**Phase 8 (Native Apps, Open API Ecosystem):** DEFERRED
**Trigger:** MRR > PKR 500k/month for 2 consecutive months + hire completed
**Do not plan, design, or discuss these until the trigger condition is met.**

---

## DECISION LOG

> Record every significant architectural or product decision here with date and rationale.
> This prevents re-litigating decided questions in future sessions.

| Date | Decision | Rationale | Alternatives Rejected |
|------|----------|-----------|----------------------|
| — | JWT RS256 (asymmetric) | Prevents algorithm confusion attacks vs HS256 | HS256 — symmetric, forging risk |
| — | PostgreSQL RLS + withTenant() | Row-level isolation enforced by DB engine | App-level filtering — too easy to forget |
| — | withTenant() uses explicit BEGIN/COMMIT | SET LOCAL must be inside transaction to prevent race condition | Outside transaction — race condition |
| — | hostel_id from JWT only | IDOR prevention — body/params are attacker-controlled | Request body — IDOR risk |
| — | Supabase Mumbai (ap-south-1) | Lowest latency for Pakistani users, data stays in region | Other regions — higher latency |
| — | Paymob only (Phase 4) | Only Pakistan-approved gateway with JazzCash + EasyPaisa | Stripe — not available in Pakistan |
| — | 360dialog for WhatsApp (Phase 5) | Meta Business API provider with Pakistan support | Direct Meta API — requires verified business in US/EU |
| — | AI deferred to Phase 7 | Solo founder cannot staff ML in 24 months | Building ML in Phase 2 — impossible alone |
| — | FLOAT rejected for amounts | Floating point errors cause accounting discrepancies | FLOAT — fails financial audit |
| — | audit_log INSERT only | Tamper evidence destroyed if rows can be updated or deleted | Mutable log — not acceptable for PDPA |

| 2026-07-22 | Tracker reconciled to code; added 🟡/🐞 markers | Doc claimed "nothing built" but Phase 1 was ~65% authored — stale tracker was hiding real work and risking duplicate builds | Trusting the tracker as source-of-truth — falsified by inspection |
| 2026-07-22 | "Code exists" recorded separately from "Done" | DoD requires CI-green + live RLS + isolation proof, none of which the repo alone can confirm | Marking authored code as ✅ — would overstate readiness |
| 2026-07-22 (s3) | Add ONLY schema columns with a live code reader (migration 009); defer spec-only fields | Adding `can_edit/brand_color/...` with no consumer is dead schema; matches "ship what's used" | Front-loading every spec field — dead columns, migration churn |
| 2026-07-22 (s3) | Doc audit is a 3-pass job: (1) reconcile tracker+kill false "nothing built" claims, (2) fix numbering collisions + consolidate 4 agent-onboarding docs + merge CLAUDE.md addendum, (3) upgrade weak docs + cross-doc consistency | 29 docs / ~19k lines written by earlier models drifted apart and behind code; a staged converge avoids a risky big-bang rewrite | Single big-bang doc rewrite — high risk of losing real content |

*Add new rows here as decisions are made during Phase 1+.*

---

## LESSONS LOG

> Record every mistake, correction, or surprising discovery here.
> Claude Code agents read this at the start of every session.

- **2026-07-22 — The tracker had drifted ~1 full phase behind the code.** This file claimed
  "Phase 0, nothing built" while `apps/api` already had auth/students/rooms/payments/expenses/
  dashboard routes, `packages/db` had passing payment tests, 7 migrations existed, and 6 workers
  were written. **Lesson:** never trust this tracker over the code — inspect the repo first, then
  reconcile. The rule "if it's not checked here it does not exist" is dangerous when the file is
  stale; it caused real work to be invisible.
- **2026-07-22 — "Code exists" ≠ "Done."** Introduced the 🟡 marker to stop conflating the two.
  Most Phase 1 code is authored but unverified against the Definition of Done (RLS live, isolation
  tests green in CI, deployed). Only upgrade 🟡 → ✅ after the verification gate actually runs.
- **2026-07-22 — 4 payment defects are still open** (leftover comment; `extra_charges` dropped by
  `additionalProperties:false`; PATCH recalcs with `[]`; no `audit_log` on create/edit/void → breaks
  INVARIANT-5). Fix these before building the missing endpoints.

---

## SESSION HISTORY

> Record a one-line summary of every Claude Code session.

| # | Date | Summary | Ended On |
|---|------|---------|----------|
| 1 | 2026-07-22 | Reconciled this tracker against actual repo state (was 1 phase stale). Verified 14/14 payment unit tests pass. Documented real Phase 1 coverage (~65% authored) and the true remaining backlog. | Docs reconciled; code unchanged |
| 2 | 2026-07-22 | Fixed 4 payment defects + worker audit-column bug + rent idempotency/receipt-gap/void-leak/otplib (mig 008); built ALL missing Phase 1 endpoints (operations, transfers, fines, users, settings, audit-log, CSV import). tsc clean, 14/14 green. | Phase 1 endpoints code-complete |
| 3 | 2026-07-22 | Resolved all 5 corrected-audit findings (TS strict on, /health real probe, global error handler, login rate-limit, DB TLS verify). Migration 009 fixed auth-login + pdf-receipt runtime column crashes. Removed dead 'super_admin' literal. Began docs↔code re-reconciliation (this update). | Anchor pass of doc audit |
| 4 | 2026-07-22 | Full ARB audit (18 reports) → fixed all 4 CRITICAL (C1 FORCE-RLS+app role, C2 enc-key validation, C3 secrets template, C4 pitr gate) + all 5 MAJOR (M1 single pool, M2 CLAUDE.md, M3 migration runner, M4 env validation, M5 real isolation CI). CNIC encrypted. Doc suite consolidated (merged addendum, archived 6, added index). **Applied migrations 008–011 to live Supabase via MCP and PROVED tenant isolation on the real DB.** | Isolation live-verified; app-side activation pending Railway |
| 5 | 2026-07-23 | Deployed to Railway green: fixed `@hostyllo/db` build, `buildCommand=pnpm build`, PORT/domain 8080, Supabase IPv4 pooler + pinned CA, Redis→Railway. Wired Sentry + (old) Sentry-Crons uptime. Fixed `Lint and Test` ruleset; merged to main; live smoke-test + RLS re-proven. | Production live & green |
| 6 | 2026-07-23 | Built staging→prod pipeline: staging Supabase `ljnuwmfnpofzlmioskfc` (11 migs + `hostyllo_app` role) + own Railway Redis; prod→`main`, staging→`Develop` via per-env `deploymentTrigger`; `protect-main` = Lint and Test + Staging Smoke Test; `watchPatterns`; rollback documented (runbook §11/§12). | Pipeline live, both envs green |
| 7 | 2026-07-23 | Monitoring: `/api/v1/ready` (503 when down) + UptimeRobot on prod+staging; Sentry env separation (`SENTRY_ENVIRONMENT`); decommissioned flapping Sentry cron. Phase-1 verification tests: soft-delete, receipt-counter concurrency, DLQ round-trip (**+ fixed a silent DLQ column bug**); generated DB types. | Phase-1 verification gate ~complete |

*Update this table at the end of every session.*

---

## NEXT SESSION STARTING POINT

**When you open Claude Code, send this message first:**

```
"Read docs/09_BUILD_STATE_v15.md and docs/06_CLAUDE_MD_v15.md in full.
 Confirm: what phase are we in, and what is the first unchecked task?
 Then read the lessons log section of 09_BUILD_STATE_v15.md.
 Report all of this back before doing anything else."
```

**Current next task (reconciled 2026-07-23, session 7):** Phase 1 is **code-complete, deployed,
and mostly verified**. CNIC encryption, generated DB types, and the verification tests (RLS,
isolation, bcrypt, soft-delete, receipt-counter concurrency, DLQ round-trip) are all ✅ CI-green.
The only things between here and Phase 2:

1. **🔴 FOUNDER — Supabase PITR/Pro on prod** (INVARIANT-6, gate C4): enable the PITR add-on on
   project `eprrhckgtrerknenngdy`, then `verify-pitr.sh` must exit 0. **Blocks real customer data.**
2. **🔴 FOUNDER — rotate live secrets (C3)** that once sat in a working-tree `.env`: DB passwords,
   `JWT_*`, `COOKIE_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`. **NOT `ENCRYPTION_KEY`** (rotating it
   orphans encrypted CNIC/TOTP). Update Railway (both envs) + re-verify `/health` green.
3. **Verify `moveToDLQ` is wired into each of the 5 real workers'** failed handlers (the fn itself
   is now fixed + tested; confirm the call sites).
4. **Full audit** (APIs / platform / docs / repo / codebase) — founder's stated Phase-2 gate.
5. **Doc-audit passes 2–3** (numbering collisions, consolidate agent-onboarding docs).

Then **Phase 2 — Web Frontend** (`apps/web`, Next.js 14 → Vercel; set Vercel Root Directory =
`apps/web`, Production Branch = `main`; the pipeline already handles staging previews from
`Develop`). See runbook + `02_PRODUCT_BLUEPRINT.md` §13.

---

*HOSTYLLO Build State v15.0 · Created May 2026 · Confidential*
*Update this file at the end of every work session.*
*The build state is the source of truth for what exists. If it's not checked here, it does not exist.*
