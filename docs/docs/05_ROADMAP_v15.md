# HOSTYLLO — Phase Roadmap
## v15.0 · Unified Suite · May 2026
### Supersedes Roadmap v14.0, v13.0, v10.0 and all prior versions

> **Revision rule:** Update this file after every phase completion before starting the next.
> **Scope discipline:** Each week ask: "What is the minimum needed for my client to use this today?" Build only that.
> **Authority:** Phase scope, exit conditions, and deferred rules in this file are binding.

---

## REVENUE TIMELINE (Realistic — Solo Founder)

| Stage | Timeline | Clients | MRR (PKR) | Monthly Cost (PKR) | Net |
|-------|----------|---------|-----------|-------------------|-----|
| MVP Launch | Month 2 | 1 | ~3,000 | ~17,710 | -14,710 |
| Beta Growth | Month 4 | 3–5 | ~15,000 | ~17,710 | -2,710 |
| Post-Billing | Month 6 | 5–10 | 30,000–70,000 | ~38,710 | break-even |
| Growth | Month 9 | 20–30 | 60,000–210,000 | ~38,710 | profitable |
| Scale | Month 18 | 80–100 | 240,000–700,000 | ~50,000 | strong margin |
| Enterprise | Month 24+ | 150–200+ | 450,000–1,400,000 | ~120,000+ | — |

**Break-even at Phase 3 costs (~PKR 38,710/mo):** 6 Pro clients.
**Target before Phase 3:** 5 paying clients (any plan). Cash-flow positive by Phase 4 with 10+ mixed clients.

---

## PRE-WORK (Do This Before Writing a Single Line of Code)

> These are not Phase 1 tasks. They are pre-Phase-0 tasks. Do them before touching the keyboard.
> Some have multi-week approval timelines that cannot be compressed.

| Task | Time Required | Lead Time | Risk if Skipped |
|------|--------------|-----------|----------------|
| Enable Supabase PITR (7-day retention) | 5 minutes | Instant | CRITICAL — data loss on incident |
| Apply for Meta WhatsApp Business API | 30 minutes + forms | **4–8 WEEKS** | Cannot ship Phase 3 WhatsApp until approved. Apply TODAY. |
| Apply for Paymob merchant account | 1 hour + docs | **1–3 business days** | Phase 4 billing blocked. Apply in Phase 1 month. |
| Generate JWT RS256 keypair → Railway env vars | 15 minutes | Instant | Security. Do not begin Phase 1 without this. |
| Create PWA manifest.json stub | 30 minutes | Instant | Wardens install app on Day 1 |
| Set up Sentry with PII filter (CNIC must not appear) | 2 hours | Instant | No error visibility in production |
| Rotate all secrets to 64-char random values | 15 minutes | Instant | Key hygiene |
| Create `tasks/lessons.md` in monorepo | 5 minutes | Instant | AI agent session discipline |

---

## PHASE 0 — INFRASTRUCTURE SETUP

**Duration:** Week 1
**Exit Condition:** `./scripts/verify-pitr.sh` returns exit code 0 AND the result is logged with a timestamp. Zero client data may be written until this passes.

### Deliverables

**Railway:**
- [ ] Pro plan active with billing confirmed
- [ ] Backend service created (`hostyllo-api`)
- [ ] Railway cron jobs configured (auto-cancellations, rent-generate)
- [ ] Auto-scaling rules: CPU > 70% → add replica (max 5)

**Supabase:**
- [ ] Pro plan — NOT free tier
- [ ] PITR enabled, 7-day retention confirmed
- [ ] `./scripts/verify-pitr.sh` exits 0 — LOGGED WITH TIMESTAMP
- [ ] PgBouncer in transaction mode (NOT session mode)

**Upstash Redis:**
- [ ] Database created
- [ ] Connection URL confirmed starting with `rediss://` (TLS)
- [ ] `redis-cli ping` returns PONG

**Vercel:**
- [ ] `app.hostyllo.app` project created with custom domain
- [ ] `admin.hostyllo.app` project created with custom domain

**GitHub:**
- [ ] Repository created
- [ ] Branch protection on `main` (require PR + CI pass)
- [ ] Direct push to `main` rejected (verified)

**CI/CD:**
- [ ] GitHub Actions `ci.yml`: `lint-and-typecheck → unit-tests → infra-gates → deploy`
- [ ] Empty repo: first green CI run confirmed

**Monitoring:**
- [ ] Sentry project `hostyllo-api` created with PII filter active
- [ ] Test error thrown → appears in Sentry within 60 seconds
- [ ] Uptime Robot monitor on `GET /health` → SMS alert to your phone
- [ ] Test alert fires correctly

**Environment Variables:**
- [ ] All secrets from PRD Section 23 added to Railway and Vercel
- [ ] `git log -p | grep -iE "key|secret|password"` returns EMPTY

### Day-by-Day Schedule

| Day | Focus | End-of-Day Proof |
|-----|-------|-----------------| 
| Day 1 | Railway + Supabase Pro + PITR | `verify-pitr.sh` exits 0 |
| Day 2 | Upstash Redis + JWT keypair + env vars | `rediss://` confirmed; no secrets in code |
| Day 3 | Vercel projects + domain configuration | Both URLs resolve |
| Day 4 | GitHub repo + branch protection + Sentry | Test error appears in Sentry |
| Day 5 | CI pipeline + Uptime Robot | GitHub Actions green on empty repo |

### Phase 0 Budget

Fixed monthly burn from Day 1: **PKR ~17,710/month**

| Service | Monthly Cost (PKR) |
|---------|------------------:|
| Railway Pro | 5,600 |
| Supabase Pro | 7,000 |
| Upstash Redis | ~2,800 |
| Uptime Robot | ~1,960 |
| Domain | ~350 |
| Sentry / Resend / Cloudflare | 0 |
| **Total** | **~17,710** |

---

## PHASE 1 — CLOUD API FOUNDATION

**Duration:** Months 1–4
**Goal:** Production-quality backend API. A warden can log in, add a student, record a payment, and download a PDF receipt. All data fully isolated from other hostels.

### Exit Condition (ALL must be checked — no partial credit)
- [ ] All 28 tables with RLS enabled
- [ ] `verify-pitr.sh` returns exit 0
- [ ] All 14 payment unit tests pass in CI
- [ ] Cross-tenant isolation test passes on every endpoint (JWT A → data B → 404)
- [ ] `withTenant()` ESLint rule active and blocking violations in CI
- [ ] `/health` returns `db: ok` and `redis: ok`
- [ ] bcrypt rounds ≥ 12 in auth integration test
- [ ] CNIC encrypted — plaintext `cnic` column must not exist
- [ ] Soft-delete verified on all list endpoints
- [ ] Receipt counter atomic function deployed and concurrency-tested
- [ ] BullMQ DLQ confirmed on all 7 queues
- [ ] Sentry receiving events
- [ ] No secrets in git

### Deliverables

**Monorepo Structure:**
- [ ] `pnpm workspaces` + Turborepo configured
- [ ] `apps/web`, `apps/api`, `apps/admin`, `packages/db`, `packages/ui`, `packages/config`
- [ ] `packages/config/eslint-plugin-hostyllo` with both rules

**Database (packages/db):**
- [ ] Migration 001: `hostels`, `users` tables + RLS
- [ ] Migration 002: `students`, `rooms`, `beds` + RLS + GIN indexes
- [ ] Migration 003: `payments`, `payment_extra_charges`, `expenses`, `owner_transfers`, `fines` + RLS
- [ ] Migration 004: `cancellations`, `room_shifts`, `maintenance_requests`, `complaints`, `checkin_log`, `notices` + RLS
- [ ] Migration 005: `room_inspections`, `bill_splits` + RLS
- [ ] Migration 006: `subscriptions`, `audit_log`, `receipt_counter`, `warden_shift_log`, `dlq_jobs` + RLS
- [ ] Migration 007: `feedback`, `nps_responses`, `onboarding_events`, `referral_payouts`, `api_keys` + RLS
- [ ] `get_next_receipt_number()` PL/pgSQL function deployed
- [ ] Dashboard aggregation SQL (single query — not 5 separate SELECTs)
- [ ] `withTenant.ts` implementation deployed
- [ ] TypeScript types generated from schema
- [ ] `paymentService.ts`: `calculateUnpaid()` ported verbatim from Electron
- [ ] `paymentService.test.ts`: all 14 test cases passing
- [ ] `formatters.ts`: `fmtCnic()` + `fmtPhone()` ported verbatim
- [ ] CI check: `SELECT tablename WHERE rowsecurity=false` → fails build if any row returned

**Authentication (6 endpoints):**
- [ ] `POST /api/v1/auth/login` (bcrypt 12 rounds, RS256, TOTP check)
- [ ] `POST /api/v1/auth/refresh` (rolling rotation, jti blocklist)
- [ ] `POST /api/v1/auth/logout` (invalidate all tokens)
- [ ] `POST /api/v1/auth/reset-password` (6-digit OTP, 5-attempt limit)
- [ ] `POST /api/v1/auth/totp/setup`
- [ ] `POST /api/v1/auth/totp/verify`
- [ ] JWT middleware: RS256 verify + jti blocklist + role from DB
- [ ] Rate limit middleware: 10 attempts/15min/IP (Redis)
- [ ] Security headers middleware: CSP + HSTS + X-Frame-Options on every response

**Students (7 endpoints):**
- [ ] `GET /api/v1/students` (pg_trgm search, < 200ms)
- [ ] `POST /api/v1/students` (CNIC encrypt, photo validate, bed assignment)
- [ ] `GET /api/v1/students/:id`
- [ ] `PATCH /api/v1/students/:id`
- [ ] `DELETE /api/v1/students/:id` (soft delete)
- [ ] `POST /api/v1/students/import` (CSV, formula sanitization)
- [ ] `GET /api/v1/students/search`
- [ ] Cross-tenant isolation test on every endpoint

**Rooms (6 endpoints):**
- [ ] `GET /api/v1/rooms`
- [ ] `POST /api/v1/rooms`
- [ ] `PATCH /api/v1/rooms/:id`
- [ ] `DELETE /api/v1/rooms/:id` (blocked if active occupants)
- [ ] `POST /api/v1/rooms/shift`
- [ ] `PATCH /api/v1/rooms/bulk-fee` (3 modes)
- [ ] Bed CRUD sub-endpoints

**Payments (8 endpoints):**
- [ ] `GET /api/v1/payments`
- [ ] `POST /api/v1/payments` (idempotency key required)
- [ ] `PATCH /api/v1/payments/:id`
- [ ] `GET /api/v1/payments/defaulters`
- [ ] `GET /api/v1/payments/summary`
- [ ] `POST /api/v1/payments/generate-monthly` (idempotent, ON CONFLICT guard)
- [ ] `POST /api/v1/payments/:id/send-receipt`
- [ ] `POST /api/v1/payments/:id/void-request`

**Finance Endpoints:**
- [ ] `GET/POST/PATCH/DELETE /api/v1/expenses`
- [ ] `GET/POST/PATCH/DELETE /api/v1/transfers`
- [ ] `GET/POST/PATCH/DELETE /api/v1/fines`

**Operations Endpoints:**
- [ ] `GET/POST/PATCH/DELETE /api/v1/cancellations`
- [ ] Railway cron: `autoCancelCron.ts` (nightly, port `processAutoCancellations()`)
- [ ] `GET/POST/PATCH /api/v1/maintenance`
- [ ] `GET/POST/PATCH /api/v1/complaints`
- [ ] `GET/POST/DELETE /api/v1/checkin`
- [ ] `GET/POST/DELETE /api/v1/notices`

**System Endpoints:**
- [ ] `GET /api/v1/dashboard/stats` (single aggregation query)
- [ ] `GET /api/v1/dashboard/alerts`
- [ ] `GET /api/v1/audit-log`
- [ ] `GET/PATCH /api/v1/settings/hostel-info` (minimal settings)
- [ ] `GET /api/v1/users` + `POST` + `PATCH` + `DELETE`
- [ ] `GET /api/v1/health`

**BullMQ (7 queues, all with DLQ):**
- [ ] `pdf-receipts` worker (concurrency 5, retry 3×)
- [ ] `whatsapp-blast` worker (concurrency 2, 2s delay)
- [ ] `whatsapp-receipt` worker
- [ ] `billing-sync` worker (retry 5×)
- [ ] `email-send` worker (concurrency 5)
- [ ] `auto-cancel` worker
- [ ] `rent-generate` worker
- [ ] `moveToDLQ()` utility (writes to `dlq_jobs` table)
- [ ] All workers: `worker.on('failed')` calling `moveToDLQ()` — verified

### Build Order (MANDATORY — follow exactly)

```
Week 1: Database Foundation
  → ESLint plugins (require-with-tenant + no-hostel-id-from-request)
  → packages/db/src/withTenant.ts — write and test before any route
  → Migration 001: hostels, users, students, rooms, beds
  → Migration 002: payments, extras, expenses, transfers, fines
  → Migration 003: cancellations, shifts, maintenance, complaints, checkin_log, notices
  → Migration 004: audit_log, subscriptions, receipt_counter, dlq_jobs, etc.
  → RLS policies on ALL 28 tables
  → GIN indexes: pg_trgm on students, payments month
  → get_next_receipt_number() atomic PostgreSQL function
  → CI gate: SELECT tablename WHERE rowsecurity=false → fail build

Week 2: Auth + Business Logic
  → packages/db/src/paymentService.ts — calculateUnpaid() verbatim
  → packages/db/__tests__/paymentService.test.ts — 14 tests MUST PASS
  → POST /auth/login (bcrypt + RS256 + TOTP check)
  → POST /auth/refresh (rolling rotation, jti blocklist)
  → POST /auth/logout, /auth/reset-password, /auth/totp/setup, /auth/totp/verify
  → JWT middleware (RS256, jti check, role from DB)
  → Rate limit middleware (10 attempts/15min/IP)
  → Security headers middleware (@fastify/helmet)

Week 3: Core Data Routes
  → GET/POST/PATCH/DELETE /students (7 endpoints)
  → POST /students/import (CSV formula sanitization)
  → GET /students/search (pg_trgm < 200ms)
  → GET/POST/PATCH/DELETE /rooms (+ beds CRUD, shift, bulk-fee)
  → Cross-tenant isolation test on every endpoint

Week 4: Finance Routes
  → GET/POST/PATCH /payments (+ generate-monthly, defaulters, summary, send-receipt)
  → POST /payments/:id/void-request
  → Payment idempotency key (X-Idempotency-Key Redis 24h)
  → PDF receipt generation (BullMQ pdf-receipts queue)
  → GET/POST/PATCH/DELETE /expenses, /transfers, /fines

Weeks 5–6: Infrastructure + Remaining Routes
  → GET/POST/PATCH/DELETE /cancellations (+ Railway nightly cron)
  → GET/POST/PATCH /maintenance, /complaints
  → GET/POST /checkin, /notices
  → GET/POST /audit-log
  → GET/POST/PATCH/DELETE /users
  → GET/PATCH /settings/hostel-info (minimal — 3 core tabs only)
  → GET /dashboard/stats + GET /dashboard/alerts
  → GET /health
  → All 7 BullMQ workers with worker.on('failed') → moveToDLQ()
  → GitHub Actions CI: all infra-gates passing
  → Sentry + Pino structured logging on every route
  → k6 smoke test: dashboard query < 200ms, student search < 200ms
```

---

## PHASE 2 — WEB FRONTEND + CORE SCREENS

**Duration:** Months 4–7
**Goal:** Full working web app. Warden's complete daily workflow runs 100% in the browser.

### Exit Condition
- [ ] All 8 Phase 1 P0 modules live and warden-tested
- [ ] Lighthouse score > 90 on mobile (Pakistan 4G simulation)
- [ ] PWA manifest.json installed — wardens can add to home screen
- [ ] Playwright E2E: login → add student → record payment → generate receipt → cross-tenant test: ALL GREEN
- [ ] Playwright: add cancellation → confirm → verify room freed: GREEN
- [ ] At least 1 beta warden using it daily for 2 weeks

### Deliverables

**App Shell:**
- [ ] Fixed sidebar (260px desktop, collapsible to 60px icon rail)
- [ ] Top header (60px): sync badge, hostel name, notification bell, theme toggle, language toggle, user avatar
- [ ] Mobile bottom tab bar (Dashboard, Students, Payments, Rooms, More)
- [ ] Framer Motion page transitions (200ms ease-out)
- [ ] Skeleton shimmer on every screen (never spinners)
- [ ] Dark/light/system theme (stored per user in DB)
- [ ] PWA manifest.json + Service Worker (app shell caching)

**Module Screens:**
- [ ] Dashboard: 5 KPI cards (animated count-up) + alert banners (port verbatim) + occupancy grid + quick actions
- [ ] Students: list + add (3-step) + profile (5 tabs) + CSV import (5-step with preview)
- [ ] Rooms: list + occupancy grid (gold/green/grey) + bed picker
- [ ] Payments: list + record modal (mobile-optimized 3-step) + defaulters list + bulk WhatsApp copy-paste
- [ ] Expenses: list + add modal
- [ ] Cancellations: 3-tab filter (Pending/Confirmed/Restored)
- [ ] Issues: dual-tab (Maintenance + Complaints)
- [ ] Check-In/Out Log
- [ ] Notices Board
- [ ] Fines module
- [ ] User Management

**Settings (minimal — Phase 2):**
- [ ] Hostel Info tab
- [ ] Room Types tab
- [ ] Payment Methods tab
- [ ] Theme & Display tab
- [ ] Subscription tab (read-only in Phase 2)

**Design System (packages/ui):**
- [ ] All design tokens from PRD Section 41 implemented as CSS variables
- [ ] Figtree + DM Mono + Noto Nastaliq Urdu fonts loaded
- [ ] Button component (all 4 types × 5 states)
- [ ] Input component with gold focus ring
- [ ] Status badges (paid/partial/pending/active/vacated)
- [ ] Modal/bottom sheet component
- [ ] Empty state component (illustrated + bilingual)
- [ ] Toast notification system (Framer Motion, 4s auto-dismiss)
- [ ] Pakistani lakh number format utility

**Phase 2 AI (Tier 1 — Rule-Based, lightweight):**
- [ ] Occupancy trend sparkline on dashboard (6-month moving average, PostgreSQL window function)
- [ ] "Pending payments" count and amount shown prominently with visual urgency

---

## PHASE 2.5 — OPERATIONS MODULES COMPLETION

**Duration:** Months 5–7 (overlaps Phase 2 tail)
**Goal:** Feature parity with all Electron modules. No daily warden workflow requires the Electron app.

### Deliverables

- [ ] Annual Archive (year tabs, 12-month grid, annual totals, trend chart)
- [ ] Global search UI (header search bar, Cmd+K, results grouped by category)
- [ ] Reports module: monthly detail + PDF export + CSV export
- [ ] Room Inspections module
- [ ] Bill Split Calculator
- [ ] Bulk rent update UI (3 modes)
- [ ] Activity Log screen (searchable, colour-coded badges, hash chain verification)
- [ ] Settings: remaining 8 tabs (Expense Categories, Floors, Data Management, Rent Update, Splash, Annual Archive)
- [ ] User feedback widget (floating button, 500-char limit, 5/day per user)
- [ ] "Download all my data" ZIP (owner only, 3/day limit)

### Exit Condition
- [ ] Feature parity with all Electron modules confirmed
- [ ] At least 1 warden confirms "I no longer need the Electron app"

---

## PHASE 3 — ONBOARDING + SUPER ADMIN + AI TIER 1

**Duration:** Months 7–10
**Goal:** Self-serve signup. Zeerak can manage all tenants from one panel. First AI features live.

### Exit Condition
- [ ] New hostel owner can sign up, complete wizard, and go operational without Zeerak's intervention
- [ ] Super Admin panel can manage full tenant lifecycle
- [ ] First PAYING client onboarded and confirmed working
- [ ] Payment risk scoring active in defaulters list
- [ ] Landing page live at hostyllo.app and indexed by Google

### Deliverables

**Onboarding Wizard (7 steps, each tracked to `onboarding_events`):**
- [ ] Step 1: Account creation — email + password + Cloudflare Turnstile → email OTP verify
- [ ] Step 2: Hostel profile — name, city, address, WhatsApp number
- [ ] Step 3: Logo & branding — logo upload or skip + brand color picker
- [ ] Step 4: Room setup — add minimum 1 room type with fee
- [ ] Step 5: First student — add 1 student or skip (CSV import available)
- [ ] Step 6: WhatsApp test — send test or skip. FALLBACK: SMS → copy-paste → continue anyway
- [ ] Step 7: Done — confetti + summary + Dashboard opens
- [ ] i18n setup via `next-intl` (even if Urdu strings ship in Phase 5, the scaffold must exist now)

**Super Admin Panel (admin.hostyllo.app — IP + TOTP locked):**
- [ ] Business KPI dashboard (MRR, churn, trial pipeline, tenants)
- [ ] Platform health dashboard (API uptime, queue depth, WA quota, p95 latency)
- [ ] Tenant list with search + filter by plan/status
- [ ] Tenant detail view (8 tabs: Overview, Students, Payments, Subscription, Billing, Feature Flags, Activity Log, Actions)
- [ ] Tenant impersonation (1-hour JWT, no refresh, audit logged with `impersonated_by`)
- [ ] BullMQ DLQ monitor (auto-refresh 10s, retry/discard per job)
- [ ] Security events monitor (login attempts, IDOR probes, IP block button via Cloudflare WAF API)
- [ ] Trial expiry pipeline (days remaining, engagement status)
- [ ] Broadcast announcement to all tenants
- [ ] MRR trend chart (12-month)
- [ ] Onboarding funnel (7-step conversion rates)

**Multi-Tenant Chain Features:**
- [ ] Chain manager role: cross-branch KPIs view
- [ ] Cross-branch CNIC duplicate detection

**Landing Page (hostyllo.app):**
- [ ] Hero + 3-second demo video
- [ ] Problem/solution section
- [ ] Product showcase (animated screenshots)
- [ ] Features grid (6 cards)
- [ ] Pricing table (3 plans, annual toggle)
- [ ] Pakistan-specific trust section (CNIC-encrypted, JazzCash, Urdu)
- [ ] FAQ (8 questions)
- [ ] Cloudflare Turnstile on CTAs
- [ ] Privacy Policy + Terms of Service pages live
- [ ] hostyllo.app/blog stub (even if empty, SEO foundation)

**AI Tier 1 (Rule-Based Intelligence — Phase 3):**
- [ ] Payment risk scoring function: `computeRiskScore()` using consecutive unpaid months + avg delay
- [ ] Risk badges (🟢🟡🔴) displayed in defaulters list
- [ ] Smart defaulter sort: risk × amount × days overdue
- [ ] "Remind All High-Risk First" button in defaulters
- [ ] Maintenance pattern detection: 3+ same-category requests in 90 days → room warning badge
- [ ] Occupancy trend widget: moving average sparkline (dashboard + reports)

**WhatsApp — Phase 3 Copy-Paste Upgrade:**
- [ ] Pre-filled templates for payment reminder, receipt, maintenance update
- [ ] Template preview modal with one-click copy
- [ ] Bulk copy-paste queue (one-by-one with student list)
- [ ] NPS survey (14-day trigger, 90-day cooldown, 0–10 + comment)

---

## PHASE 4 — BILLING AUTOMATION + SEO EXPANSION

**Duration:** Months 10–13
**Goal:** Automated recurring revenue. Zeerak stops manually collecting payments.

### Exit Condition
- [ ] Tenant can subscribe, pay via JazzCash/EasyPaisa, and auto-renew without manual intervention
- [ ] 5+ clients auto-billed consecutively without issues
- [ ] Dunning sequence tested end-to-end (including Day 28 export + Day 31 PII purge)
- [ ] SEO: top 5 Google results for "hostel management software Pakistan"

### Deliverables

**Paymob Integration:**
- [ ] `POST /billing/initiate` → Paymob authenticate → createOrder → getPaymentKey
- [ ] Frontend redirect to Paymob iframe (JazzCash/EasyPaisa)
- [ ] Webhook handler: HMAC-SHA512 verify FIRST via `crypto.timingSafeEqual()`
- [ ] Webhook replay protection (paymob_order_id in Redis 48h)
- [ ] Subscription lifecycle: trial → active → past_due → cancelled
- [ ] Feature gates: `checkPlanFeature(featureKey)` middleware on all gated routes
- [ ] Plan limits enforced: student count, branch count per plan

**Dunning Sequence (7 events):**
- [ ] Day 0: Payment fails → `status = past_due` + error-specific email
- [ ] Day 1: Dunning email #1 "Payment failed"
- [ ] Day 3: Dunning email #2 "Action required"
- [ ] Day 7: Dunning email #3
- [ ] Day 8: Account suspended — data READ-ONLY, API returns 402 BIL_001
- [ ] Day 28: Auto-export ZIP emailed to owner (JSON + CSVs)
- [ ] Day 31: PII purge — aggregates retained, PII anonymized

**Billing UI:**
- [ ] Subscription management page in Settings
- [ ] Upgrade/downgrade flow
- [ ] Invoice history
- [ ] Billing email notifications

**SEO + Growth (Phase 4):**
- [ ] Blog: 4 articles published (hostel management tips, Pakistan-specific)
- [ ] SEO metadata on all landing pages (title, description, OG tags)
- [ ] Google Search Console setup
- [ ] Sitemap.xml auto-generated
- [ ] Referral system: `referral_code` per hostel + PKR 500 credit on conversion

**Data Retention Manager (Super Admin):**
- [ ] Day 28 auto-export trigger confirmed working
- [ ] Day 31 PII purge with double-confirm in Super Admin
- [ ] Audit log of every purge operation

---

## PHASE 5 — WHATSAPP AUTOMATION + OFFLINE + SCALE

**Duration:** Months 13–18
**Goal:** Automated communications live. System handles 500 concurrent tenants. Offline mode works.

### Exit Condition
- [ ] 360dialog WhatsApp blast live with 250/day cap + SMS fallback
- [ ] k6 load test: p95 < 200ms at 500 concurrent tenants
- [ ] OWASP ZAP + npm audit + Semgrep scan clean
- [ ] Offline mode: warden can record payment with zero connectivity and sync on reconnect
- [ ] NPS > 7 from 5+ active clients

### Deliverables

**WhatsApp Automation (requires Meta Business approval — applied in Month 1):**
- [ ] 360dialog API integration
- [ ] Template management: `payment_reminder`, `receipt_confirmation`, `maintenance_update`
- [ ] Monthly blast cron (5th of month, 09:00 PKT)
- [ ] Second blast cron (15th of month, unpaid only)
- [ ] 250/day cap enforcement (Redis: `rl:wa:{hostelId}:daily` TTL 86400s)
- [ ] 2-second delay between sends
- [ ] Jazz API SMS fallback
- [ ] WhatsApp health monitor in Super Admin

**Offline Sync Engine (DO NOT BUILD BEFORE THIS PHASE):**
- [ ] `packages/sync/` — build in complete isolation first
- [ ] SQLite via wa-sqlite (OPFS, browser-native)
- [ ] CRDT last-write-wins with vector clocks
- [ ] `sync_conflicts` table — never silently discard conflicts
- [ ] 10 integration tests before connecting to any UI
- [ ] `POST /api/v1/sync/push` (max 500 rows per batch)
- [ ] Service Worker updated: offline-first app shell
- [ ] Connectivity indicator in header (green/amber/red)
- [ ] "Syncing..." badge when push in progress

**Scale + Security:**
- [ ] k6 load test: 500 concurrent tenants, p95 < 200ms — MUST PASS before launch
- [ ] OWASP ZAP scan clean — MUST PASS before launch
- [ ] npm audit — zero critical CVEs
- [ ] Railway auto-scaling: CPU > 70% → add replica (max 5)
- [ ] PgBouncer transaction mode verified under load
- [ ] 99.9% SLA monitoring active

**Full Urdu i18n:**
- [ ] All UI strings translated (via `next-intl`)
- [ ] RTL layout active when Urdu selected
- [ ] Noto Nastaliq Urdu font rendering verified
- [ ] Urdu dates (Hijri optional, Gregorian in Urdu default)

---

## PHASE 6 — ENTERPRISE + AI TIER 2

**Duration:** Months 18–24
**Goal:** Enterprise features for chain operators. Statistical AI intelligence live. API for integrations.

### Exit Condition
- [ ] Chain manager consolidated view live
- [ ] REST API v1 documented and accessible to Enterprise plan clients
- [ ] Occupancy forecasting active on dashboard
- [ ] NPS > 8 from 5+ active clients
- [ ] Third-party pen test completed

### Deliverables

**Chain Manager Features:**
- [ ] Cross-branch KPI dashboard (consolidated revenue, occupancy, student count)
- [ ] Branch-level breakdown with drill-down
- [ ] Student transfer workflow between branches
- [ ] Cross-branch CNIC duplicate detection
- [ ] Consolidated monthly report (all branches)

**REST API + Webhooks:**
- [ ] `api_keys` table + API key generation UI (Enterprise plan only)
- [ ] `/api/v1/` endpoints accessible via API key (same as JWT access)
- [ ] Webhook catalog: 7 events (payment.recorded, student.added, student.vacated, cancellation.confirmed, subscription.renewed, subscription.failed, maintenance.resolved)
- [ ] Webhook delivery with retry + signature header

**AI Tier 2 (Statistical Intelligence):**
- [ ] Occupancy forecasting widget (PostgreSQL `regr_slope`/`regr_intercept`, 12-month history)
- [ ] Fee collection probability per student (logistic regression coefficients, updated monthly cron)
- [ ] Revenue forecast for current month (range: low/mid/high)
- [ ] Operational health score (composite 0-100, visible on owner dashboard)
- [ ] Materialized view `monthly_hostel_analytics` (refreshed daily)

**Student Portal (Phase 6 — downgraded from DEFERRED):**
- [ ] `portal.hostyllo.app/:token` — signed URL access, no login required
- [ ] View own payment history (last 12 months)
- [ ] Download receipt PDFs
- [ ] Submit maintenance request
- [ ] Separate Vercel app + separate API surface

**White-Label (Enterprise plan only):**
- [ ] Custom subdomain per tenant (e.g., `hostel-xyz.hostyllo.app`)
- [ ] Custom logo and brand color in all receipt PDFs and WhatsApp messages
- [ ] "Powered by HOSTYLLO" footer toggle (on by default, disableable)

**Third-Party Pen Test:**
- [ ] Engage Pakistani security firm (budget: PKR 150,000–300,000)
- [ ] All critical findings resolved before announcing "Enterprise" tier publicly

---

## DEFERRED PHASES (NO BUILD DATE)

> ⚠️ DEFERRED — Not in 24-month solo roadmap.
> Trigger for BOTH phases: (a) at least 1 full-time technical hire, AND (b) MRR > PKR 500,000/mo sustained for 3 consecutive months.
> Do not build. Do not design. Do not discuss with clients until both triggers are met.

### PHASE 7 — AI & AUTOMATION (TIER 3)

| Feature | What It Requires | Why Deferred |
|---------|----------------|-------------|
| AI rent suggestion (ML) | ML model training, GPU inference, data pipeline | Requires ML engineer |
| NLP search ("show unpaid since Jan") | LLM API integration, query parser | Requires AI system design |
| Conversational operational assistant | LLM API, context management | Requires AI system design |
| Predictive student churn model | Training data, model serving | Requires ML engineer |
| Smart WhatsApp send-time optimization | A/B testing infrastructure | Requires data analyst |
| Parent communication portal | Separate auth, portal app | Requires scope expansion |
| Automated hostel health reports (AI-generated) | LLM API, prompt engineering | Requires AI system design |

### PHASE 8 — PLATFORM ECOSYSTEM

| Feature | What It Requires | Why Deferred |
|---------|----------------|-------------|
| Native iOS + Android apps | React Native, Apple/Play Store accounts | Requires mobile developer |
| Marketplace integrations (accounting, HR) | API partnerships, data mapping | Requires BD + engineering |
| Hostel booking network | Marketplace product, entirely different UX | Requires product team |
| Franchise tooling for large chains | White-label infrastructure, contracts | Requires enterprise sales |
| Multi-currency / Stripe USD | International tax, FX compliance | PKR 500k MRR trigger |

---

## DISCIPLINE RULES — THE 5 THINGS THAT WILL KILL THIS PROJECT

| Risk | Rule |
|------|------|
| Building offline sync engine before Phase 5 | COMMIT: Cloud-only Phase 1–4. Sync is Phase 5. No exceptions. |
| Skipping cross-tenant isolation tests | AFTER every endpoint: Hostel A JWT → Hostel B data → 404. Always. |
| Payment formula wrong | PORT calculateUnpaid() verbatim. 14 unit tests must pass before payment UI. |
| Not committing to git after every working feature | `git commit` after every working endpoint. No exceptions. |
| Scope creep from this PRD | Each week: "What is the minimum my client needs today?" Build only that. |

---

*HOSTYLLO Roadmap v14.0 · Zeerak Hostix · May 2026 · Confidential*
*Supersedes: Roadmap v10.0 and all prior roadmap files.*
*Next revision: After Phase 1 exit criteria are confirmed met.*
