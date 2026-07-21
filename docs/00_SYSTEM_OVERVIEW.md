# HOSTYLLO — SYSTEM OVERVIEW
## Unified Intelligence Brief · v15.0 · May 2026
### Synthesized from: PRD v14, v13 gap-fill suite, all prior archives

| Field | Value |
|-------|-------|
| Document | System Overview — Single-Page Intelligence Brief |
| Synthesized By | System Architect of Record |
| Source Authority | All uploaded file sets — fully audited and cross-referenced |
| PRD Authority | 01_MASTER_PRD_v15.md supersedes all prior versions |
| Build Status | Phase 0 — NOT STARTED (all tasks ⬜ TODO) |
| Classification | Confidential — Founder Only |

---

## 1. WHAT HOSTYLLO IS

HOSTYLLO is a **cloud-native, multi-tenant SaaS hostel management platform** for Pakistan-first with global expansion goals. It is not generic ERP. It is not admin software. It is the operational backbone of modern accommodation businesses — from a single boarding house in Peshawar to a 10-branch student housing chain in Karachi.

**Product DNA:** Every feature traces to a real, battle-tested Electron desktop application (DAMAM HMS / HOSTIX) currently live at 50+ Pakistani hostels. ~12,000 lines of JavaScript. 316 functions. 14 modules. Zero speculative features.

**Repositioned Vision:** "An AI-powered operational intelligence platform for modern accommodation businesses."

---

## 2. ALL UPLOADED FILES — AUDIT VERDICT

| File | Type | Authority Level | Key Contribution |
|------|------|----------------|-----------------|
| 01_MASTER_PRD_v14.md | PRD | **HIGHEST** — Current canonical PRD | 31 sections, all invariants, solo rules, budget, PDPA |
| hostyllo_docs_v10.zip | Docs bundle | HIGH — Active working docs | CLAUDE.md v10, Roadmap v10, Architecture v10, Build State |
| HOSTYLLO_Enterprise_Analysis_Report.docx | Risk audit | HIGH — Grounding document | 34 security risks, 23 Electron gaps, 11 SaaS gaps, scaling analysis |
| hostyllo_fixes.zip | Code artifacts | HIGH — Implementation-ready | ESLint rules, CI/CD yaml, PITR script, payment tests, BullMQ spec |
| hostyllo-claude-agents.zip | AI workflow | HIGH | CLAUDE.md v9, command palette (/architect, /security, /db, etc.) |
| HOSTYLLO_Enterprise_Blueprint_v9.zip | Blueprint | MEDIUM — Predecessor to v10 | Strategy, build guide, security/testing spec |
| files.zip | Snapshot bundle | MEDIUM — April 2026 state | AGENT.md, MASTER_PRD, SYSTEM_BLUEPRINT, CODEBASE_AUDIT |
| files__1-6_.zip | Earlier iterations | LOW — Historical context | Pre-v9 states, superseded by v14 |
| 01_MASTER_PRD.md | Older PRD | LOW — Superseded by v14 | Earlier draft |
| hostyllo_fixes.zip | Code fixes | HIGH | Actual implementation artifacts (tests, CI, ESLint) |
| Cloudberry_PRD.docx / _1.docx | UNRELATED | NOT APPLICABLE | Developer tooling platform — different product entirely. Not integrated. |
| HOSTYLLO_Enterprise_Blueprint.zip | Blueprint | MEDIUM | Earlier blueprint, superseded by v9 |

**CRITICAL FINDING:** The two Cloudberry PRD files are for a completely different product (a developer platform for local-to-production parity). They are NOT integrated into this system.

---

## 3. KEY ARCHITECTURAL DECISIONS (LOCKED)

| Decision | Value | Why Locked |
|----------|-------|------------|
| Frontend | Next.js 14 App Router, Vercel | Serverless, Vercel's zero-config CI, global CDN |
| Backend | Fastify 4, Node.js, Railway | Low-latency, schema validation built-in, Railway's pnpm support |
| Database | PostgreSQL via Supabase (Mumbai, ap-south-1) | PITR backup, RLS multi-tenancy, pg_trgm search |
| Cache/Queue | Redis via Upstash (serverless), BullMQ | rediss:// TLS, pay-as-you-go, transient jobs |
| Auth | JWT RS256 asymmetric, httpOnly refresh cookie | Algorithm confusion attack prevention |
| Multi-tenancy | PostgreSQL RLS + withTenant() pattern | SET LOCAL inside BEGIN/COMMIT — race condition eliminated |
| Offline (Phase 5) | SQLite Wasm (wa-sqlite, OPFS) | Browser-native, no install required |
| Billing (Phase 4) | Paymob — JazzCash/EasyPaisa | Only Pakistan-approved gateway with mobile money |
| WhatsApp (Phase 5) | 360dialog — Meta Business API | 250/day cap, 2s delay enforced |
| AI/Automation (Phase 7) | DEFERRED — MRR trigger + hire required | Solo founder cannot staff ML in 24 months |

---

## 4. CURRENT BUILD STATE

**Phase:** Phase 0 — Infrastructure Setup
**Status:** NOT STARTED
**Everything is ⬜ TODO**
**First client data:** Blocked until `verify-pitr.sh` returns exit code 0

**Pre-work items that must happen before touching code:**
1. Enable Supabase PITR — 5 minutes
2. Apply for Meta WhatsApp Business API — NOW (4-8 week approval)
3. Apply for Paymob merchant account — NOW (1-3 business days)
4. Generate JWT RS256 keypair — `openssl genrsa -out private.pem 2048`
5. Create PWA manifest.json
6. Set up Sentry with PII filter

---

## 5. CRITICAL INVARIANTS (6 ABSOLUTE RULES — NEVER VIOLATE)

> These are the 6 rules that, if violated, result in either a security breach, data loss, or financial error. They are hardcoded into CI and ESLint.

```
INVARIANT-1: algorithms: ['RS256'] ONLY in jwtVerify() — HS256 = token forgery
INVARIANT-2: withTenant() wraps EVERY DB query — raw queries = cross-tenant data breach
INVARIANT-3: hostel_id from JWT ONLY — never from body/params/query = IDOR
INVARIANT-4: Payment amounts: NUMERIC(10,2) ONLY — FLOAT = accounting errors
INVARIANT-5: audit_log: INSERT ONLY — UPDATE/DELETE = tamper evidence destroyed
INVARIANT-6: Supabase PITR active before any client data — Free tier = production FORBIDDEN
```

---

## 6. WHAT DOCUMENTS THIS SUITE CONTAINS

| File | Purpose |
|------|---------| 
| 00_SYSTEM_OVERVIEW.md | This document — complete synthesis |
| 01_MASTER_PRD_v15.md | THE source of truth — v14 enterprise PRD + v15 merge updates |
| 02_PRODUCT_BLUEPRINT.md | Architecture, modules, system map, data flows (v13 base — most complete) |
| 03_FEATURE_MAP.md | Merged feature inventory: FR-IDs (v13) + emoji priorities (v14) |
| 04_UX_DESIGN_SYSTEM.md | Full UX specification — fills GAP-1 identified since v12 |
| 05_ROADMAP_v15.md | Phased execution plan with PKR revenue timeline and day-by-day schedule |
| 06_CLAUDE_MD_v15.md | AI agent working instructions — v11 base + v13 quick-reference appendix |
| 07_BEGINNER_GUIDE_v15.md | Step-by-step solo founder guide — merged best of v14 + v13 |
| 08_MISSING_SUGGESTED.md | Gap analysis and suggested additional files — updated for v15 |
| 09_BUILD_STATE_v15.md | Live build tracking document — created new for v15 suite |

---

## 7. PRODUCT POSITIONING (ENTERPRISE LAYER)

HOSTYLLO competes in a space where the most credible alternatives are:
- Generic ERP (Tally-style — complex, expensive, enterprise-only)
- Excel/WhatsApp manual management (90% of Pakistan's hostels today)
- Global platforms (not Pakistan-localized, no CNIC support, no Urdu, no JazzCash)

**Positioning Statement:** HOSTYLLO is the only platform that combines the familiarity of what Pakistani wardens already know (from the Electron app experience), the intelligence of AI-assisted operations, and the trust of enterprise-grade security — in a mobile-first, bilingual (Urdu/English), Pakistan-native SaaS.

**Long-term category:** AI-powered operational intelligence for accommodation businesses. The "Stripe" of hostel management — premium, trustworthy, operationally intelligent.

---

## MERGE AUDIT — v13 FINDINGS

> This appendix records findings from the v13 gap-fill audit. Included per the v15 merge spec.

### Key Findings from v13 Audit

1. **Cloudberry PRDs are unrelated to HOSTYLLO.** Two uploaded files (`Cloudberry_PRD.docx`, `Cloudberry_PRD_1.docx`) are a completely separate project — a developer platform created from a Codeflare web security video. They have zero connection to hostel management or Pakistan. Ignored entirely.

2. **Nothing is built yet.** Every task in the build state files is `⬜ TODO`. Phase 0 has not been completed. No code exists. Zero infrastructure provisioned. The roadmap must start from literal zero.

3. **PRD version hierarchy.** The v13 audit identified v13.0 as then-authoritative. v14 (Set B) supersedes v13, and v15 (this suite) supersedes v14. The correct version hierarchy is: `v15.0 > v14.0 > v13.0 > v12.0 > all prior`.

4. **"Enterprise AI" master prompt conflict with solo reality.** Any instruction to build ML inference, AI analytics, or "cinematic dashboards" in Phases 1–4 conflicts with the solo founder constraint. Resolution: AI vision is deferred to Phase 7–8 with explicit MRR + hire triggers. Tier 1 AI (rule-based) is OK from Phase 3.

5. **One critical missing file (now resolved).** The PRD referenced `04_UXDESIGN_SYSTEM.md` since v12. This file did not exist in any prior uploaded set. It is now included as `04_UX_DESIGN_SYSTEM.md` in this v15 suite. **GAP-1 is resolved.**

6. **HOSTYLLO is the canonical brand name.** Historical inconsistency between "HOSTEX-Space" and "HOSTYLLO" was resolved in Blueprint v10. All new code and docs use HOSTYLLO.

---

### CONTRADICTION LOG

All contradictions between Set A (v13) and Set B (v14), resolved:

| Contradiction | Files | Resolution |
|--------------|-------|------------|
| Phase count: 6 active vs 8 total | v12 had 8 phases; v13/v14 demote 7-8 to DEFERRED | v14 wins: 6 active phases, 7–8 DEFERRED |
| Student portal phase | v12: Phase 6; v13: DEFERRED Phase 7+ | v14 resolves: Phase 6 (downgraded from DEFERRED) |
| Stripe/USD billing | v12: Phase 6; v13: DEFERRED when MRR > PKR 500k | v13 wins: DEFERRED — more conservative |
| AI rent suggestion | v12: GAP-P08 Phase 2; v13: DEFERRED Phase 7+ | v13 wins: DEFERRED (more conservative on security/financial invariant) |
| Table count | CLAUDE.md v9 says "22 tables"; v13/v14 says "28 tables" | v14 wins: 28 tables |
| Brand name HOSTEX-Space vs HOSTYLLO | Old vs canonical | HOSTYLLO canonical; all artifacts use this |
| UX Design System | v12/v13/v14 all reference it; none included it | RESOLVED in v15: 04_UX_DESIGN_SYSTEM.md included |

---

### PRODUCTION READINESS VERDICT (Updated for v15)

| Area | Status | Assessment |
|------|--------|------------|
| PRD Documentation | ✅ Complete | v15.0 suite is enterprise-grade |
| Security Architecture | ✅ Complete | 34 risks mitigated, 6 invariants |
| Database Design | ✅ Complete | 28 tables, RLS, withTenant() |
| Payment Logic | ✅ Complete | 14 unit tests, formula specified |
| Build Artifacts | ✅ Ready to use | hostyllo_fixes.zip has ESLint plugins, tests, CI YAML, verify-pitr.sh |
| CLAUDE.md for Claude Code | ✅ Complete | 06_CLAUDE_MD_v15.md — v11 base + v13 appendix |
| UX Design System | ✅ RESOLVED | 04_UX_DESIGN_SYSTEM.md now included — GAP-1 closed |
| Beginner Guide | ✅ Complete | 07_BEGINNER_GUIDE_v15.md — merged v14 + v13 |
| Build State Tracking | ✅ CREATED | 09_BUILD_STATE_v15.md — new in v15 suite |
| Actual Code | ❌ ZERO | Nothing is built |
| Infrastructure | ❌ NOT PROVISIONED | Phase 0 not completed |

---

*HOSTYLLO System Overview v15.0 · Synthesized May 2026 · System Architect of Record*
