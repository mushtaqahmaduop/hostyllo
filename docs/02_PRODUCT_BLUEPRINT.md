# HOSTYLLO — Product Blueprint
## v15.0 — Architecture + Modules + System Map
## Classification: Confidential — Founder Only
## Date: May 2026

---

## 1. PRODUCT IDENTITY

**HOSTYLLO** is a cloud-native, multi-tenant SaaS hostel management platform for Pakistan.

| Attribute | Value |
|-----------|-------|
| Brand | HOSTYLLO (canonical — not Hostex-Space) |
| Domain | hostyllo.app (marketing), app.hostyllo.app (SaaS), admin.hostyllo.app (super admin) |
| Architecture | Multi-tenant SaaS (shared infrastructure, isolated data via PostgreSQL RLS) |
| Market | Pakistani hostels, PGs, boarding houses → global Phase 6+ |
| Source | Ported from 12,000-line Electron app at 50+ live Pakistani hostels |
| Status | Phase 0 — Infrastructure Setup Not Yet Started |

---

## 2. SYSTEM ARCHITECTURE — FIVE LAYERS

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — CLIENT LAYER                                             │
│  Next.js 14 (Vercel)          Admin Panel (Vercel)                  │
│  app.hostyllo.app             admin.hostyllo.app                    │
│  PWA + Mobile-First           super_admin only                      │
│  Framer Motion UI             IP-whitelisted                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS / JWT RS256
┌──────────────────────────────▼──────────────────────────────────────┐
│  LAYER 2 — API LAYER                                                │
│  Fastify 4 (Railway ap-southeast-1)                                 │
│  api.hostyllo.app/api/v1/                                           │
│  42 endpoints (Phase 1) · Cloudflare WAF · @fastify/helmet          │
│  @fastify/rate-limit (Redis) · JWT RS256 middleware                 │
│  withTenant() on every DB call · RLS enforcement                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│  LAYER 3 — DATA LAYER                                               │
│  PostgreSQL via Supabase (ap-south-1)                               │
│  28 tables · Row Level Security on all tenant tables                │
│  withTenant() SET LOCAL inside BEGIN/COMMIT                         │
│  PgBouncer: transaction mode (NOT session)                          │
│  PITR 7-day retention (Supabase Pro — NEVER free tier)              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│  LAYER 4 — ASYNC PROCESSING LAYER                                   │
│  Redis via Upstash (rediss:// TLS required)                         │
│  BullMQ — 7 queues, all with DLQ (moveToDLQ())                      │
│  Queues: pdf-receipts · whatsapp-blast · whatsapp-receipt           │
│          billing-sync · data-export · auto-cancel · rent-generate   │
│  Cron: nightly auto-cancel · monthly rent-generate                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│  LAYER 5 — EXTERNAL SERVICES                                        │
│  360dialog WhatsApp Business API (Phase 3)                          │
│  Paymob JazzCash/EasyPaisa (Phase 4)                               │
│  Resend Email (Phase 1 — password reset)                            │
│  Jazz SMS fallback (Phase 3)                                        │
│  Sentry (error tracking) · Uptime Robot (monitoring)               │
│  Cloudflare (WAF + Turnstile + CDN)                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. MULTI-TENANCY ARCHITECTURE

Every tenant (hostel) is isolated via PostgreSQL Row Level Security.

```
Tenant A (Hostel: Peshawar Student House)
  hostel_id: uuid-aaa
  students: [s1, s2, s3]  ← only visible to hostel_id = uuid-aaa

Tenant B (Hostel: Lahore Boys Hostel)
  hostel_id: uuid-bbb
  students: [s4, s5]      ← ZERO access from tenant A's JWT

Super Admin (Zeerak)
  can impersonate any hostel_id
  every impersonation action logged with impersonated_by
  access: admin.hostyllo.app only, TOTP + IP whitelist
```

**Isolation mechanism:**
```typescript
// withTenant() — MANDATORY on every DB query
await withTenant(hostelId, async (db) => {
  // SET LOCAL app.hostel_id = 'uuid-aaa' inside BEGIN/COMMIT
  // RLS policy: USING (hostel_id = current_setting('app.hostel_id')::uuid)
  return db.query('SELECT * FROM students WHERE deleted_at IS NULL')
})
```

---

## 4. MODULE MAP — ALL 18 MODULES

### Phase 1 Modules (ONLY these ship in Phase 1)

| Module | DB Tables | Key Operations | Auth Required |
|--------|-----------|----------------|---------------|
| **Authentication** | users | login, refresh, logout, reset-password, TOTP | — |
| **Students** | students, room_shifts | CRUD, CSV import, photo, CNIC encrypt | warden+ |
| **Rooms & Beds** | rooms, beds | CRUD, occupancy grid, shift | warden+ |
| **Payments** | payments, payment_extra_charges | CRUD, formula, receipt PDF, defaulters | warden+ |
| **Expenses** | expenses | CRUD, category filter | warden+ |
| **Dashboard** | (aggregation query) | 5 KPIs, alert banners | warden+ |
| **Activity Log** | audit_log | view, search | warden+ |
| **User Management** | users | CRUD, warden flags | hostel_owner |

### Phase 2 Modules

| Module | DB Tables | Key Operations |
|--------|-----------|----------------|
| **Cancellations** | cancellations | add/confirm/restore/auto-confirm cron |
| **Maintenance** | maintenance_requests | CRUD, status progression |
| **Complaints** | complaints | CRUD, resolve |
| **Check-In/Out Log** | checkin_log | log movements |
| **Notices Board** | notices | add/expire/broadcast |
| **Fines** | fines | add/mark-paid |
| **Reports & Archive** | (joins) | monthly PDF, annual grid |
| **Settings (all 11 tabs)** | hostels | all tabs complete |

### Phase 2.5 Modules

| Module | DB Tables | Notes |
|--------|-----------|-------|
| **Bill Split Calculator** | bill_splits | utility bill split tool |
| **Room Inspections** | room_inspections | rating 1–5 |
| **Backup & Restore** | — | via Supabase + export |
| **Global Search** | (search_vector GIN) | Cmd+K, all modules |
| **Annual Archive** | (joins) | 12-month grid |

### Phase 3 Modules

| Module | Key Feature |
|--------|-------------|
| **7-Step Onboarding Wizard** | self-serve signup |
| **Super Admin Panel** | MRR, tenant list, impersonation, DLQ monitor |
| **Landing Page** | hostyllo.app — pricing, CTA, testimonials |
| **NPS Survey** | 14-day trigger, 90-day cooldown |
| **Feedback Widget** | floating button, 500 chars |

### Phase 4+ Modules

| Module | Phase | Dependency |
|--------|-------|-----------|
| Paymob Billing | 4 | Paymob merchant account |
| WhatsApp Automation | 3 | 360dialog approval |
| Offline SQLite Sync | 5 | SQLite Wasm (OPFS) |
| Chain Manager View | 6 | Phase 4 complete |
| AI / ML Features | 7+ | ML engineer hire + MRR trigger |

---

## 5. DATABASE ARCHITECTURE — 28 TABLES

### Core Tables
```
hostels          — one row per tenant, hostel settings, plan info
users            — all users (owners + wardens + chain_managers)
```

### Student & Room Tables
```
students         — CNIC encrypted, soft delete, pg_trgm search_vector
rooms            — number, floor, type, color, capacity
beds             — per-bed granularity, status, occupant
room_shifts      — movement log (student from room A → room B)
```

### Finance Tables
```
payments                — rent + extras + concession; NUMERIC(10,2) ONLY
payment_extra_charges   — dynamic labeled extra charges per payment
expenses                — operational expenses by category
owner_transfers         — transfers to hostel owner
fines                   — student rule violation fines
```

### Operations Tables
```
cancellations      — student vacating workflow
maintenance_requests — room maintenance tickets
complaints         — student/staff complaints
checkin_log        — student movement tracking
notices            — announcements with expiry
room_inspections   — rating 1–5 per room (Phase 2)
bill_splits        — utility bill split results (Phase 2)
```

### Billing & System Tables
```
subscriptions     — plan, status, trial dates
audit_log         — IMMUTABLE (INSERT ONLY) SHA-256 hash chain
warden_shift_log  — warden login/logout tracking
receipt_counter   — atomic sequential per hostel
dlq_jobs          — BullMQ dead-letter queue storage
```

### Product Tables (Phase 2+)
```
api_keys          — Enterprise API access (Phase 6)
feedback          — in-app feedback (Phase 2)
nps_responses     — NPS survey results (Phase 3)
onboarding_events — wizard funnel tracking (Phase 3)
referral_payouts  — referral credit tracking (Phase 4)
```

### Critical Schema Rules
- Every tenant table has `hostel_id UUID NOT NULL REFERENCES hostels`
- Every tenant table has `ENABLE ROW LEVEL SECURITY`
- Every tenant table has `deleted_at TIMESTAMPTZ` (soft delete)
- Payment amounts: `NUMERIC(10,2)` — NEVER float, NEVER JavaScript number
- CNIC: `cnic_encrypted TEXT` — NEVER plaintext

---

## 6. API ARCHITECTURE — v1 CURRENT

**Base URL:** `https://api.hostyllo.app/api/v1/`

**Response envelope:**
```json
{ "success": true, "data": {}, "code": null, "message": null }
{ "success": false, "data": null, "code": "STU_001", "message": "CNIC already exists", "field": "cnic" }
```

**Phase 1 — 42 Endpoints:**
```
POST /auth/login, /auth/refresh, /auth/logout, /auth/reset-password
POST /auth/totp/setup, /auth/totp/verify

GET  /students              — list, search (pg_trgm < 200ms)
POST /students              — add (CNIC encrypt + photo validate)
GET  /students/:id          — profile
PATCH /students/:id         — edit
DELETE /students/:id        — soft delete
POST /students/import       — CSV (formula injection stripped)
GET  /students/search       — typeahead

GET  /rooms                 — list with occupancy status
POST /rooms                 — add
GET  /rooms/:id             — detail + bed grid
PATCH /rooms/:id            — edit
DELETE /rooms/:id           — blocked if active occupants
POST /rooms/shift           — move student between rooms
PATCH /rooms/bulk-fee       — 3 modes

GET  /payments              — list, filter by month/student/status
POST /payments              — calculateUnpaid() + receipt PDF job
GET  /payments/:id
PATCH /payments/:id         — owner only; warden void-request
GET  /payments/defaulters   — unpaid/partial by month
GET  /payments/summary      — monthly totals
POST /payments/generate-monthly — idempotent, all active students
POST /payments/:id/send-receipt — WhatsApp/copy-paste
POST /payments/:id/void-request

GET  /expenses, POST, PATCH /expenses/:id, DELETE /expenses/:id
GET  /expenses/summary

GET  /dashboard/stats       — single aggregation query
GET  /dashboard/alerts      — banner counts

GET  /audit-log, GET /audit-log/:entityId

GET  /users, POST, PATCH /users/:id, DELETE /users/:id

GET  /health                — { db: ok, redis: ok, version }
GET  /PATCH /settings/hostel-info
```

### 6.1 Request Middleware Stack

```
HTTP Request arrives
     ↓
Cloudflare WAF (blocks known threats, DDoS)
     ↓
@fastify/rate-limit (Redis: rl:login:{ip})
     ↓
Auth Middleware:
  → jose.jwtVerify(token, publicKey, {algorithms: ['RS256']})
  → Check Redis jti blocklist
  → Fetch role from DB (NEVER from JWT payload)
  → Set req.hostelId = jwt.hostelId
     ↓
Feature Gate (checkPlanFeature middleware — Phase 4+)
     ↓
Route Handler
  → withTenant(req.hostelId, async (db) => {
      BEGIN
      SET LOCAL app.hostel_id = req.hostelId  ← RLS active for this transaction
      [query]
      COMMIT
    })
  → RLS policy: USING (hostel_id = current_setting('app.hostel_id')::uuid)
  → Any query touching wrong hostel: 0 rows returned (not error)
     ↓
Response: { success: true, data: {...} }
```

---

## 7. SECURITY ARCHITECTURE — 34 RISKS MITIGATED

See PRD v13.0 Section 14 for full table. Summary of Critical risks:

| Risk | Status | Implementation |
|------|--------|----------------|
| JWT Algorithm Confusion | ⬜ Phase 1 | `algorithms: ['RS256']` |
| RLS Race Condition | ⬜ Phase 1 | withTenant() in BEGIN/COMMIT |
| IDOR | ⬜ Phase 1 | hostel_id from JWT only |
| RLS Disabled | ⬜ Phase 1 | CI gate blocks deploy |
| Privilege Escalation | ⬜ Phase 1 | Role from DB every request |
| CNIC Unencrypted | ⬜ Phase 1 | AES-256 before insert |
| Brute Force | ⬜ Phase 1 | 10 attempts/15min/IP |
| CSRF | ⬜ Phase 1 | SameSite=Strict httpOnly |
| TOTP Bypass | ⬜ Phase 1 | Middleware check |

---

## 8. BULLMQ QUEUE ARCHITECTURE

All 7 queues must have `worker.on('failed')` calling `moveToDLQ()` before Phase 1 launches.

```
Queue: pdf-receipts
  Attempts: 3, exponential backoff (2s/4s/8s)
  DLQ action: in-app warning badge + "Regenerate" button

Queue: whatsapp-blast
  Attempts: 3, 2s delay between sends, 250/day cap
  DLQ action: copy-paste modal opens automatically

Queue: whatsapp-receipt
  Attempts: 3
  DLQ action: copy-paste modal opens

Queue: billing-sync
  Attempts: 5
  DLQ action: Super Admin red badge

Queue: data-export
  Attempts: 3
  DLQ action: email owner to retry

Queue: auto-cancel
  Attempts: 5
  DLQ action: Super Admin alert banner

Queue: rent-generate
  Attempts: 5
  DLQ action: Super Admin warning
```

---

## 9. CICD PIPELINE

```
Trigger: git push to any branch

Step 1: lint-and-typecheck
  — All PRs + main
  — Blocks: unit-tests

Step 2: unit-tests
  — 14 payment formula tests RUN FIRST
  — All PRs + main
  — Blocks: infra-gates

Step 3: infra-gates (main branch only)
  — PITR not enabled → FAIL
  — Supabase plan = free → FAIL
  — Last backup > 48h → FAIL
  — RLS disabled on any table → FAIL
  — ESLint security violations → FAIL
  — Blocks: deploy

Step 4: deploy (main branch only)
  — Railway (API)
  — Vercel (web + admin)
```

---

## 10. DESIGN SYSTEM SUMMARY

Full specification in `04_UX_DESIGN_SYSTEM.md`.

**Design Tokens (canonical):**
```
--bg:          #0b0e14 (dark)  / #f8fafc (light)
--surface:     #111827 (dark)  / #ffffff (light)
--surface-2:   #1a2234 (dark)  / #f1f5f9 (light)
--border:      #1e293b (dark)  / #e2e8f0 (light)
--gold:        #c9a84c (dark)  / #a07c2a (light)  — primary action
--teal:        #3dd8c0 (dark)  / #0ea5a0 (light)  — success, paid
--text:        #e2e8f4 (dark)  / #0f172a (light)
--text-muted:  #94a3b8 (dark)  / #64748b (light)
--red:         #ef4444 (dark)  / #dc2626 (light)  — danger, pending
--amber:       #f59e0b (dark)  / #d97706 (light)  — warnings, partial
```

**Typography:** Figtree (Latin) + Noto Nastaliq Urdu (Urdu text) + DM Mono (money/CNIC)

**Component Rules:**
- Buttons: 36px height, 8px radius, gold primary
- Inputs: 40px height, gold border on focus
- Loading: skeleton shimmer ONLY — NEVER spinners
- Animations: Framer Motion — 200ms page, 180ms modals
- Numbers: `Intl.NumberFormat('en-PK', { currency: 'PKR' })`

---

## 11. IMPLEMENTATION ARTIFACTS READY TO USE

These files exist in the uploaded packages and should be used immediately:

| File | Location | What It Is |
|------|----------|-----------|
| `require-with-tenant.js` | hostyllo_fixes/eslint/ | ESLint rule — CI enforcement |
| `no-hostel-id-from-request.js` | hostyllo_fixes/eslint/ | ESLint rule — CI enforcement |
| `paymentService.test.ts` | hostyllo_fixes/tests/ | 14 payment unit tests |
| `verify-pitr.sh` | hostyllo_fixes/infra/ | PITR verification script |
| `ci.yml` | hostyllo_fixes/infra/ | GitHub Actions CI pipeline |
| `BULLMQ_DLQ_SPEC.md` | hostyllo_fixes/bullmq/ | BullMQ DLQ implementation guide |
| `.claude/commands/` | hostyllo-claude-setup/ | 6 Claude Code slash commands |

---

## 12. DEFERRED SYSTEMS — PHASE 7+ AI VISION

The aspirational enterprise AI vision (from master prompt) is architecturally planned but explicitly deferred. These systems require ML infrastructure and dedicated engineering that a solo founder cannot staff in 24 months.

**When trigger is met (MRR > PKR 500k/mo + ML engineer hired):**

| System | Description | Trigger |
|--------|-------------|---------|
| AI Rent Suggestion | Median rents from anonymized data by city/room type | Phase 7 |
| ML Defaulter Prediction | Risk score per student per month | Phase 7 |
| Predictive Occupancy | Seasonal forecasting, vacancy trends | Phase 7 |
| Smart WhatsApp Personalization | Dynamic message templates | Phase 7 |
| AI Operations Assistant | Natural language queries ("show unpaid residents") | Phase 7 |
| Anomaly Detection | Payment pattern anomalies, unusual access | Phase 7 |

**Rule-based intelligence available immediately (no ML required):**
- Dashboard alert banners (already specified in v13)
- Occupancy < 60% warning
- Auto-confirm expired cancellations (nightly cron)
- Defaulters list auto-generation
- WhatsApp reminder automation (template-based, Phase 3)
- Payment status auto-classification (formula-based)

---

## 13. MONOREPO FOLDER STRUCTURE

```
hostyllo/
├── apps/
│   ├── web/                          # Next.js 14 (Vercel, app.hostyllo.app)
│   │   ├── src/app/                  # App Router
│   │   │   ├── (auth)/login/
│   │   │   ├── (auth)/forgot-password/
│   │   │   ├── onboarding/wizard/[step]/
│   │   │   ├── dashboard/
│   │   │   ├── students/
│   │   │   ├── rooms/
│   │   │   ├── payments/
│   │   │   ├── expenses/
│   │   │   ├── reports/
│   │   │   ├── issues/
│   │   │   ├── cancellations/
│   │   │   ├── fines/
│   │   │   ├── checkin/
│   │   │   ├── notices/
│   │   │   └── settings/[tab]/
│   │   ├── src/components/
│   │   ├── public/manifest.json     # PWA manifest
│   │   └── next.config.ts
│   │
│   ├── api/                          # Fastify backend (Railway)
│   │   ├── src/
│   │   │   ├── routes/               # One file per route group
│   │   │   ├── middleware/           # auth, rate-limit, security-headers
│   │   │   ├── services/             # Business logic (payment, receipt, etc.)
│   │   │   └── workers/              # BullMQ workers (7)
│   │   └── src/index.ts
│   │
│   └── admin/                        # Super Admin (Vercel, admin.hostyllo.app)
│       └── (Phase 3 — not built now)
│
├── packages/
│   ├── db/                           # Shared DB package
│   │   ├── src/
│   │   │   ├── withTenant.ts         # CRITICAL — build first
│   │   │   ├── paymentService.ts     # calculateUnpaid() verbatim from Electron
│   │   │   ├── errorCodes.ts         # All error codes
│   │   │   ├── types.ts              # TypeScript DB types
│   │   │   └── __tests__/
│   │   │       └── paymentService.test.ts  # 14 unit tests
│   │   └── package.json
│   │
│   ├── ui/                           # Shared component library
│   │   ├── src/components/           # shadcn/ui + custom
│   │   ├── src/tokens.css            # Design tokens (CSS variables)
│   │   └── package.json
│   │
│   └── config/                       # Shared config
│       ├── eslint-plugin-hostyllo/   # Custom ESLint rules
│       │   └── rules/
│       │       ├── require-with-tenant.js
│       │       └── no-hostel-id-from-request.js
│       ├── eslint.config.js
│       ├── tsconfig.base.json
│       └── prettier.config.js
│
├── scripts/
│   └── verify-pitr.sh               # Run before every phase launch
│
├── migrations/                      # PostgreSQL migrations (numbered)
│   ├── 001_core.sql                 # hostels, users, students, rooms, beds
│   ├── 002_finance.sql              # payments, extras, expenses, transfers, fines
│   ├── 003_operations.sql           # cancellations, shifts, maintenance, etc.
│   └── 004_system.sql              # audit_log, subscriptions, receipt_counter, etc.
│
├── docs/                            # Project documentation
│   ├── 01_MASTER_PRD_v13.md        # AUTHORITATIVE PRD
│   ├── 02_CLAUDE_v13.md            # This agent instructions file
│   ├── 03_PRODUCT_BLUEPRINT.md     # This file
│   ├── 04_UX_DESIGN_SYSTEM.md     # MISSING — must create
│   ├── 05_BUILD_STATE.md           # Phase tracker
│   ├── 06_ISSUES_LOG.md            # Known issues
│   └── tasks/
│       ├── todo.md
│       └── lessons.md
│
├── .github/
│   └── workflows/
│       └── ci.yml                   # From hostyllo_fixes/infra/ci.yml
│
├── .claude/
│   └── commands/                   # Slash commands from hostyllo-claude-agents.zip
│       ├── review.md
│       ├── security.md
│       ├── test.md
│       ├── db.md
│       ├── architect.md
│       ├── debug.md
│       └── full-review.md
│
├── pnpm-workspace.yaml
├── package.json
└── turbo.json
```

---

*HOSTYLLO Product Blueprint v13.0 · Zeerak Hostix · May 2026 · Confidential*
