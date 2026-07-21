# HOSTYLLO — Missing & Suggested Files
## Gap Analysis · Recommended Additional Documents
## v15.0 · May 2026
### Supersedes v14.0 version · Merged from Set A (v13 GAP audit) + Set B (v14 gap analysis)

---

## 1. FILES THAT ALREADY EXIST (Across All Uploaded Archives)

| File | Source | Status in v15 Suite |
|------|--------|---------------------|
| 01_MASTER_PRD_v13.md | Uploaded directly | SUPERSEDED by 01_MASTER_PRD_v15.md |
| 01_MASTER_PRD_v14.md | hostyllo1/ (Set B) | SUPERSEDED by 01_MASTER_PRD_v15.md |
| hostyllo_docs_v10/02_AGENT_BOOTSTRAP.md | hostyllo_docs_v10.zip | SUPERSEDED by 06_CLAUDE_MD_v15.md |
| hostyllo_docs_v10/03_ROADMAP.md | hostyllo_docs_v10.zip | SUPERSEDED by 05_ROADMAP_v15.md |
| hostyllo_docs_v10/04_ARCHITECTURE.md | hostyllo_docs_v10.zip | ABSORBED into 02_PRODUCT_BLUEPRINT.md |
| hostyllo_docs_v10/05_BUILD_STATE.md | hostyllo_docs_v10.zip | SUPERSEDED by 09_BUILD_STATE_v15.md |
| hostyllo_docs_v10/06_ISSUES_LOG.md | hostyllo_docs_v10.zip | **KEEP — Active issue tracking** |
| hostyllo_docs_v10/tasks/lessons.md | hostyllo_docs_v10.zip | **KEEP — Critical AI agent memory** |
| hostyllo_docs_v10/tasks/todo.md | hostyllo_docs_v10.zip | **KEEP — Per-session tracking** |
| hostyllo_fixes/tests/paymentService.test.ts | hostyllo_fixes.zip | **KEEP — Production test file (14 tests)** |
| hostyllo_fixes/infra/ci.yml | hostyllo_fixes.zip | **KEEP — Active CI pipeline** |
| hostyllo_fixes/infra/verify-pitr.sh | hostyllo_fixes.zip | **KEEP — Monthly ritual script** |
| hostyllo_fixes/eslint/* | hostyllo_fixes.zip | **KEEP — Production ESLint rules** |
| hostyllo_fixes/bullmq/BULLMQ_DLQ_SPEC.md | hostyllo_fixes.zip | **KEEP — Implementation spec** |
| hostyllo-claude-agents/.claude/commands/* | hostyllo-claude-agents.zip | **KEEP — Claude Code command palette** |
| Cloudberry_PRD.docx / Cloudberry_PRD_1.docx | Uploaded directly | **UNRELATED — Different product. Not integrated.** |

---

## 2. GAPS IDENTIFIED IN v13 AUDIT (Set A)

> These five gaps were found during the v13 gap-fill audit. Status for each is updated to reflect v15.

### GAP-1: UX Design System Full Document
- **Severity:** HIGH
- **v13 Status:** File referenced in PRD but did not exist in any uploaded archive
- **v14 Status:** Still missing — PRD v14 references Section 35 (Enterprise UX Architecture) but no document existed
- **v15 Status:** ✅ **RESOLVED** — `04_UX_DESIGN_SYSTEM.md` created in this suite (813 lines)
- **Need:** Screen-level specifications, component library rules, form patterns, mobile touch targets, skeleton screen designs, empty state designs, error state designs

### GAP-2: Updated CLAUDE.md (v13-compatible rules)
- **Severity:** HIGH
- **v13 Status:** CLAUDE.md was v9, missing v13 Section 00 rules, 6 invariants, PDPA obligations, Solo Rules
- **v14 Status:** Resolved partially by v11 — but v13 Quick Reference Appendix not present
- **v15 Status:** ✅ **RESOLVED** — `06_CLAUDE_MD_v15.md` = v11 enterprise base + v13 Quick Reference Appendix (all 6 invariants, dashboard query, deferred features table, env vars list)

### GAP-3: Landing Page Specification
- **Severity:** MEDIUM
- **v13 Status:** hostyllo.app landing page mentioned as a Phase 3 deliverable but never specified
- **v15 Status:** ⚠️ **PARTIALLY RESOLVED** — basic spec referenced in `07_BEGINNER_GUIDE_v15.md` Stage 5. A dedicated `docs/LANDING_PAGE_SPEC.md` would be more useful. See Section 3.1 below.

### GAP-4: Monorepo Folder Structure (v13-compatible)
- **Severity:** MEDIUM
- **v13 Status:** CLEAN_FOLDER_STRUCTURE.md from v11 predated v13 additions (PDPA, budget, Phase 1 Hard Cut)
- **v15 Status:** ✅ **RESOLVED** — monorepo structure is fully defined in `02_PRODUCT_BLUEPRINT.md` Section 1 (from Set A v13 base, which includes v13 additions)

### GAP-5: Beginner Guide (v13-compatible)
- **Severity:** HIGH for solo founder
- **v13 Status:** Beginner guide from v11 didn't reference Section 00 rules, Phase 1 Hard Cut, infrastructure budget
- **v14 Status:** Improved significantly in v14 with business framing and stage structure
- **v15 Status:** ✅ **RESOLVED** — `07_BEGINNER_GUIDE_v15.md` = v14 stage structure + v13 operational detail + Day-by-Day Phase 0 schedule + budget table + legal checklist

---

## 3. CRITICAL FILES MISSING FROM ALL UPLOADED DOCUMENTS

> These files are referenced in the PRD and CLAUDE.md but have never been created. They are required for production. None of them existed in Set A or Set B.

### 3.1 BUILD STATE v15 (CRITICAL)
**File:** `docs/09_BUILD_STATE_v15.md`
**Why Needed:** Without a current build state, Claude Code sessions start with wrong context. The v9.1 build state (from hostyllo_docs_v10.zip) is stale — it references April 2026 state and v9/v10 task lists.
**v15 Status:** ✅ **RESOLVED** — `09_BUILD_STATE_v15.md` created new in this suite.

**What It Includes:**
- Current phase tracking (Phase 0 — NOT STARTED)
- All task statuses from Roadmap v15 (every task ⬜ TODO)
- Decision log (architectural decisions with rationale)
- Pre-work checklist
- Instructions for Claude Code sessions

---

### 3.2 PAYMENT SERVICE TEST FILE (CRITICAL)
**File:** `packages/db/src/__tests__/paymentService.test.ts`
**Why Needed:** The 14-test file exists in `hostyllo_fixes/tests/paymentService.test.ts`. It must be placed at the correct monorepo path before Phase 1 work begins. This is a non-negotiable Phase 1 gate.
**v15 Status:** ❌ **STILL MISSING** — exists in hostyllo_fixes.zip at wrong path.
**Action:** Copy from `hostyllo_fixes/tests/paymentService.test.ts` to `packages/db/src/__tests__/paymentService.test.ts`. Do not modify.

---

### 3.3 DATABASE SCHEMA SQL (CRITICAL)
**File:** `packages/db/src/schema.sql`
**Why Needed:** PRD Section 17 defines 28 tables. The actual SQL has never been written into a single canonical file. Claude Code must generate this as the first Phase 1 task, then verify every table against PRD invariants before applying to production.

**What It Must Include:**
- All 28 table definitions with `hostel_id UUID NOT NULL REFERENCES hostels(hostel_id)`
- All money columns as `NUMERIC(10,2)` — FLOAT is forbidden (INVARIANT-4)
- All `deleted_at TIMESTAMPTZ` soft-delete columns
- `ALTER TABLE x ENABLE ROW LEVEL SECURITY` for every table
- RLS policies: `USING (hostel_id = current_setting('app.hostel_id')::uuid)`
- GIN indexes: `pg_trgm` on `students(full_name)`, `students(cnic_encrypted)`, `payments(month)`
- `get_next_receipt_number()` PL/pgSQL atomic function
- `onboarding_events` table (see 3.7 below)

**v15 Status:** ❌ **STILL MISSING** — Generate as first task in Phase 1.

---

### 3.4 PRIVACY POLICY + TERMS OF SERVICE (LEGAL — REQUIRED BEFORE PHASE 3)
**Files:** `apps/web/app/privacy/page.tsx`, `apps/web/app/terms/page.tsx`
**Why Needed:** PRD Section 34 (PDPA 2023 compliance) requires these live at hostyllo.app before any client onboards. The onboarding wizard Step 1 has a mandatory Terms acceptance checkbox that records timestamp + IP.

**Privacy Policy Must Cover:**
- What PII is collected (CNIC, phone, student name, payment data)
- How CNIC is encrypted (AES-256 — cannot be read without encryption key)
- Data retention: retained while account is active + 31 days post-deletion
- Right to export all data (Settings → Export)
- Right to request deletion
- Super Admin impersonation disclosure
- Contact information for data requests: privacy@hostyllo.app

**v15 Status:** ❌ **STILL MISSING** — Draft during Phase 2. Must be live before Phase 3.

---

### 3.5 DATA PROCESSING AGREEMENT (DPA) TEMPLATE (LEGAL)
**File:** `docs/legal/DPA_template.md`
**Why Needed:** PRD Section 34 requires a signed DPA with every paying client before student PII is uploaded. HOSTYLLO is a data processor; the hostel is the data controller under PDPA 2023.

**Key Clauses Needed:**
- Sub-processor list (Supabase for database, Railway for compute, Upstash for cache)
- Data residency declaration (Mumbai region, ap-south-1)
- Breach notification obligations (72-hour notice to affected clients)
- CNIC encryption disclosure
- Deletion obligations on contract termination (31 days)

**v15 Status:** ❌ **STILL MISSING** — Budget PKR 20,000–50,000 for Pakistani lawyer review before Phase 3.

---

### 3.6 LOAD TEST SCRIPT (REQUIRED BEFORE PHASE 5)
**File:** `scripts/load-test.js`
**Why Needed:** PRD Section 43 and Roadmap Phase 5 require a k6 load test at 500 concurrent users (p95 < 200ms) before Phase 5 launch. This script does not exist in any uploaded file.

**What It Needs:**
- k6 script simulating 500 virtual users across multiple hostels
- Scenarios: login, dashboard load, student search, payment recording
- Thresholds: p95 < 200ms, error rate < 1%
- Per-hostel data isolation verification under load (cross-tenant test at scale)

**v15 Status:** ❌ **STILL MISSING** — Build during Phase 4 preparation. Run against staging only.

---

### 3.7 ONBOARDING FUNNEL TRACKING SCHEMA
**File:** Part of `packages/db/src/schema.sql` (Migration 006)
**Why Needed:** PRD Section 29 requires all 7 wizard steps to track events to `onboarding_events`. The table is listed in the 28-table schema but the event schema is not fully defined.

**Required Definition:**
```sql
CREATE TABLE onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID NOT NULL REFERENCES hostels(hostel_id),
  event_name VARCHAR(50) NOT NULL,
  -- e.g. 'wizard_step_1_complete', 'wizard_complete', 'wizard_abandoned'
  step_number INTEGER,         -- 1–7, NULL for non-step events
  completed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB               -- e.g. {"rooms_added": 3, "students_added": 0}
);
-- No RLS needed — only super_admin reads this table
-- Index for funnel queries:
CREATE INDEX ON onboarding_events(hostel_id, event_name);
```

**v15 Status:** ❌ **STILL MISSING** — Include in Migration 006 (product tables).

---

### 3.8 RECEIPT HTML TEMPLATE (REQUIRED FOR PHASE 1)
**File:** `packages/db/src/receiptService.ts`
**Why Needed:** PRD Section 09 (FR-PAY-05) specifies the exact receipt format. The Electron app's `buildReceiptHTML()` must be ported verbatim. This function is not in any uploaded file.

**What It Must Include:**
- Hostel logo + name + tagline
- Sequential receipt number (from `get_next_receipt_number()`)
- Student name + masked CNIC (XXXXX-XXXXXXX-X format, last 4 digits visible)
- Room number
- Month (e.g. "May 2026")
- Fee breakdown: Rent | Admission Fee | Extra Charges (itemized) | Concession | Total Due | Paid | Balance
- Payment method + date
- Due date
- Warden signature area
- "Generated by HOSTYLLO" footer (small, suppressable on Enterprise plan)

**v15 Status:** ❌ **STILL MISSING** — Generate in Phase 1 Week 11–12. Port HTML structure from Electron `app.js` `buildReceiptHTML()` function if Zeerak has access.

---

## 4. SUGGESTED NEW FILES (Not in Any Uploaded Document)

These files don't exist anywhere in the uploaded archives but would meaningfully improve production readiness.

### 4.1 LANDING PAGE SPECIFICATION
**File:** `docs/LANDING_PAGE_SPEC.md`
**Why Suggested:** hostyllo.app Phase 3 deliverable (FR-PLT-11) is mentioned but never specified. The landing page is the primary acquisition channel for self-serve signups.

**Would Cover:**
- Hero section: "Manage your hostel from anywhere" + demo GIF + CTA "Start Free Trial"
- Trust signals specific to Pakistan: "Trusted by 50+ Pakistani hostels", "JazzCash & EasyPaisa accepted", "Student CNIC encrypted"
- Pricing table: 3 plans with annual discount option
- Social proof: testimonials from Electron clients (once converted)
- FAQ: PDPA/data security questions, "what happens to my data if I cancel", "does it work without internet"
- CTA: 14-day free trial, no credit card required

**Priority:** Build during Phase 2–3 preparation. Must be live before self-serve signups open.

---

### 4.2 INCIDENT RUNBOOK
**File:** `docs/INCIDENT_RUNBOOK.md`
**Why Suggested:** When production breaks at 2am, you need a step-by-step guide, not your memory.

**Would Cover:**
- P0 incident response (data loss/formula error/outage): exact steps in order
- P1 incident (login broken): exact commands to run
- "My Supabase is down": how to check status.supabase.com, what degrades vs breaks
- "Client says receipt is wrong": how to verify calculateUnpaid() formula, how to regenerate
- Railway API unresponsive: health check commands, how to restart services
- Redis down: what degrades gracefully (search, sessions), what breaks hard (rate-limit, WA queue)
- DLQ jobs: how to inspect and retry from `dlq_jobs` table
- Communication template: what to say in client WhatsApp groups during an incident

---

### 4.3 CLIENT ONBOARDING CHECKLIST
**File:** `docs/CLIENT_ONBOARDING.md`
**Why Suggested:** PRD Section 32 requires documentation for wardens before the first client is onboarded. This checklist ensures nothing is missed.

**Would Cover:**
- Pre-onboarding: DPA signed, WhatsApp group created, student list collected
- Technical setup: hostel created in DB, owner account created, logo uploaded
- Data migration: help client import student list from Excel via CSV import
- Training session: screen share → add student → record payment → generate receipt → send WhatsApp
- Confirmation: client says "I can do this on my own"
- Post-onboarding: 48-hour check-in call or WhatsApp message

---

### 4.4 WARDEN USER MANUAL (URDU + ENGLISH)
**File:** `docs/WARDEN_MANUAL.md`
**Why Suggested:** PRD Section 32 explicitly requires: "The following documentation must exist and be tested with a real non-technical user BEFORE the first live client is onboarded."

**Required Content:**
1. How to add a student (step-by-step with screenshots)
2. How to record a payment and share a WhatsApp receipt
3. How to run the monthly defaulters list and send bulk reminders
4. How to bulk-import students from Excel (CSV template download)
5. What to do if the app shows an error (screenshot it, send to HOSTYLLO WhatsApp group)
6. How to export all data from Settings

**Note:** Must be tested with a real non-technical person (e.g., a family member who has never seen the app) before the first client is onboarded. If they can complete tasks 1–3 without help, the manual is sufficient.

---

### 4.5 SECURITY INCIDENT RESPONSE PLAN
**File:** `docs/SECURITY_INCIDENT_PLAN.md`
**Why Suggested:** PRD Section 19 defines 34 security risks but doesn't define what to do when one occurs. Given CNIC data is stored (even encrypted), a breach response plan is a PDPA 2023 obligation.

**Would Cover:**
- Breach detection: what Sentry/Cloudflare alerts indicate a breach vs a bug
- Containment: how to immediately block access (revoke all tokens via jti blocklist flush)
- Assessment: how to determine scope (which hostels affected, which tables accessed)
- Notification: PDPA 2023 requires notification to affected individuals within 72 hours
- Remediation: steps to close the vulnerability and verify closure
- Communication template for affected clients (Urdu + English)

---

### 4.6 ENVIRONMENT SETUP SCRIPT
**File:** `scripts/setup-dev.sh`
**Why Suggested:** Setting up a new development environment requires remembering many steps. A script eliminates this friction.

**Would Include:**
```bash
#!/bin/bash
# HOSTYLLO Development Environment Setup
set -e

echo "Setting up HOSTYLLO development environment..."

# Check prerequisites
command -v node >/dev/null || { echo "Node.js ≥ 20 required"; exit 1; }
command -v pnpm >/dev/null || npm install -g pnpm

# Install all monorepo dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
echo "⚠️  Edit .env.local with your credentials before running."
echo "⚠️  Never commit .env.local to git."

# Verify PITR (requires SUPABASE env vars to be set)
if [ -f ./scripts/verify-pitr.sh ]; then
  echo "Running PITR verification..."
  ./scripts/verify-pitr.sh
fi

echo "Setup complete. Run: pnpm dev"
```

---

## 5. FILES FROM UPLOADED ARCHIVES THAT MUST BE MIGRATED TO MONOREPO

These files exist in the ZIP archives as production-ready artifacts and must be placed at the correct monorepo paths before Phase 1 begins. They require zero modification.

| Source Path (in ZIP) | Target Path (in Monorepo) | Status | Why Critical |
|---------------------|--------------------------|--------|--------------|
| `hostyllo_fixes/tests/paymentService.test.ts` | `packages/db/src/__tests__/paymentService.test.ts` | ❌ TODO | 14 tests — Phase 1 cannot exit without these passing |
| `hostyllo_fixes/infra/ci.yml` | `.github/workflows/ci.yml` | ❌ TODO | Production CI pipeline with all infra-gates |
| `hostyllo_fixes/infra/verify-pitr.sh` | `scripts/verify-pitr.sh` | ❌ TODO | Monthly PITR ritual — Phase 0 cannot exit until this exits 0 |
| `hostyllo_fixes/eslint/eslint-plugin-hostyllo/rules/require-with-tenant.js` | `packages/config/eslint-plugin-hostyllo/rules/require-with-tenant.js` | ❌ TODO | ESLint blocks commits that bypass withTenant() |
| `hostyllo_fixes/eslint/eslint-plugin-hostyllo/rules/no-hostel-id-from-request.js` | `packages/config/eslint-plugin-hostyllo/rules/no-hostel-id-from-request.js` | ❌ TODO | ESLint blocks hostel_id from body/params (IDOR prevention) |
| `hostyllo_fixes/bullmq/BULLMQ_DLQ_SPEC.md` | `docs/BULLMQ_DLQ_SPEC.md` | ❌ TODO | BullMQ DLQ implementation reference for Phase 1 |
| `hostyllo-claude-agents/.claude/commands/security.md` | `.claude/commands/security.md` | ❌ TODO | /security command for Claude Code security reviews |
| `hostyllo-claude-agents/.claude/commands/architect.md` | `.claude/commands/architect.md` | ❌ TODO | /architect command for architecture decisions |
| `hostyllo-claude-agents/.claude/commands/db.md` | `.claude/commands/db.md` | ❌ TODO | /db command for database work in Claude Code |

---

## 6. GAP RESOLUTION STATUS SUMMARY (v15)

| Gap ID | Description | v13 Status | v14 Status | v15 Status |
|--------|-------------|:----------:|:----------:|:----------:|
| GAP-1 | UX Design System | ❌ Missing | ❌ Missing | ✅ RESOLVED |
| GAP-2 | CLAUDE.md v13-compatible | ❌ Missing | ✅ Resolved (v11) | ✅ RESOLVED (v15 + appendix) |
| GAP-3 | Landing Page Specification | ❌ Missing | ❌ Missing | ⚠️ Partial |
| GAP-4 | Monorepo folder structure | ❌ Missing | ✅ Resolved | ✅ RESOLVED |
| GAP-5 | Beginner Guide (current rules) | ❌ Missing | ✅ Resolved | ✅ RESOLVED |
| GAP-6 | Build State (current) | ❌ Missing | ❌ Missing | ✅ RESOLVED (09_BUILD_STATE_v15.md) |
| GAP-7 | paymentService.test.ts at correct path | ❌ Missing | ❌ Missing | ❌ STILL MISSING |
| GAP-8 | schema.sql canonical file | ❌ Missing | ❌ Missing | ❌ STILL MISSING |
| GAP-9 | Privacy Policy + Terms of Service | ❌ Missing | ❌ Missing | ❌ STILL MISSING |
| GAP-10 | DPA template | ❌ Missing | ❌ Missing | ❌ STILL MISSING |
| GAP-11 | Load test script (k6) | ❌ Missing | ❌ Missing | ❌ STILL MISSING |
| GAP-12 | Onboarding funnel schema | ❌ Missing | ❌ Missing | ❌ STILL MISSING |
| GAP-13 | receiptService.ts / buildReceiptHTML() | ❌ Missing | ❌ Missing | ❌ STILL MISSING |

---

## 7. WHAT TO DO NEXT (Priority Order)

| Priority | Action | Time | Blocks |
|----------|--------|:----:|--------|
| 🔴 IMMEDIATE | Migrate `paymentService.test.ts` to correct monorepo path | 5 min | Phase 1 cannot start without these tests |
| 🔴 IMMEDIATE | Migrate `ci.yml`, `verify-pitr.sh`, ESLint rules to monorepo | 30 min | Phase 0 exit requires these |
| 🔴 IMMEDIATE | Enable Supabase PITR and run `verify-pitr.sh` → exits 0 | 10 min | Phase 0 absolute gate |
| 🟡 PHASE 1 | Generate `schema.sql` as first Phase 1 Claude Code session | 2–3 hrs | All DB migrations |
| 🟡 PHASE 1 | Port `buildReceiptHTML()` from Electron app.js | 2 hrs | PDF receipt generation |
| 🟡 PHASE 1 | Add `onboarding_events` table to Migration 006 | 30 min | Phase 3 funnel tracking |
| 🟡 PHASE 2 | Draft Privacy Policy and Terms of Service | 4 hrs | Phase 3 launch |
| 🟡 PHASE 2 | Create Warden User Manual with screenshots | 1 day | First client onboarding |
| 🟡 PHASE 2 | Draft Landing Page Spec (`docs/LANDING_PAGE_SPEC.md`) | 2 hrs | Phase 3 acquisition |
| 🔵 PHASE 3 | DPA template — Pakistani lawyer review | PKR 20–50k | Enterprise client contracts |
| 🔵 PHASE 4 | Load test script for k6 | 2 hrs | Phase 5 launch gate |
| 🔵 PHASE 4 | Incident Runbook | 2 hrs | Operational maturity |
| 🔵 PHASE 4 | Client Onboarding Checklist | 1 hr | Scale beyond 5 clients |
| 🔵 PHASE 4 | Security Incident Response Plan | 2 hrs | PDPA compliance |

---

*HOSTYLLO Missing & Suggested Files v15.0 · Zeerak Hostix · May 2026 · Confidential*
*Merged from: Set B v14.0 (Section 2–5) + Set A v13.0 GAP-1 through GAP-5 audit findings.*
*All gap resolutions verified against actual v15 suite file contents.*
