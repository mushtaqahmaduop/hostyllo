# HOSTYLLO — Master Product Requirements Document
## v15.0 — Unified Suite Edition
### Single Source of Truth — Supersedes PRD v14.0, v13.0 and all prior versions

| Field | Value |
|-------|-------|
| Product | HOSTYLLO |
| Owner | Zeerak Hostix (Solo Founder) |
| Version | v15.0 — Unified Suite Edition |
| Previous | v14.0 superseded |
| Status | Active · May 2026 |
| Classification | Confidential — Founder Only |
| Tech Stack | Next.js 14 · Fastify 4 · PostgreSQL (Supabase) · Redis (Upstash) · BullMQ · Railway · Vercel |
| Target Market | Pakistani Hostels, PGs, Boarding Houses, Student Housing, Co-Living → Global Phase 6+ |
| Active Phases | 0–6 (24 months) |
| Deferred | Phases 7–8 — Hire + MRR trigger required |
| Key Changes from v13 | + S17 Enterprise UX System (expanded), + S18 AI Architecture, + S19 Automation Engine, + S20 Mobile-First Architecture, + S21 SEO & Growth Architecture, + S22 Notification Intelligence, + S23 Design System Standards, + S24 Analytics Intelligence; all invariants preserved; solo execution rules preserved; + v15.0 merge: UX Design System integrated, Build State created, Feature Map FR-IDs restored from v13 audit |
| Authority | Supersedes: PRD v14.0, v13.0, v12.0, v11.0, v10.0, v9.1, Blueprint v8–v11, all ZIP archives |

> **How to use this document:** Every feature decision, API design, security rule, and architecture pattern in this PRD is authoritative. If this PRD conflicts with any code or other document, this PRD wins. When building, cite the requirement ID (e.g., FR-STU-01). No speculation, no invention — every core feature traces to the running Electron app at 50+ live Pakistani hostels.

---

## CHANGELOG

| Version | Date | Change |
|---------|------|--------|
| v15.0 | May 2026 | Unified merge of v13 gap-fill suite + v14 enterprise suite. UX Design System (04_UX_DESIGN_SYSTEM.md) added. No feature additions. Solo rules preserved. All invariants preserved. |
| v14.0 | May 2026 | Enterprise Evolution: + S32 Enterprise UX Architecture, + S33 AI Systems Architecture, + S34 Automation Engine, + S35 Mobile-First Operations, + S36 SEO + Growth Architecture, + S37 Notification Intelligence, + S38 Design System Standards, + S39 Operational Analytics; repositioned product vision; AI features properly phased; solo invariants preserved |
| v13.0 | May 2026 | Solo Rules, Phase 0 Setup, Phase 1 Hard Cut, Acquisition Plan, Support Plan, Budget, PDPA |
| v12.0 | April 2026 | Master Architect Pass |

---

## TABLE OF CONTENTS

## SUPPORTING DOCUMENTS

These files expand specific PRD sections into standalone references.
If any supporting document conflicts with this PRD, this PRD wins.

| Document | Expands |
|----------|---------|
| 03_SECURITY_ARCHITECTURE.md | Section 19 |
| 04_DATABASE_ARCHITECTURE.md | Section 17 |
| 05_API_SPECIFICATION.md | Section 18 |
| 06_SAAS_OPERATIONS.md | Sections 29, 32, 37 |
| 07_TENANT_LIFECYCLE.md | Sections 26, 29, 37 |
| 08_AUDIT_COMPLIANCE.md | Section 34 |
| 09_FEATURE_FLAG_ARCHITECTURE.md | Section 44 |
| 10_OBSERVABILITY_ARCHITECTURE.md | Section 43 |
| 11_BUSINESS_CONTINUITY.md | Sections 19, 43 |
| 12_ENTERPRISE_READINESS_ROADMAP.md | Section 44 |

---

**FOUNDATION (Read First)**
- Section 00 · Solo Founder Operating Rules ← READ EVERY SESSION
- Section 01 · Product Overview, Vision & Positioning
- Section 02 · Source of Truth — The Electron App
- Section 03 · Problem Statement
- Section 04 · User Personas & Role Matrix

**EXECUTION PLAN**
- Section 05 · Phase 0 — Infrastructure Setup
- Section 06 · Phase 1 MVP Scope — Hard Cut

**FEATURE REQUIREMENTS (All Modules)**
- Section 07 · Student Management
- Section 08 · Room & Bed Management
- Section 09 · Payments & Receipt Engine
- Section 10 · Expenses Module
- Section 11 · Cancellations Module
- Section 12 · Maintenance & Complaints
- Section 13 · Owner Transfers
- Section 14 · Fines, Check-In/Out, Notices
- Section 15 · Reports & Annual Archive
- Section 16 · Global Search & Settings

**INFRASTRUCTURE**
- Section 17 · Database Schema — 28 Tables
- Section 18 · API Design & Standards
- Section 19 · Security Architecture — 34 Risks
- Section 20 · Offline-First Sync Engine (Phase 5)
- Section 21 · Performance & Caching
- Section 22 · CI/CD Pipeline
- Section 23 · Environment Variables
- Section 24 · Error Codes
- Section 25 · Disaster Recovery

**BUSINESS SYSTEMS**
- Section 26 · Billing & Subscription Engine
- Section 27 · WhatsApp & Notification System
- Section 28 · Super Admin Panel
- Section 29 · Onboarding Wizard — 7 Steps
- Section 30 · Monetization & Pricing
- Section 31 · Customer Acquisition Plan
- Section 32 · Support & Operations Plan
- Section 33 · Infrastructure Budget
- Section 34 · Legal & Compliance (PDPA)

**ENTERPRISE SYSTEMS (NEW IN v14)**
- Section 35 · Enterprise UX Architecture
- Section 36 · AI Systems Architecture (Phased)
- Section 37 · Automation Engine
- Section 38 · Mobile-First Operational Architecture
- Section 39 · SEO & Growth Architecture
- Section 40 · Notification Intelligence System
- Section 41 · Design System Standards
- Section 42 · Operational Analytics Architecture
- Section 43 · Observability & Monitoring

**ROADMAP**
- Section 44 · Phase Roadmap — 6 Active + 2 Deferred
- Section 45 · Risks & Assumptions

---

## SECTION 00 · SOLO FOUNDER OPERATING RULES

> 📍 Build phase: [PHASE 0] | Priority: [P0]

**Read before every work session. Non-negotiable.**

| Rule ID | Rule | Why |
|---------|------|-----|
| R-01 | Ship Phase 1 before touching Phase 2 scope | Every hour on Phase 2 while Phase 1 is incomplete delays your first PKR |
| R-02 | Never promise a client a feature in Phase 3+ | Verbal commitments create obligation without delivery |
| R-03 | Run 14 payment unit tests before every deploy | Wrong formula = receipt error = unrecoverable reputational damage |
| R-04 | Run `verify-pitr.sh` on the 1st of every month | Silent PITR degradation is invisible until you need it |
| R-05 | DR drill on 1st of every quarter | An untested backup is not a backup |
| R-06 | Never add a PRD section without deleting or deferring something | Scope creep kills solo products silently |
| R-07 | Collect money from clients manually in Phase 1–3 | Manual billing starts day one. Paymob automation takes weeks to set up |
| R-08 | One paying client > one month of feature development | Revenue validates the product |
| R-09 | All client communications through WhatsApp group | Verbal promises are unauditable |
| R-10 | If it is not in this PRD, it does not exist | Memory is unreliable |
| R-11 | Enterprise UX sections (35–42) are VISION documents | They define the product ceiling. Build toward them phase by phase, not all at once |
| R-12 | AI features are Phase 7+ unless explicitly tagged Phase 2–6 | No ML infrastructure before MRR trigger |

### Phase 1 Definition of Done
**Phase 2 does not begin until every item below is checked. No exceptions.**

- [ ] All 28 tables created with RLS enabled
- [ ] `verify-pitr.sh` returns exit 0 and result is logged with timestamp
- [ ] All 14 payment unit tests pass in CI
- [ ] Cross-tenant isolation test passes for every endpoint (JWT A → data B → 404)
- [ ] `withTenant()` ESLint rule active and blocking violations in CI
- [ ] `/health` endpoint returns `db: ok` and `redis: ok`
- [ ] bcrypt rounds verified ≥ 12 in auth integration test
- [ ] CNIC encrypted at rest — plaintext `cnic` column must not exist
- [ ] Soft-delete verified: `deleted_at IS NOT NULL` records excluded from all list endpoints
- [ ] Receipt counter atomic function deployed and tested for concurrency
- [ ] BullMQ DLQ confirmed on all 7 queues
- [ ] Sentry error tracking receiving events
- [ ] No secrets in git — `git log -p | grep -iE "key|secret|password"` returns empty

---

## SECTION 01 · PRODUCT OVERVIEW, VISION & POSITIONING

> 📍 Build phase: [PHASE 0] | Priority: [P0]

### 1.1 Repositioned Product Vision

**Category:** AI-powered operational intelligence platform for modern accommodation businesses.

**What HOSTYLLO Is — Not Is:**

| NOT | IS |
|-----|-----|
| Hostel ERP software | Operational intelligence platform |
| Admin management panel | Warden-first, mobile-native command center |
| Generic management system | Pakistan-native, AI-augmented, globally scalable |
| Feature-heavy enterprise tool | Workflow-intelligent, friction-free daily operations |

**Brand Pillars (Phase 3+ public positioning):**
- **Trust** — Built from real hostel operations. Every formula proven at 50+ live hostels.
- **Speed** — Linear-like UX. Every workflow completes in the fewest possible taps.
- **Intelligence** — AI-surfaced insights. Problems flagged before they become incidents.
- **Reliability** — Pakistan-aware (offline mode, Urdu, JazzCash). Works where others break.

### 1.2 Mission

Digitize hostel management in Pakistan with the reliability of pen-and-paper — but with cloud backup, professional receipts, automated rent reminders, and operational intelligence that anticipates problems before they happen.

### 1.3 Non-Negotiable Product Truths

1. **Pakistani internet is unreliable.** Phase 1–4: connectivity indicator + graceful degradation. Phase 5: full offline mode with SQLite sync.
2. **Payment formula correctness is existential.** 14 unit tests mandatory before any payment UI.
3. **WhatsApp is primary communication.** Email is fallback. Copy-paste is last resort.
4. **CNIC is PII.** AES-256 encrypted at rest. Never in logs.
5. **Audit log is immutable.** INSERT only. No UPDATE, no DELETE. Ever.
6. **Mobile first.** Wardens use phones, not desktops. Every screen designed for 390px first.

---

## SECTION 02 · SOURCE OF TRUTH — THE ELECTRON APP

> 📍 Build phase: [PHASE 0] | Priority: [P0]

### 2.1 What the Electron App Is

A 100% offline, single-hostel Windows Electron application. All data in `localStorage` as a single JSON object. ~700KB vanilla JavaScript (`app.js`), ~12,000 lines, 316 functions, 14 modules, 11 settings tabs. Currently live at 50+ Pakistani hostels.

**Architectural verdict:** Business logic: B+ — production-proven, correct, trusted. Architecture: D — single 700KB monolith with localStorage as database. Cannot be patched for SaaS. Must be replaced entirely. Business logic extracted and ported verbatim.

### 2.2 Functions Marked for Verbatim Port

| Electron Function | SaaS Location | Test File | Status |
|-------------------|--------------|-----------|--------|
| `recalcUnpaid()` / `calculateUnpaid()` | `paymentService.ts` | 14 unit tests | PORT FIRST |
| `_payMatchesMonth()` | `paymentService.ts` | Integration | Must port |
| `fmtCnic()` | `formatters.ts` | `formatters.test.ts` | Must port |
| `fmtPhone()` | `formatters.ts` | `formatters.test.ts` | Must port |
| `processAutoCancellations()` | `autoCancelCron.ts` | Unit test | Must port |
| `buildReceiptHTML()` | `receiptService.ts` | Snapshot test | Must port |

---

## SECTION 03 · PROBLEM STATEMENT

| ID | Problem | Impact | Priority |
|----|---------|--------|----------|
| P-01 | Electron app is machine-bound — no web/mobile access | Wardens cannot work remotely | P0 |
| P-02 | Hostel chains have no central dashboard | Owners cannot see consolidated revenue | P0 |
| P-03 | Payment reminders are manual WhatsApp messages one by one | Hours of monthly manual work | P0 |
| P-04 | One-time license model — no recurring revenue | Unsustainable for developer | P0 |
| P-05 | Unreliable internet in Pakistan | Data loss on outage | P0 |
| P-06 | No platform-level insight — who is paying or churning | Zero growth visibility | P0 |
| P-07 | No tamper-evident audit trail | Accounting disputes unresolvable | P0 |
| P-08 | Receipts hand-written or from Excel | Unprofessional, error-prone | P0 |
| P-09 | No duplicate detection across locations for chains | Students registered twice | P1 |
| P-10 | No bulk tools — CSV import, bulk fee update, bulk WhatsApp | Manual work for every action | P0 |
| P-11 | No dark mode — wardens working on phones at night | Poor UX, eye strain | P0 |
| P-12 | No structured onboarding — undefined first-run experience | High early abandonment | P0 |
| P-13 | No landing page | No self-serve acquisition | P1 |
| P-14 | No operational intelligence — problems discovered late | Reactive management only | P2 |
| P-15 | No predictive alerts — defaulters identified too late | Revenue leakage | P2 |

---

## SECTION 04 · USER PERSONAS & ROLE MATRIX

### 4.1 Personas

| Persona | Description | Key Needs | Device |
|---------|-------------|-----------|--------|
| **Hostel Owner** | Owns 1–10 hostels. Manages subscriptions, sees all revenue. Often non-technical. | Dashboard revenue, warden management, subscription control, multi-location view | Phone primary |
| **Warden / Staff** | Day-to-day operator. Adds students, records payments, prints receipts. Under time pressure, on mobile, in poor connectivity. | Fast student lookup, quick payment recording, receipt printing, offline mode | Phone (primary), desktop (secondary) |
| **Chain Manager** | Manages multiple branches. Needs consolidated view. | Cross-branch KPIs, student transfers, revenue comparison | Desktop primary |
| **Super Admin (Zeerak)** | Platform developer. God-mode. Monitors all tenants. | All tenant data, billing management, MRR metrics, platform health, impersonation | Desktop only |
| **Student (Phase 6)** | Hostel resident. Read-only self-service portal. | Payment history, receipt downloads, maintenance request | Phone |

### 4.2 Role Permission Matrix

| Action | super_admin | hostel_owner | chain_manager | warden | viewer |
|--------|:-----------:|:------------:|:-------------:|:------:|:------:|
| Add/edit student | ✓ | ✓ | ✓ | ✓ | — |
| Delete student | ✓ | ✓ | — | can_delete flag | — |
| Record payment | ✓ | ✓ | ✓ | ✓ | — |
| Edit payment | ✓ | ✓ | — | void-request only | — |
| Manage rooms | ✓ | ✓ | ✓ | ✓ | — |
| Settings access | ✓ | ✓ | — | can_settings flag | — |
| View reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage billing | ✓ | ✓ | — | — | — |
| Suspend tenants | ✓ | — | — | — | — |
| Impersonate | ✓ | — | — | — | — |
| Export all data | ✓ | ✓ | — | — | — |
| AI insights (Phase 7) | ✓ | ✓ | ✓ | read-only | — |

### 4.3 Per-Warden Flags (Fetched from DB on Every Request — Never from JWT)

- `can_delete` — can permanently remove students/records (default: true)
- `can_settings` — can access Settings module (default: false)
- `can_edit` — can edit existing records (default: true)

---

## SECTION 05 · PHASE 0 — INFRASTRUCTURE SETUP

> 📍 Build phase: [PHASE 0] | Priority: [P0]
> **Duration: 1 week. Exit condition: `verify-pitr.sh` exits 0.**

| Step | Action | Verification |
|------|--------|-------------|
| 1 | Create Railway project. Enable Pro plan. | Billing dashboard shows active Pro plan. |
| 2 | Create Supabase project. Upgrade to Pro plan immediately. Free tier is FORBIDDEN. | Dashboard shows Pro plan. |
| 3 | Enable PITR in Supabase. Set retention to 7 days. Run `verify-pitr.sh`. | Script returns exit 0. Log with timestamp. |
| 4 | Create Upstash Redis. Verify URL starts with `rediss://` (TLS required). | `redis-cli ping` returns PONG. |
| 5 | Create Vercel project for web (`app.hostyllo.app`) and admin (`admin.hostyllo.app`). | Both in Vercel dashboard with custom domains. |
| 6 | Create GitHub repo. Enable branch protection on `main`. | Direct push to `main` is rejected. |
| 7 | Add all env vars from Section 23 to Railway and Vercel. Verify zero secrets in source. | `git log -p | grep -iE "key|secret|password"` returns empty. |
| 8 | Set up Sentry. Deliberately throw test error. Verify event appears. | Test event visible in Sentry within 60 seconds. |
| 9 | Set up Uptime Robot monitor on `GET /health`. | Test alert fires correctly. |
| 10 | Build CI pipeline (GitHub Actions): `lint → unit-tests → infra-gates → deploy`. | GitHub Actions shows green pipeline run. |

---

## SECTION 06 · PHASE 1 MVP SCOPE — HARD CUT

> **These and ONLY these modules ship in Phase 1. Everything else is Phase 2+.**

| Module | Ships Phase 1? | Reason if No |
|--------|:--------------:|--------------|
| Authentication & Security | **YES** | Core — nothing works without it |
| Students | **YES** | Core daily operation |
| Rooms & Beds | **YES** | Core daily operation |
| Payments & Receipts | **YES** | Revenue-generating. Payment formula is the product. |
| Expenses | **YES** | Daily operation; required for Dashboard Net Fund |
| Dashboard (5 KPI cards + alert banners) | **YES** | First screen wardens see |
| Activity Log / Audit | **YES** | Financial accountability from day one |
| User Management | **YES** | Required to manage access for real clients |
| Cancellations | NO | Phase 2 |
| Maintenance & Complaints | NO | Phase 2 |
| Reports & Annual Archive | NO | Phase 2 |
| Check-In/Out Log | NO | Phase 2 |
| Notices Board | NO | Phase 2 |
| Fines | NO | Phase 2 |

---

## SECTION 07 · STUDENT MANAGEMENT

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-STU-01 | Add student: name, father name, CNIC/B-Form, phone, emergency contact, email, occupation, address, city, photo, join date, room/bed assignment, rent, deposit, admission fee | P0 |
| FR-STU-02 | CNIC auto-format: `XXXXX-XXXXXXX-X` — port `fmtCnic()` verbatim | P0 |
| FR-STU-03 | Phone auto-format: `03XX-XXXXXXX` — port `fmtPhone()` verbatim | P0 |
| FR-STU-04 | CNIC AES-256 encrypted in DB — masked in all API responses | P0 |
| FR-STU-05 | CNIC reveal requires explicit user action + creates audit_log entry | P0 |
| FR-STU-06 | Student photo: upload from file OR live camera capture (getUserMedia API) | P1 |
| FR-STU-07 | Photo validation: MIME type AND magic bytes checked, max 2MB, resize to 200×200 | P0 |
| FR-STU-08 | Security deposit tracking: deposit_pkr, deposit_status, deposit_paid_at, deposit_notes | P1 |
| FR-STU-09 | Admission fee per student: admission_fee_pkr column | P0 |
| FR-STU-10 | Status lifecycle: active → on_leave → vacated — room and bed freed on vacate | P0 |
| FR-STU-11 | Search by name, CNIC, room, city, parent name — results < 200ms via pg_trgm GIN index | P0 |
| FR-STU-12 | Duplicate CNIC detection — warn and block if duplicate in same hostel | P0 |
| FR-STU-13 | Student profile: full payment history, room shift history, check-in log, audit trail | P0 |
| FR-STU-14 | "Save & Proceed to Payment" — opens payment modal pre-filled after student add | P0 |
| FR-STU-15 | Former students view — list all vacated/cancelled with restore option | P0 |
| FR-STU-16 | Bulk CSV import: sanitize formula chars (`= + - @`), validate, preview, confirm | P0 |
| FR-STU-17 | Export student list: CSV + branded PDF with month selector | P0 |
| FR-STU-18 | Soft-delete: deleted_at TIMESTAMPTZ — never hard delete students | P0 |
| FR-STU-19 | Cross-branch duplicate CNIC detection for chain owners | P1 |
| FR-STU-20 | Student transfer between branches (chain owners only) | P1 |
| FR-STU-21 | Pakistani city autocomplete — 200+ cities pre-loaded | P1 |

---

## SECTION 08 · ROOM & BED MANAGEMENT

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-RM-01 | Add/edit rooms: number, floor, type, color, capacity, fee, amenities, notes | P0 |
| FR-RM-02 | Room types with hex color (port from Electron settings.roomTypes[].colour) | P0 |
| FR-RM-03 | Bed-level granularity — each bed has own ID, label, status, and occupant | P0 |
| FR-RM-04 | Real-time occupancy grid: gold = free seats, green = full, grey = maintenance | P0 |
| FR-RM-05 | Assign student to specific bed — prevent overbooking beyond capacity | P0 |
| FR-RM-06 | Room shift: move student between rooms — logs to room_shifts — auto-suggests new rent | P0 |
| FR-RM-07 | Maintenance mode: room blocked from assignment with estimated return date | P0 |
| FR-RM-08 | Room history: all students who ever stayed with their dates | P0 |
| FR-RM-09 | Bulk fee update (3 modes): by room type / apply to all / per-student table | P0 |
| FR-RM-10 | Delete room: blocked if active occupants — return RM_002 error | P0 |

---

## SECTION 09 · PAYMENTS & RECEIPT ENGINE

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-PAY-01 | Record payment: student, monthly rent, admission fee, extra charges (dynamic, labeled), concession + description, amount paid, due date, payment method, month, date, notes | P0 |
| FR-PAY-02 | **Payment formula (port verbatim):** `totalDue = rent + admFee + sum(extras) − concession; unpaid = Math.max(0, totalDue − paid); status = paid >= totalDue ? 'paid' : paid > 0 ? 'partial' : 'pending'` | P0 |
| FR-PAY-03 | Student typeahead in payment form: 200ms debounced — auto-fills rent, method, unpaid balance | P0 |
| FR-PAY-04 | Sequential PDF receipt: hostel-branded, receipt number never resets, atomic via `get_next_receipt_number()` | P0 |
| FR-PAY-05 | Receipt PDF includes: hostel logo + name + tagline, receipt number, student name + masked CNIC, room, month, fee breakdown, paid amount, remaining balance, due date, payment method, warden signature area | P0 |
| FR-PAY-06 | Auto-generate monthly Pending records: one-click for all active students — idempotent, ON CONFLICT guard | P0 |
| FR-PAY-07 | Defaulters list: students with unpaid/partial for any given month + total amount | P0 |
| FR-PAY-08 | WhatsApp reminder: per-student pre-filled message with hostel name, student name, due amount, room, month | P0 |
| FR-PAY-09 | Bulk WhatsApp blast to defaulters: 2s delay, 250/day cap, SMS fallback | P0 |
| FR-PAY-10 | Payment edit with audit log — hostel_owner only; warden can only request void | P0 |
| FR-PAY-11 | Void workflow: warden void-request → owner void-confirm | P0 |
| FR-PAY-12 | Soft-delete: deleted_at on payments — never hard delete | P0 |
| FR-PAY-13 | Partial payment support: track balance owed across months | P0 |
| FR-PAY-14 | Overpayment: excess auto-credited to next month | P1 |
| FR-PAY-15 | Advance payment: 3+ months upfront auto-applied monthly | P1 |
| FR-PAY-16 | WhatsApp receipt immediately after payment recorded — "Send Receipt" button | P0 |
| FR-PAY-17 | **Idempotency key on payment creation** — `X-Idempotency-Key` header, stored in Redis 24h | P0 |

> ⛔ INVARIANT: 14 payment formula unit tests run in CI before any payment route code is merged. Blocking. No exceptions.

**14 Required Payment Test Cases:**

| Test | Input | Expected |
|------|-------|----------|
| Full payment | rent=8000, paid=8000 | status='paid', unpaid=0 |
| Partial | rent=8000, paid=5000 | status='partial', unpaid=3000 |
| Zero | rent=8000, paid=0 | status='pending', unpaid=8000 |
| Admission fee | rent=8000, admFee=2000, paid=10000 | status='paid' |
| Two extras | rent=8000, extras=[800+200], paid=9000 | status='paid' |
| Concession | rent=8000, concession=1000, paid=7000 | status='paid' |
| All fields combined | see test file | correct totalDue |
| Overpayment | rent=8000, paid=9000 | unpaid=0 (NOT -1000) |
| Exact boundary | rent=12000, paid=12000 | status='paid' (NOT 'partial') |
| One below | rent=12000, paid=11999 | status='partial', unpaid=1 |
| Large concession | rent=8000, concession=8000, paid=0 | status='paid', unpaid=0 |
| Empty extras | rent=8000, extras=[], paid=8000 | status='paid' |
| All zeros | rent=0, paid=0 | status='paid' (0 >= 0) |
| Five extras, zero paid | rent=5000, extras=[200+300+400+500+600], paid=0 | status='pending', unpaid=7000 |

---

## SECTION 10 · EXPENSES MODULE

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-EXP-01 | Expense list: category, description, amount PKR, date — filterable by month | P0 |
| FR-EXP-02 | Add expense: category, description, amount, date, notes | P0 |
| FR-EXP-03 | Edit and soft-delete expenses | P0 |
| FR-EXP-04 | Default categories: Electricity, Water, Gas, Maintenance, Cleaning, Security, Internet, Furniture, Plumbing, Other | P0 |
| FR-EXP-05 | Configurable categories in Settings → Expense Categories tab | P0 |
| FR-EXP-06 | Expense summary: total by category for month | P0 |
| FR-EXP-07 | Expenses included in Dashboard Net Fund and Reports module | P0 |

---

## SECTION 11 · CANCELLATIONS MODULE

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CANC-01 | Cancellation list: filter by Pending/Confirmed/Restored | P0 |
| FR-CANC-02 | Add cancellation: student search typeahead, reason, vacate date, notes | P0 |
| FR-CANC-03 | Confirm cancellation: frees room/bed, updates student status to 'vacated' | P0 |
| FR-CANC-04 | Restore cancellation: student re-set to 'active' | P0 |
| FR-CANC-05 | **Auto-confirm nightly cron:** port `processAutoCancellations()` exactly | P0 |
| FR-CANC-06 | Dashboard alert banner: pending count shown in red | P0 |
| FR-CANC-07 | Student status does NOT change when cancellation is added — only when confirmed | P0 |

---

## SECTION 12 · MAINTENANCE & COMPLAINTS

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-MAINT-01 | Maintenance list: filter by status, priority, room | P0 |
| FR-MAINT-02 | Add: title, description, room (optional), priority (Low/Medium/High/Urgent), date | P0 |
| FR-MAINT-03 | Status progression: open → in_progress → resolved | P0 |
| FR-COMPL-01 | Complaint list: filter by status, priority | P0 |
| FR-COMPL-02 | Add: title, description, student (optional), priority, date | P0 |
| FR-COMPL-03 | Resolve: add response text, set resolved + resolvedDate | P0 |
| FR-MAINT-04 | Dashboard alert banner: open count (combined with complaints) | P0 |

---

## SECTION 13 · OWNER TRANSFERS

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-TRF-01 | Record transfer to owner: description, amount, method, received by, date, notes | P0 |
| FR-TRF-02 | Edit, soft-delete transfers | P0 |
| FR-TRF-03 | Transfers included in Dashboard "To Owner" card and net profit | P0 |
| FR-TRF-04 | Quick transfer shortcut from Dashboard | P0 |

---

## SECTION 14 · FINES, CHECK-IN/OUT, NOTICES

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-FINE-01 | Add fine: student, reason, amount, date | P0 |
| FR-FINE-02 | Mark fine as paid | P0 |
| FR-FINE-03 | Soft-delete fine | P0 |
| FR-CI-01 | Log entry: student, type (check_in/check_out/leave/return), date/time, notes | P0 |
| FR-CI-02 | Per-student movement history | P0 |
| FR-NOT-01 | Post notice: title, content, type, expiry date | P0 |
| FR-NOT-02 | Active notices shown on Dashboard | P0 |
| FR-NOT-03 | Super Admin can broadcast global notice to all tenants (hostel_id = NULL) | P0 |
| FR-INS-01 | Add inspection: room, inspector name, rating (1–5), notes, issues list, date | P1 |
| FR-BILL-01 | Split utility bill: total amount, participant list, split type (equal/custom) | P1 |

---

## SECTION 15 · REPORTS & ANNUAL ARCHIVE

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-RPT-01 | Monthly detail: Revenue, Expenses, Transfers, Net Profit, Occupancy %, Student count | P0 |
| FR-RPT-02 | Monthly payments table: student, room, rent, extras, paid, unpaid, method, status, date | P0 |
| FR-RPT-03 | Net summary: Revenue − Expenses − Transfers = Net Fund | P0 |
| FR-RPT-04 | Export monthly report as PDF (branded, hostel logo) | P0 |
| FR-RPT-05 | Export monthly payments/expenses as CSV | P0 |
| FR-RPT-06 | Share via WhatsApp: month summary message | P0 |
| FR-RPT-07 | Annual Archive: year tabs, 12-month grid, annual totals, annual trend chart | P0 |

---

## SECTION 16 · GLOBAL SEARCH & SETTINGS

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SRCH-01 | Header search bar: global search across students, payments, rooms, expenses | P0 |
| FR-SRCH-02 | Results < 200ms via pg_trgm GIN index | P0 |
| FR-SRCH-03 | Keyboard shortcut: Cmd/Ctrl+K opens search | P1 |

**Settings Module — All 11 Tabs:**

| Tab | Key Features |
|-----|-------------|
| Hostel Info | App name, hostel name, tagline, city, phone, email, currency, font picker (20), logo upload, live preview |
| Room Types | Type name, capacity, default rent, color picker |
| Payment Methods | Tag-list UI: add/remove methods |
| Expense Categories | Tag-list UI: add/remove categories |
| Floors | Tag-list of floor names |
| Theme & Display | 6 accent color presets + custom hex; dark/light/system mode; auto-month-advance toggle |
| Data Management | Excel/CSV import with template download; system stats |
| Rent Update | Bulk rent update: by room type / apply to all / per-student table |
| Annual Archive | Link to Archive page |
| Splash Screen | App name, tagline, background, font selection |
| Subscription | Plan status, expiry, days remaining, upgrade button |

---

## SECTION 17 · DATABASE SCHEMA — 28 TABLES

> 📍 Build phase: [PHASE 1] | Priority: [P0]

### 17.1 Table Inventory

| # | Table | Category | Phase |
|---|-------|----------|-------|
| 1 | hostels | Core | 1 |
| 2 | users | Core | 1 |
| 3 | students | Core | 1 |
| 4 | rooms | Core | 1 |
| 5 | beds | Core | 1 |
| 6 | payments | Finance | 1 |
| 7 | payment_extra_charges | Finance | 1 |
| 8 | expenses | Finance | 1 |
| 9 | owner_transfers | Finance | 1 |
| 10 | fines | Finance | 1 |
| 11 | cancellations | Operations | 1 |
| 12 | room_shifts | Operations | 1 |
| 13 | maintenance_requests | Operations | 1 |
| 14 | complaints | Operations | 1 |
| 15 | checkin_log | Operations | 1 |
| 16 | notices | Operations | 1 |
| 17 | room_inspections | Operations | 2 |
| 18 | bill_splits | Operations | 2 |
| 19 | subscriptions | Billing | 1 |
| 20 | audit_log | System | 1 |
| 21 | warden_shift_log | System | 1 |
| 22 | receipt_counter | System | 1 |
| 23 | dlq_jobs | System | 1 |
| 24 | api_keys | Enterprise | 6 |
| 25 | feedback | Product | 2 |
| 26 | nps_responses | Product | 3 |
| 27 | onboarding_events | Product | 3 |
| 28 | referral_payouts | Product | 4 |

### 17.2 Multi-Tenancy Rules (MANDATORY — Every Tenant Table)

```sql
hostel_id UUID NOT NULL REFERENCES hostels(hostel_id)
created_at TIMESTAMPTZ DEFAULT now()
deleted_at TIMESTAMPTZ
ALTER TABLE x ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON x
  USING (hostel_id = current_setting('app.hostel_id')::uuid);
```

> ⛔ INVARIANT: Every payment amount column is `NUMERIC(10,2)`. FLOAT is forbidden for money.
> ⛔ INVARIANT: CNIC is always `cnic_encrypted TEXT` (AES-256). Never a plaintext column.

### 17.3 The withTenant() Pattern — MANDATORY

```typescript
export async function withTenant<T>(
  hostelId: string,
  queryFn: (db: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.hostel_id', hostelId]);
    const result = await queryFn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

> ⛔ INVARIANT: EVERY database query that touches a tenant table MUST be wrapped in `withTenant()`. SET LOCAL MUST be inside BEGIN/COMMIT. An ESLint rule (`hostyllo/no-raw-db-query`) enforces this in CI.

---

## SECTION 18 · API DESIGN & STANDARDS

- **Base URL:** `https://api.hostyllo.app/api/v1/`
- **Response shape:** `{ success: boolean, data?: any, code?: string, message?: string, field?: string }`
- **hostel_id:** ALWAYS from JWT (`req.hostelId`), NEVER from body, params, or query
- **Pagination:** All list endpoints have `limit` (max 100) and `offset`
- **Idempotency:** Payment creation requires `X-Idempotency-Key` header

> ⛔ INVARIANT: If a route accepts `hostel_id` from the request body, it is wrong. Fix immediately.

**Phase 1: 42 Endpoints across 9 module groups** (Auth: 6, Students: 7, Rooms: 6, Payments: 8, Expenses: 5, Dashboard: 2, Audit: 2, Users: 4, Health: 1, Settings: 1)

---

## SECTION 19 · SECURITY ARCHITECTURE — 34 RISKS MITIGATED

| Risk ID | Risk | Implementation |
|---------|------|----------------|
| SEC-01 | Brute force | Rate limit 10 attempts/15min/IP via Redis |
| SEC-02 | JWT algorithm confusion | `algorithms: ['RS256']` only in jwtVerify |
| SEC-03 | JWT secret leak | All keys from env vars |
| SEC-04 | Refresh token theft | httpOnly + SameSite=Strict + Secure |
| SEC-05 | Session fixation | Rolling token rotation, jti blocklist |
| SEC-06 | TOTP bypass | totp_verified checked before issuing access token |
| SEC-07 | Password reset brute force | Max 5 attempts then invalidate token |
| SEC-08 | Account enumeration | Identical error message + timing for wrong email vs wrong password |
| SEC-09 | IDOR | 404 (not 403) when Hostel A JWT requests Hostel B records |
| SEC-10 | hostel_id injection | Always from JWT, never from body/params/query |
| SEC-11 | RLS race condition | SET LOCAL always inside explicit BEGIN/COMMIT |
| SEC-12 | Cross-tenant Redis | All cache keys: `cache:{hostelId}:{resource}` |
| SEC-13 | Privilege escalation | Role fetched from DB, never JWT payload |
| SEC-14 | canDelete bypass | users.can_delete checked from DB |
| SEC-15 | Impersonation audit | Logged with impersonated_by to audit_log |
| SEC-16 | SQL injection | Parameterized queries only |
| SEC-17 | CSV formula injection | Strip `= + - @` from all cells |
| SEC-18 | XSS | React auto-escaping; PDF generator escapes all user data |
| SEC-19 | Path traversal | File uploads renamed to `{uuid}.ext` before storage |
| SEC-20 | SSRF | Outbound URLs validated against allowlist; RFC1918 blocked |
| SEC-21 | ReDoS | No catastrophic regex patterns |
| SEC-22 | Mass assignment | `additionalProperties: false` on ALL Fastify schemas |
| SEC-23 | Webhook forgery | Paymob HMAC-SHA512 + `crypto.timingSafeEqual()` |
| SEC-24 | Webhook replay | Processed webhook IDs in Redis TTL 48h |
| SEC-25 | DDoS | Cloudflare WAF + `@fastify/rate-limit` |
| SEC-26 | Env var leak | Sentry filters `SECRET|KEY|PASSWORD|TOKEN` |
| SEC-27 | Dependency CVE | npm audit in CI; Dependabot enabled |
| SEC-28 | RLS disabled | CI check: `SELECT tablename WHERE rowsecurity=false` |
| SEC-29 | TOTP plaintext | totp_secret_enc AES-256 encrypted |
| SEC-30 | Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| SEC-31 | CNIC leak | API responses never return cnic_encrypted; always masked_cnic |
| SEC-32 | Data exfiltration | Export endpoint is hostel_owner only |
| SEC-33 | Backup exposure | Supabase Storage bucket PRIVATE; signed URLs 24h expiry |
| SEC-34 | Log injection | Structured Pino JSON logging; user strings never interpolated |

---

## SECTIONS 20–34 (PRESERVED FROM v13.0)

> Sections 20–34 are preserved verbatim from PRD v13.0 which has complete, production-ready specifications for:
> - Section 20: Offline-First Sync Engine (Phase 5)
> - Section 21: Performance & Caching Strategy
> - Section 22: CI/CD Pipeline
> - Section 23: Environment Variables & Secrets
> - Section 24: Error Code Reference
> - Section 25: Disaster Recovery Policy
> - Section 26: Billing & Subscription Engine (Paymob, dunning sequence)
> - Section 27: WhatsApp & Notification System
> - Section 28: Super Admin Panel (12 KPI types, 8 tenant tabs, DLQ monitor)
> - Section 29: Onboarding Wizard — 7 Steps
> - Section 30: Monetization & Pricing (Starter PKR 2,999 / Pro PKR 6,999 / Enterprise PKR 14,999)
> - Section 31: Customer Acquisition Plan
> - Section 32: Support & Operations Plan
> - Section 33: Infrastructure Budget (~PKR 17,710/mo Phase 0, ~PKR 38,710/mo Phase 3)
> - Section 34: Legal & Compliance (PDPA)
>
> See 01_MASTER_PRD_v13.md for the complete text of these sections.
> v14.0 does NOT modify these sections. They are complete and authoritative.

---

# ═══════════════════════════════════════════
# ENTERPRISE SYSTEMS — NEW IN v14.0
# Sections 35–43 define the ceiling of the product.
# Build toward these phase by phase — not all at once.
# ═══════════════════════════════════════════

---

## SECTION 35 · ENTERPRISE UX ARCHITECTURE

> Full screen-level specification is in 04_UX_DESIGN_SYSTEM.md

> 📍 Build phase: [PHASE 2 foundation, Phase 5+ polish] | Priority: [P0 for foundation, P2 for advanced patterns]

### 35.1 UX Philosophy — Linear-Level Workflow Intelligence

HOSTYLLO's UX must eliminate the ERP complexity trap. Every interaction must:
- Complete in the fewest taps or keystrokes possible
- Surface the relevant action before the user asks for it
- Never require navigation when a contextual shortcut exists
- Feel native on a 390px phone screen
- Load in under 200ms — skeleton shimmer, never spinner

**The 5 UX Principles:**

| Principle | Definition | Failure Mode to Avoid |
|-----------|-----------|----------------------|
| Contextual Intelligence | The UI surfaces the next action based on current context | Forcing users to navigate to complete related steps |
| Operational Speed | Every daily workflow completes in under 5 interactions | Deep menu trees, confirmation dialogs for routine actions |
| Progressive Disclosure | Simple first, complex on demand | Showing all fields on first load — overwhelming new users |
| Role-Aware Surfaces | Interface adapts to what the logged-in role can do | Showing disabled buttons that wardens cannot use anyway |
| Graceful Degradation | Every feature works at reduced capacity with no internet | Hard errors on connectivity loss |

### 35.2 Navigation Architecture

**Primary: Sidebar (Desktop 260px, Mobile: Bottom Tab Bar)**

Desktop sidebar structure:
```
[HOSTYLLO Logo]
─────────────────
Dashboard        ← Landing page
Students         ← Most-used module
Payments    [🔴3] ← Badge: pending this month
Rooms
─────────────────
Issues      [🔵2] ← Badge: open maintenance
Reports
Cancellations
Expenses
Fines
─────────────────
Settings
Activity Log
─────────────────
[Occupancy Widget]  compact grid: X/Y filled
[Subscription Badge] Starter · 23 days left
```

Mobile bottom tab bar (Phase 2):
- Dashboard · Students · Payments · Rooms · More (...)

### 35.3 Command Palette (Phase 3)

**Cmd/Ctrl + K opens global command palette.**

```
┌─────────────────────────────────────────┐
│ 🔍  Type a command or search...          │
├─────────────────────────────────────────┤
│ ⚡ Quick Actions                         │
│   Add Student         ⇧S               │
│   Record Payment      ⇧P               │
│   Add Expense         ⇧E               │
│   Generate Monthly Rents   ⇧G          │
├─────────────────────────────────────────┤
│ 🔍 Recent Searches                       │
│   Ahmed Khan · Room 4 · PKR 8,000 due  │
│   Maintenance Request #12              │
└─────────────────────────────────────────┘
```

**Command palette requirements:**
- Opens in < 50ms
- Searches across students, payments, rooms in real-time
- Supports keyboard navigation (arrow keys + Enter)
- Shows keyboard shortcuts inline
- Recent searches stored locally

### 35.4 Dashboard Architecture — 5 KPI Cards + Intelligence Layer

**Row 1 — 5 KPI Cards (animate in on load, count up from 0):**

| Card | Value | Color | Tap Action |
|------|-------|-------|-----------|
| Revenue | Sum of paid this month (PKR) | Teal (positive) | → Payments filtered to current month |
| Pending | Sum of unpaid this month (PKR) | Red | → Defaulters list |
| Expenses | Sum of expenses this month (PKR) | Amber | → Expenses filtered to current month |
| To Owner | Sum of transfers this month (PKR) | Muted | → Transfers list |
| Net Fund | Revenue − Expenses − Transfers | Gold | → Monthly report |

**Row 2 — Operational Status (Phase 3+):**
- Occupancy rate (X% filled) with mini bar chart
- Active students count vs last month delta (+/-)
- Maintenance health score (0 open = green, 1-3 = amber, 4+ = red)
- Next rent due: days until end of month

**Row 3 — Alert Banners (from Electron — port verbatim):**
- 🔴 Red: pending cancellations > 0
- 🟡 Amber: pending payments > 0
- 🔵 Blue: open maintenance > 0
- 🔴 Red: unresolved complaints > 0
- 🟡 Amber: occupancy < 60%

**Row 4 — Quick Actions (Phase 2):**
Large tappable cards optimized for phone use:
- [+] Add Student · [💰] Record Payment · [🔧] Add Maintenance · [📋] Generate Rents

### 35.5 Student Profile — 5-Tab Architecture

```
[Student Photo] Ahmed Khan  Room 4, Bed B
               XXXXX-XXXXXXX-X  |  03XX-XXXXXXX
               Active since Jan 2025

[ Overview ] [ Payments ] [ Room History ] [ Log ] [ Documents ]
```

- **Overview:** Full profile details, edit inline
- **Payments:** Full payment history with receipt download per row
- **Room History:** All room assignments with dates
- **Log:** All audit trail events for this student
- **Documents:** Receipt PDFs, admission form if uploaded

### 35.6 Payment Recording UX — Mobile-Optimized Flow

The most-used daily workflow. Must complete in 3 interactions on mobile:

1. **Student Picker:** Typeahead input — type 2 chars, shows top 5 matches with room and pending amount
2. **Payment Details:** Rent auto-filled, extra charges inline, concession inline, amount paid (large input for easy phone entry), payment method toggle buttons (not a dropdown)
3. **Confirm:** Shows receipt preview (amount, month, balance remaining) → "Record & Send Receipt" button

**Exit states:**
- "Send Receipt via WhatsApp" — opens WhatsApp pre-filled
- "Download PDF" — opens receipt in new tab
- "Record Another" — clears form for next student

### 35.7 Empty States

Every empty list must have:
- Illustrated graphic (SVG, minimal, consistent style)
- English headline + Urdu subheadline
- CTA button for primary action
- No dead-ends — always show what to do next

Example: Students list empty state:
- Illustration: Person adding a card to a building
- English: "No students yet"
- Urdu: "ابھی کوئی طالب علم نہیں"
- CTA: "Add First Student" → opens add student flow

---

## SECTION 36 · AI SYSTEMS ARCHITECTURE (PHASED)

> 📍 Build phases: PHASE 3 (light AI), PHASE 6 (moderate AI), PHASE 7 (full AI) | Priority: [P1 for Phase 3 items, DEFERRED for Phase 7]

### 36.0 AI Execution Principles

```
RULE: AI features are built in 3 tiers based on infrastructure requirements:

Tier 1 (Phase 3) — Rule-based intelligence
  → Deterministic algorithms, no ML model, no GPU, no separate service
  → Examples: payment risk scoring based on history, occupancy trend lines

Tier 2 (Phase 6) — Statistical intelligence
  → Server-side statistical models (regression, time-series), standard PostgreSQL + Node
  → Examples: occupancy forecasting, defaulter probability scoring

Tier 3 (Phase 7+) — True ML intelligence
  → Requires ML engineer, separate model serving infrastructure, training pipeline
  → Examples: AI rent suggestions, NLP search, conversational assistant
  → DEFERRED — MRR trigger + hire required
```

### 36.1 Tier 1 AI — Phase 3 (Rule-Based Intelligence)

These require zero ML infrastructure. Computed in PostgreSQL + application layer.

**A. Payment Risk Scoring**

```typescript
// Rule-based risk score — no ML required
function computeRiskScore(student: StudentRecord): 'low' | 'medium' | 'high' {
  const consecutiveUnpaid = countConsecutiveUnpaidMonths(student.payments);
  const averageDelayDays = computeAveragePaymentDelay(student.payments);
  const totalOutstanding = student.payments.filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + p.unpaid_pkr, 0);

  if (consecutiveUnpaid >= 3 || totalOutstanding > 30000) return 'high';
  if (consecutiveUnpaid >= 2 || averageDelayDays > 15) return 'medium';
  return 'low';
}
```

**Risk badge display in defaulters list:**
- 🟢 Low risk — pay on their own with one reminder
- 🟡 Medium risk — 2 reminders needed historically
- 🔴 High risk — escalation needed (owner contact)

**B. Occupancy Trend Widget**

Simple moving average over 6 months. Computed in SQL, displayed as a sparkline on the dashboard. No ML — just `AVG() OVER (...)` in PostgreSQL.

Shows:
- Last 6 months occupancy line chart
- "↑ +5% vs last month" or "↓ -3% vs last month" delta badge
- "Currently at X% capacity" prominently

**C. Smart Defaulter Prioritization**

Sort defaulters list not just by amount — but by risk score × amount × days overdue.
- High-value + high-risk students at the top
- Single-click WhatsApp reminder sorted by priority
- "Remind All High-Risk First" button

**D. Maintenance Pattern Detection (Phase 3)**

Count recurring maintenance requests by room. If a room has 3+ open/resolved requests with same category in 90 days → show warning badge on room card: "Recurring issue: Plumbing".

### 36.2 Tier 2 AI — Phase 6 (Statistical Intelligence)

**A. Occupancy Forecasting**

Simple time-series forecast using last 12 months of occupancy data per hostel. PostgreSQL function using linear regression (`regr_slope`, `regr_intercept`).

Output displayed as:
- Forecast widget on dashboard: "Expected occupancy next month: 78% (based on historical trend)"
- Seasonality insight: "This month is typically 15% lower than July — normal for exam season"

No ML model server required. Pure SQL statistical functions.

**B. Fee Collection Prediction**

Per-student probability of collecting rent by end of month. Inputs: payment history (n months), average days to pay, current month outstanding.

Computed via logistic regression coefficients pre-computed monthly and stored as a JSON column in the `students` table (`payment_probability_score NUMERIC(4,2)`).

**C. Revenue Forecast**

Monthly MRR forecast for hostel owner: "Based on current occupancy and historical collection rates, expected revenue this month: PKR X–Y."

**D. Operational Health Score**

Single composite score (0–100) per hostel, visible on owner dashboard. Computed from:
- Occupancy rate (weight: 30%)
- Collection rate (weight: 40%)
- Maintenance resolution rate (weight: 20%)
- Complaint resolution rate (weight: 10%)

### 36.3 Tier 3 AI — Phase 7 (DEFERRED)

> ⚠️ DEFERRED — NOT in 24-month solo roadmap.
> Trigger: MRR > PKR 500,000/mo + ML engineer hired.

| Feature | Description |
|---------|-------------|
| AI Rent Suggestion | Median rents from anonymized data by city/room type — ML inference |
| NLP Search | "Show me students who haven't paid since January" — natural language query |
| AI Operational Assistant | "Summarize this month's operations" — Claude/GPT via API |
| Predictive Churn Detection | Which students are likely to vacate next month |
| Smart WhatsApp Optimization | Best send time per student based on response patterns |

---

## SECTION 37 · AUTOMATION ENGINE

> 📍 Build phase: [PHASE 3 triggers, PHASE 5 full engine] | Priority: [P1]

### 37.1 Automation Architecture

HOSTYLLO's automation engine is event-driven, built on BullMQ + Railway cron jobs. No separate workflow engine required in Phase 1–6.

```
Event Sources → Event Bus (BullMQ) → Workers → Outputs
    |                                              |
    ↓                                              ↓
 DB changes                              WhatsApp messages
 Cron triggers                           Email notifications
 User actions                            PDF generation
 API webhooks                            Audit log entries
```

### 37.2 Automation Triggers — All Defined

| Trigger ID | Event | Action | Phase |
|-----------|-------|--------|-------|
| AUTO-01 | End of month (cron: 00:00 on 1st) | Generate pending payment records for all active students | 1 |
| AUTO-02 | Vacate date reached (nightly cron) | Auto-confirm pending cancellations via `processAutoCancellations()` | 1 |
| AUTO-03 | Payment recorded | Queue PDF receipt generation via BullMQ `pdf-receipts` | 1 |
| AUTO-04 | Payment recorded + WhatsApp opt-in | Queue WhatsApp receipt send | 3 |
| AUTO-05 | 5th of month (cron) | WhatsApp blast: all unpaid students for current month | 3 |
| AUTO-06 | 15th of month (cron) | Second WhatsApp blast: still-unpaid students with escalated message | 3 |
| AUTO-07 | Student risk score = 'high' | Notify hostel owner via in-app notification | 3 |
| AUTO-08 | Subscription payment fails | Trigger dunning sequence Day 0 | 4 |
| AUTO-09 | Dunning Day 1, 3, 7 | Email notifications to tenant owner | 4 |
| AUTO-10 | Dunning Day 28 | Auto-export ZIP emailed to owner | 4 |
| AUTO-11 | Dunning Day 31 | PII purge job via BullMQ | 4 |
| AUTO-12 | Maintenance request > 7 days unresolved | Escalation notification to owner | 3 |
| AUTO-13 | Occupancy drops below 60% | Dashboard amber alert + optional owner notification | 3 |
| AUTO-14 | New student added | Welcome sequence: WhatsApp greeting to student (if phone number given) | 5 |
| AUTO-15 | Room inspection 3+ recurring issues | Auto-create maintenance request | 3 |

### 37.3 BullMQ Queue Specifications

| Queue | Concurrency | Retry | DLQ Action |
|-------|-------------|-------|-----------|
| pdf-receipts | 5 workers | 3×, exponential 5s | In-app warning badge on payment |
| whatsapp-blast | 2 workers | 3×, 2s delay | Copy-paste modal auto-opens |
| whatsapp-receipt | 2 workers | 3×, 2s delay | Copy-paste modal opens |
| billing-sync | 2 workers | 5×, exponential 5s | Super Admin red badge |
| email-send | 5 workers | 3×, exponential 2s | Email owner about retry |
| auto-cancel | 2 workers | 5×, exponential 10s | Super Admin alert |
| rent-generate | 2 workers | 5×, exponential 10s | Super Admin warning |

> ⛔ INVARIANT: Every BullMQ worker MUST have `worker.on('failed')` calling `moveToDLQ()`. No exceptions.

---

## SECTION 38 · MOBILE-FIRST OPERATIONAL ARCHITECTURE

> 📍 Build phase: [PHASE 2 PWA, PHASE 5 offline] | Priority: [P0]

### 38.1 Mobile-First Principles

Wardens use phones. Every design decision starts at 390px, then expands to desktop. Not the other way around.

**Mobile performance targets:**
- Initial load: < 2s on 4G Pakistan
- Interaction to response: < 100ms (local state update immediate, server confirms async)
- Offline detection: < 500ms to show connectivity indicator
- Critical path: Login → Dashboard → Add Payment = under 30 seconds on a low-end Android

### 38.2 PWA Architecture (Phase 2)

```
Service Worker Caching Strategy:

- App Shell (HTML/CSS/JS): Cache-first (version-stamped)
- API responses (GET): Network-first, stale-while-revalidate (30s TTL)
- Static assets (fonts, icons): Cache-first (long-lived)
- Student photos: Cache-first (Supabase Storage signed URLs, 24h expiry)

manifest.json:
{
  "name": "HOSTYLLO",
  "short_name": "HOSTYLLO",
  "display": "standalone",
  "theme_color": "#c9a84c",
  "background_color": "#0b0e14",
  "start_url": "/dashboard",
  "icons": [72, 96, 128, 144, 152, 192, 384, 512]
}
```

**Install prompt:** Show after 2 minutes of use on mobile browsers. Banner appears at bottom of screen: "Install HOSTYLLO for faster access → [Install]"

### 38.3 Touch Interaction Standards

- **Minimum tap target:** 44×44px (Apple Human Interface Guidelines)
- **Swipe gestures (Phase 5):** Swipe left on student row → quick actions (Pay, Message, Edit)
- **Pull to refresh:** All list screens
- **Long press:** Context menu on items (Edit, Delete, View)
- **Bottom sheet modals:** On mobile, modals appear from bottom (not center) for thumb reach

### 38.4 Offline Mode (Phase 5 — SQLite)

```
Online: All writes → PostgreSQL immediately
        All reads ← PostgreSQL (Redis cached)

Offline (Phase 5 only):
  Writes → SQLite (OPFS, browser-native)
         → Queued in sync_queue table
  Reads ← SQLite (last synced state)
  
On reconnect:
  → POST /sync/push (max 500 rows batch)
  → Server resolves conflicts (CRDT last-write-wins)
  → Pull server changes → merge into SQLite
```

**Connectivity indicator (Phase 1–4, before offline sync):**
- Green dot: Connected
- Amber dot: Slow connection (response time > 2s)
- Red banner: "Connection lost — changes will be saved when back online" (Phase 1–4: this is informational only; Phase 5: actually queues changes)

### 38.5 Mobile Screen Specifications

**Students List (Mobile):**
- Each row: Avatar + Name + Room + Status badge + Unpaid amount (right-aligned)
- Filter bar: scrollable horizontal chips (All | Active | Unpaid | Vacated)
- FAB button bottom-right: "+" → Add Student

**Record Payment (Mobile):**
- Full-screen modal (bottom sheet)
- Student picker at top (typeahead, shows recent students first)
- Amount input: large numpad-style input (48px height, numeric keyboard trigger)
- Quick preset amounts: [5,000] [8,000] [10,000] [Custom]
- Method selector: horizontal toggle buttons (not a select dropdown)

---

## SECTION 39 · SEO & GROWTH ARCHITECTURE

> 📍 Build phase: [PHASE 3 landing page, PHASE 4 SEO expansion] | Priority: [P1]

### 39.1 Domain Strategy

| Domain | Purpose | Phase |
|--------|---------|-------|
| hostyllo.app | Marketing site + signup landing page | Phase 3 |
| app.hostyllo.app | Web application | Phase 1 |
| admin.hostyllo.app | Super admin panel | Phase 3 |
| api.hostyllo.app | API (robots: disallow all) | Phase 1 |

### 39.2 Landing Page Architecture (Phase 3)

**Page sections in order:**
1. **Hero** — "Run your hostel from your phone" + 3-second demo video (screen recording of adding a student and generating a receipt) + [Start Free Trial] CTA + [Watch Demo] CTA
2. **Problem Section** — "Most hostels still use paper or Excel. Here's what you're losing." — 3 pain points with Pakistani-market specificity
3. **Product Showcase** — Animated screenshots: Dashboard → Add Student → Record Payment → WhatsApp Receipt
4. **Features Grid** — 6 cards: Payment formula accuracy, WhatsApp automation, Offline mode, PDF receipts, Urdu support, Cloud backup
5. **Social Proof** — Testimonials from beta wardens (Phase 3: with permission, real quotes)
6. **Pricing Table** — 3 plans (Starter/Pro/Enterprise) with PKR pricing + annual discount toggle + 14-day trial badge
7. **Pakistan-Specific Trust Section** — "Built for Pakistan. CNIC-encrypted. JazzCash billing. Urdu UI."
8. **FAQ** — 8 most common questions from pre-sales conversations
9. **Footer** — Links: Privacy Policy · Terms · Support WhatsApp · hostyllo.app/blog

**SEO targets (Phase 3–4):**

| Target Keyword | Search Intent | Page |
|---------------|--------------|------|
| hostel management software Pakistan | Commercial | Landing page |
| hostel management system Urdu | Commercial | Landing page / feature page |
| hostel student record software | Informational | Blog post |
| rent reminder WhatsApp automation | Informational | Feature page |
| hostel accounts software Pakistan | Commercial | Landing page |

### 39.3 Growth Loops

**Loop 1 — Referral (Phase 4):**
- Every paying client gets a `referral_code`
- Refer a new paying client → earn PKR 500 credit
- New client gets 7-day trial extension
- Tracked in `referral_payouts` table

**Loop 2 — Word of Mouth (Passive):**
- PDF receipts include "Generated by HOSTYLLO" in footer (small, non-intrusive)
- WhatsApp automated messages include "Powered by HOSTYLLO" (configurable: on by default, can disable on Enterprise plan)

**Loop 3 — Content (Phase 4):**
- Blog: hostyllo.app/blog — 2 posts/month (practical guides for hostel wardens)
- Topics: "How to track student payments in Pakistan", "Hostel management tips for wardens", etc.
- Each post ends with a CTA to try HOSTYLLO

---

## SECTION 40 · NOTIFICATION INTELLIGENCE SYSTEM

> 📍 Build phase: [PHASE 2 in-app, PHASE 3 WhatsApp, PHASE 5 full] | Priority: [P0]

### 40.1 Notification Channels (Priority Order)

| Channel | Phase | Use Case |
|---------|-------|---------|
| In-app (real-time, SSE/WebSocket) | Phase 2 | All operational alerts — badge counts, banners |
| WhatsApp | Phase 3 | Payment reminders, receipts, operational alerts to wardens |
| Email | Phase 1 | Password reset, invoices, billing notifications |
| SMS (Jazz fallback) | Phase 3 | WhatsApp delivery failures |
| Browser push (PWA) | Phase 4 | Optional, permission-gated |

**Non-negotiable:** WhatsApp approval status NEVER blocks any notification fallback. Copy-paste is always the last resort.

### 40.2 In-App Notification Architecture (Phase 2)

```
Server → Server-Sent Events (SSE) → Client notification store → UI badges/banners

Notification types:
- system: platform announcements (from Super Admin broadcast)
- alert: operational — requires action
- info: informational — FYI
- success: completion events

Notification bell (header):
- Red badge: count of unread
- Dropdown: last 20 notifications, grouped by time
- "Mark all read" button
- Each notification: icon + text + timestamp + CTA link
```

### 40.3 WhatsApp Message Templates (Phase 3)

**FR-WA-TEMPLATE-01: Payment Reminder**
```
*[Hostel Name]* — Payment Reminder

Dear [Student Name],

Your rent for *[Month]* is due.

Room: [Room Number]
Due Amount: PKR [Amount]
Due Date: [Date]

Please arrange payment at your earliest convenience.

Thank you.
— [Hostel Name] Team
```

**FR-WA-TEMPLATE-02: Receipt Confirmation**
```
*[Hostel Name]* — Payment Received ✅

Dear [Student Name],

Thank you for your payment!

Receipt #[Number]
Month: [Month]
Amount Paid: PKR [Amount]
Balance: PKR [Balance]

[Download Receipt] ← Deep link to PDF

Thank you!
```

**FR-WA-TEMPLATE-03: Maintenance Update (Phase 3)**
```
*[Hostel Name]* — Maintenance Update

Your request has been [status].
Request: [Title]
Status: [Status]
[Notes if resolved]
```

### 40.4 Notification Digest (Phase 4)

For wardens who receive too many notifications, a daily digest option:
- Single WhatsApp message at 9:00 AM PKT summarizing overnight events
- Dashboard summary card: "3 payments received yesterday · 1 new maintenance request · 2 students due today"

### 40.5 Escalation System

| Trigger | Escalation | Phase |
|---------|-----------|-------|
| Student unpaid 3+ months | Notify hostel_owner (not warden) | 3 |
| Maintenance request unresolved > 7 days | Notify hostel_owner | 3 |
| DLQ job fails 3+ times | Super Admin alert (red badge) | 1 |
| Subscription past_due | Owner email + in-app banner | 4 |
| API error rate > 5% | Super Admin (Sentry) | 1 |

---

## SECTION 41 · DESIGN SYSTEM STANDARDS

> 📍 Build phase: [PHASE 2] | Priority: [P0]

### 41.1 Design Tokens (Canonical)

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `--bg` | `#0b0e14` | `#f8fafc` | App background |
| `--surface` | `#111827` | `#ffffff` | Cards, modals, panels |
| `--surface-2` | `#1a2234` | `#f1f5f9` | Nested surfaces, table rows |
| `--border` | `#1e293b` | `#e2e8f0` | Dividers, input borders |
| `--gold` | `#c9a84c` | `#a07c2a` | Primary action, focus ring |
| `--teal` | `#3dd8c0` | `#0ea5a0` | Success, paid status, online |
| `--text` | `#e2e8f4` | `#0f172a` | Primary text |
| `--text-muted` | `#94a3b8` | `#64748b` | Secondary, placeholders |
| `--red` | `#ef4444` | `#dc2626` | Danger, error, pending |
| `--amber` | `#f59e0b` | `#d97706` | Warnings, partial payment |
| `--radius-sm` | `4px` | `4px` | Badges, tags |
| `--radius-md` | `8px` | `8px` | Buttons, inputs, cards |
| `--radius-lg` | `12px` | `12px` | Modals, large panels |

### 41.2 Typography System

| Role | Font | Size | Weight | Line Height |
|------|------|------|--------|-------------|
| H1 (page title) | Figtree | 28px | 700 | 1.2 |
| H2 (section) | Figtree | 22px | 600 | 1.3 |
| H3 (card title) | Figtree | 18px | 600 | 1.3 |
| Body | Figtree | 14px | 400 | 1.6 |
| Label | Figtree | 12px | 500 | 1.4 |
| Caption | Figtree | 11px | 400 | 1.4 |
| Money/CNIC | DM Mono | 14px | 500 | 1.4 |
| Urdu text | Noto Nastaliq Urdu | 16px | 400 | 2.0 |

### 41.3 Component Standards

**Buttons:**
- 36px height, 8px radius, gold primary
- States: normal → hover (5% lighter) → active (5% darker) → disabled (40% opacity) → loading (skeleton pulse, width preserved)
- Types: Primary (gold filled) · Secondary (border, transparent fill) · Ghost (text only) · Danger (red)

**Inputs:**
- 40px height, 8px radius
- Focused: gold border + `box-shadow: 0 0 0 3px rgba(201,168,76,0.15)`
- Error: red border + inline error message below
- All inputs: Pakistani keyboard triggers (numeric: `inputmode="numeric"`, CNIC: pattern enforced)

**Loading States:**
- NEVER use spinners — skeleton shimmer screens only
- Skeletons match exact layout of loaded content (not generic grey boxes)
- Page-level skeleton: visible immediately (< 16ms), replaced by real content < 200ms

**Status Badges:**
```
Paid:     #3dd8c0 background (teal) — "Paid"
Partial:  #f59e0b background (amber) — "Partial"
Pending:  #ef4444 background (red) — "Pending"
Active:   #3dd8c0 background (teal) — "Active"
Vacated:  #94a3b8 background (muted) — "Vacated"
```

**Tables:**
- Row hover: `--surface-2` background
- Every row: action menu (three-dot icon, appears on hover/tap)
- Sticky column headers
- Pagination: show 25 rows by default, "Load more" or page controls

**Numbers:**
- Pakistani lakh format: `Intl.NumberFormat('en-PK', {currency:'PKR', maximumFractionDigits: 0})`
- Output: `PKR 1,00,000` not `PKR 100,000`

### 41.4 Animation Standards

| Animation | Duration | Easing | Library |
|-----------|----------|--------|---------|
| Page transitions | 200ms | ease-out | Framer Motion |
| Modal open/close | 180ms | scale 0.96→1 / 1→0.96 | Framer Motion |
| Toast notifications | 300ms | slide-in from right | Framer Motion |
| Sidebar collapse | 200ms | ease-in-out | CSS transition |
| Number count-up | 800ms | ease-out | Custom hook |
| Skeleton shimmer | 1.5s | linear | CSS animation |

### 41.5 Accessibility Standards

- **Color contrast:** WCAG AA minimum (4.5:1 for text, 3:1 for UI elements)
- **Focus indicators:** Gold 2px ring on all interactive elements (matches brand)
- **ARIA labels:** Required on all icon-only buttons and form inputs
- **Screen reader:** All critical workflows testable with screen reader
- **Touch targets:** Minimum 44×44px (iOS HIG standard)
- **Form labels:** All inputs have visible labels — no placeholder-only patterns
- **Error messages:** Clear, actionable, not red-only (include icon + text)
- **RTL layout (Urdu):** Full RTL support via CSS `direction: rtl` when Urdu active

---

## SECTION 42 · OPERATIONAL ANALYTICS ARCHITECTURE

> 📍 Build phase: [PHASE 3 basic, PHASE 6 advanced] | Priority: [P1]

### 42.1 Analytics Data Sources

All analytics are computed from existing operational data — no separate analytics database required in Phase 1–6.

**PostgreSQL views for analytics (create in Phase 3):**

```sql
-- Monthly operational summary (materialized, refreshed daily)
CREATE MATERIALIZED VIEW monthly_hostel_analytics AS
SELECT
  hostel_id,
  date_trunc('month', created_at) as month,
  COUNT(DISTINCT student_id) FILTER (WHERE status = 'active') as active_students,
  COALESCE(SUM(amount_paid_pkr), 0) as revenue,
  COALESCE(SUM(unpaid_pkr), 0) as pending,
  COUNT(*) FILTER (WHERE status = 'pending') as defaulter_count,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'paid')::numeric /
    NULLIF(COUNT(*), 0) * 100, 1
  ) as collection_rate_pct
FROM payments
WHERE deleted_at IS NULL
GROUP BY hostel_id, date_trunc('month', created_at);
```

### 42.2 Analytics Dashboard (Phase 3)

**Reports module — 3 tabs:**

**Tab 1: Monthly Report**
- Revenue bar chart (current month by week)
- Expense pie chart (by category)
- Student status breakdown (active/on leave/vacated)
- Collection rate vs last month
- Net fund trend line
- Exportable as PDF/CSV

**Tab 2: Annual Archive**
- Year selector (tabs)
- 12-month grid: each cell = Revenue, Collection Rate, Occupancy
- Annual totals row
- Year-over-year comparison (Phase 4)
- Export as PDF annual report

**Tab 3: Operational Health (Phase 3)**
- Average payment delay (days)
- Repeat defaulters list
- Maintenance resolution time average
- Occupancy trend (12 months)
- Room utilization heatmap (which rooms fill fastest)

### 42.3 Super Admin Analytics (Phase 3)

**Platform KPIs visible to Zeerak only:**

```
Business Row:
  Total Active Tenants · MRR (PKR) · MRR Growth % · Trial Pipeline · Churned This Month

Platform Health Row:
  API Uptime % · Sync Queue Depth · API p95 Latency · Failed Jobs (24h) · WhatsApp Quota

Charts:
  MRR trend (12-month bar chart)
  Tenant growth (cumulative line chart)
  Plan distribution (donut: Starter/Pro/Enterprise)
  Onboarding funnel (7 steps: conversion rate per step)
  Revenue by city (horizontal bar chart, Pakistan map Phase 5)
```

---

## SECTION 43 · OBSERVABILITY & MONITORING

> 📍 Build phase: [PHASE 1] | Priority: [P0]

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|------------|
| API p95 latency | < 200ms | k6 load test |
| Student search | < 200ms | k6 (pg_trgm GIN index) |
| Frontend initial load | < 2s on 4G mobile Pakistan | Lighthouse CI |
| PDF receipt generation | < 2s async via BullMQ | Manual timing |
| Dashboard load | < 200ms single combined query | k6 |
| Global search | < 200ms | k6 |

### Alerting Rules

| Alert | Threshold | Channel |
|-------|-----------|---------| 
| API error rate | > 5% over 5 min | Sentry + email |
| API p99 latency | > 1s | Sentry |
| Queue depth | > 500 jobs | Super Admin + email |
| Failed jobs in 1h | > 10 | Super Admin + email |
| DB connection pool | > 80% utilization | Railway alert |
| Uptime | < 99.9% over 24h | Uptime Robot + email |

---

## SECTION 44 · PHASE ROADMAP

### Active Phases (24 Months)

| Phase | Name | Duration | Exit Condition |
|-------|------|----------|---------------|
| 0 | Infrastructure Setup | Week 1 | `verify-pitr.sh` returns exit 0 |
| 1 | Cloud API Foundation | Months 1–4 | All 28 tables + RLS + 14 payment tests + cross-tenant isolation |
| 2 | Web Frontend | Months 4–7 | 8 P0 modules live, Lighthouse > 90 mobile, PWA installed |
| 3 | Onboarding + Super Admin + AI Tier 1 | Months 7–10 | Self-serve wizard + Super Admin live + risk scoring active |
| 4 | Billing Automation + SEO | Months 10–13 | Paymob live + 5 clients auto-billed + landing page indexed |
| 5 | WhatsApp + Offline + Scale | Months 13–18 | 360dialog live + offline sync + k6 at 1000 concurrent |
| 6 | Enterprise + AI Tier 2 | Months 18–24 | Chain manager live + API v2 + occupancy forecasting + NPS > 8 |

### Deferred Phases

> ⚠️ DEFERRED — Require hire + MRR > PKR 500,000/mo
> Do not build, design, or discuss with clients until triggers are met.

| Phase | Name | Trigger |
|-------|------|---------|
| 7 | AI & Automation (Tier 3) | ML engineer + PKR 500k MRR |
| 8 | Platform Ecosystem | 3+ person team + PKR 1M MRR |

---

## SECTION 45 · RISKS & ASSUMPTIONS

*(Preserved from v13.0 — see that document for complete risk matrix)*

**New risks added in v14.0:**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Enterprise UX scope exceeds solo capacity | High | Medium | Sections 35–42 are vision documents. Build Phase 2 UX from Design System section first. Polish iteratively. |
| AI Tier 1 features create false expectations | Medium | Medium | Label all insights clearly: "Based on payment history" — never "AI predicts" |
| Mobile performance target missed on low-end Android | Medium | High | Test on Samsung Galaxy A-series (most common in Pakistan) at Phase 2 exit |

---

*HOSTYLLO MASTER PRD v14.0 · Zeerak Hostix · May 2026 · Confidential*
*Supersedes: PRD v13.0, v12.0, v11.0, v10.0, v9.1, Blueprint v8–v11, all ZIP archives*
*Next revision: After Phase 1 exit criteria are met. Do not revise earlier.*
