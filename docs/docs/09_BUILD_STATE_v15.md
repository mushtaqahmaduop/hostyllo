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
| **Active Phase** | Phase 0 — Infrastructure Setup |
| **Overall Progress** | NOT STARTED |
| **Last Session** | No sessions yet |
| **Last Completed Task** | None |
| **Next Task** | Enable Supabase PITR (Phase 0, first item) |
| **Blocking Issues** | None yet |
| **Suite Version** | v15.0 |
| **PRD Authority** | docs/01_MASTER_PRD_v15.md |

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
| `./scripts/verify-pitr.sh` exits 0 — **LOGGED WITH TIMESTAMP** | ⬜ TODO |
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
| GitHub Actions `ci.yml`: `lint-and-typecheck → unit-tests → infra-gates → deploy` | ⬜ TODO |
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
| All 28 tables with RLS enabled | ⬜ TODO |
| `verify-pitr.sh` returns exit 0 | ⬜ TODO |
| All 14 payment unit tests pass in CI | ⬜ TODO |
| Cross-tenant isolation test passes on every endpoint (JWT A → data B → 404) | ⬜ TODO |
| `withTenant()` ESLint rule active and blocking violations in CI | ⬜ TODO |
| `/health` returns `db: ok` and `redis: ok` | ⬜ TODO |
| bcrypt rounds ≥ 12 in auth integration test | ⬜ TODO |
| CNIC encrypted — plaintext `cnic` column must not exist in DB | ⬜ TODO |
| Soft-delete verified on all list endpoints | ⬜ TODO |
| Receipt counter atomic function deployed and concurrency-tested | ⬜ TODO |
| BullMQ DLQ confirmed on all 7 queues | ⬜ TODO |
| Sentry receiving events | ⬜ TODO |
| No secrets in git | ⬜ TODO |

### Monorepo Setup

| Task | Status |
|------|:------:|
| `pnpm workspaces` + Turborepo configured | ⬜ TODO |
| `apps/web`, `apps/api`, `apps/admin`, `packages/db`, `packages/ui`, `packages/config` | ⬜ TODO |
| `packages/config/eslint-plugin-hostyllo` with both rules | ⬜ TODO |

### Database — 28 Tables + RLS (Build in Order)

| Task | Status |
|------|:------:|
| Migration 001: `hostels`, `users` + RLS | ⬜ TODO |
| Migration 002: `students`, `rooms`, `beds` + RLS + GIN indexes | ⬜ TODO |
| Migration 003: `payments`, `payment_extra_charges`, `expenses`, `owner_transfers`, `fines` + RLS | ⬜ TODO |
| Migration 004: `cancellations`, `room_shifts`, `maintenance_requests`, `complaints`, `checkin_log`, `notices` + RLS | ⬜ TODO |
| Migration 005: `room_inspections`, `bill_splits` + RLS | ⬜ TODO |
| Migration 006: `subscriptions`, `audit_log`, `receipt_counter`, `warden_shift_log`, `dlq_jobs` + RLS | ⬜ TODO |
| Migration 007: `feedback`, `nps_responses`, `onboarding_events`, `referral_payouts`, `api_keys` + RLS | ⬜ TODO |
| `get_next_receipt_number()` PL/pgSQL function deployed | ⬜ TODO |
| Dashboard aggregation SQL (single CTE query — not 5 separate SELECTs) | ⬜ TODO |
| CI check: `SELECT tablename WHERE rowsecurity=false` → fails build if any row returned | ⬜ TODO |

### packages/db — Core Library

| Task | Status |
|------|:------:|
| `withTenant.ts` implementation | ⬜ TODO |
| TypeScript types generated from schema | ⬜ TODO |
| `paymentService.ts`: `calculateUnpaid()` ported verbatim from Electron | ⬜ TODO |
| `paymentService.test.ts`: all 14 test cases passing in CI | ⬜ TODO |
| `formatters.ts`: `fmtCnic()` + `fmtPhone()` ported verbatim | ⬜ TODO |

### Authentication Endpoints

| Task | Status |
|------|:------:|
| `POST /api/v1/auth/login` (bcrypt 12 rounds, RS256, TOTP check) | ⬜ TODO |
| `POST /api/v1/auth/refresh` (rolling rotation, jti blocklist) | ⬜ TODO |
| `POST /api/v1/auth/logout` (invalidate all tokens) | ⬜ TODO |
| `POST /api/v1/auth/reset-password` (6-digit OTP, 5-attempt limit) | ⬜ TODO |
| `POST /api/v1/auth/totp/setup` | ⬜ TODO |
| `POST /api/v1/auth/totp/verify` | ⬜ TODO |
| JWT middleware: RS256 verify + jti blocklist + role from DB | ⬜ TODO |
| Rate limit middleware: 10 attempts/15min/IP (Redis `rl:login:{ip}`) | ⬜ TODO |
| Security headers: CSP + HSTS + X-Frame-Options on every response | ⬜ TODO |

### Student Endpoints

| Task | Status |
|------|:------:|
| `GET /api/v1/students` (pg_trgm search, < 200ms) | ⬜ TODO |
| `POST /api/v1/students` (CNIC encrypt, photo validate, bed assignment) | ⬜ TODO |
| `GET /api/v1/students/:id` | ⬜ TODO |
| `PATCH /api/v1/students/:id` | ⬜ TODO |
| `DELETE /api/v1/students/:id` (soft delete) | ⬜ TODO |
| `POST /api/v1/students/import` (CSV, formula sanitization) | ⬜ TODO |
| `GET /api/v1/students/search` | ⬜ TODO |
| Cross-tenant isolation test on every student endpoint | ⬜ TODO |

### Room & Bed Endpoints

| Task | Status |
|------|:------:|
| `GET /api/v1/rooms` | ⬜ TODO |
| `POST /api/v1/rooms` | ⬜ TODO |
| `PATCH /api/v1/rooms/:id` | ⬜ TODO |
| `DELETE /api/v1/rooms/:id` (blocked if active occupants → RM_002) | ⬜ TODO |
| `POST /api/v1/rooms/shift` | ⬜ TODO |
| Bed CRUD endpoints | ⬜ TODO |
| Cross-tenant isolation test on every room endpoint | ⬜ TODO |

### Payment Endpoints

| Task | Status |
|------|:------:|
| `GET /api/v1/payments` | ⬜ TODO |
| `POST /api/v1/payments` (idempotency key, X-Idempotency-Key Redis 24h) | ⬜ TODO |
| `PATCH /api/v1/payments/:id` | ⬜ TODO |
| `POST /api/v1/payments/generate-monthly` (idempotent) | ⬜ TODO |
| `GET /api/v1/payments/defaulters` | ⬜ TODO |
| `GET /api/v1/payments/summary` | ⬜ TODO |
| `POST /api/v1/payments/:id/void-request` | ⬜ TODO |
| `POST /api/v1/payments/:id/send-receipt` | ⬜ TODO |
| Cross-tenant isolation test on every payment endpoint | ⬜ TODO |

### Finance Endpoints

| Task | Status |
|------|:------:|
| `GET/POST/PATCH/DELETE /api/v1/expenses` | ⬜ TODO |
| `GET/POST/PATCH/DELETE /api/v1/transfers` | ⬜ TODO |
| `GET/POST/PATCH/DELETE /api/v1/fines` | ⬜ TODO |

### Operations Endpoints

| Task | Status |
|------|:------:|
| `GET/POST/PATCH /api/v1/cancellations` | ⬜ TODO |
| `POST /api/v1/cancellations/:id/confirm` | ⬜ TODO |
| `POST /api/v1/cancellations/:id/restore` | ⬜ TODO |
| `GET/POST/PATCH /api/v1/maintenance` | ⬜ TODO |
| `GET/POST/PATCH /api/v1/complaints` | ⬜ TODO |
| `GET/POST /api/v1/checkin` | ⬜ TODO |
| `GET/POST /api/v1/notices` | ⬜ TODO |

### System Endpoints

| Task | Status |
|------|:------:|
| `GET /api/v1/dashboard/stats` (single CTE < 200ms) | ⬜ TODO |
| `GET /api/v1/dashboard/alerts` | ⬜ TODO |
| `GET/POST/PATCH/DELETE /api/v1/users` | ⬜ TODO |
| `GET/PATCH /api/v1/settings/hostel-info` | ⬜ TODO |
| `GET /api/v1/audit-log` | ⬜ TODO |
| `GET /api/v1/health` | ⬜ TODO |

### BullMQ Workers (All 7)

| Task | Status |
|------|:------:|
| `pdf-receipts` queue + worker (puppeteer → PDF → Supabase Storage) | ⬜ TODO |
| `whatsapp-notifications` queue + worker | ⬜ TODO |
| `email-notifications` queue + worker (Resend) | ⬜ TODO |
| `auto-cancellations` queue + worker (Railway cron nightly) | ⬜ TODO |
| `rent-generation` queue + worker (Railway cron 1st of month) | ⬜ TODO |
| `subscription-dunning` queue + worker | ⬜ TODO |
| `sync-processing` queue + worker | ⬜ TODO |
| `moveToDLQ()` utility deployed and wired to all 7 workers | ⬜ TODO |
| Verified: manually trigger DLQ → appears in `dlq_jobs` table | ⬜ TODO |

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

*Add new rows here as decisions are made during Phase 1+.*

---

## LESSONS LOG

> Record every mistake, correction, or surprising discovery here.
> Claude Code agents read this at the start of every session.

*No lessons recorded yet. Add here after each work session.*

---

## SESSION HISTORY

> Record a one-line summary of every Claude Code session.

| # | Date | Summary | Ended On |
|---|------|---------|----------|
| — | — | No sessions yet | — |

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

**Current next task:** Enable Supabase PITR and run `./scripts/verify-pitr.sh`

---

*HOSTYLLO Build State v15.0 · Created May 2026 · Confidential*
*Update this file at the end of every work session.*
*The build state is the source of truth for what exists. If it's not checked here, it does not exist.*
