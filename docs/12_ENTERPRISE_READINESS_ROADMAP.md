# 12_ENTERPRISE_READINESS_ROADMAP.md
## HOSTYLLO — Enterprise Readiness Roadmap
### v1.0 · June 2026 · Traceable to PRD v15.0 Section 44

---

## SCOPE

This document maps HOSTYLLO's progression from current state (Phase 0 not started) through MVP, growth, scale, and enterprise stages. Every milestone is tied to exit conditions defined in PRD v15.0 Section 44. No speculative features. No premature planning.

---

## 1. CURRENT STATE (June 2026)

**Phase:** Phase 0 not started.
**Code:** Zero lines in production.
**Clients:** 50+ hostels on Electron desktop app (DAMAM). None on SaaS.
**Revenue:** PKR 0 from SaaS. Revenue from existing Electron clients (one-time, not recurring).
**Infrastructure:** Not provisioned.
**Documentation:** Complete (this suite).

**What is real:**
- Architecture decisions are correct and documented
- PRD v15.0 is the authoritative build specification
- The Electron app at 50+ hostels proves product-market fit
- Business registration (Zeerak Hostix sole proprietorship, FBR NTN) is complete
- Safepay account registered (pending verification)
- Paymob merchant application required (not yet submitted)

**What is not real:**
- Any code
- Any running infrastructure
- Any SaaS client
- Any SaaS revenue

---

## 2. STAGE 1 — MVP READINESS (Phase 0 + Phase 1)

**Duration:** Months 1–4 from Phase 0 start.
**Target:** First paying SaaS client. First PKR of recurring revenue.

### Phase 0 — Infrastructure Setup (Week 1)

| Task | Done When |
|------|-----------|
| Supabase project created (Mumbai ap-south-1) | Project URL in .env |
| PITR enabled on Supabase | `verify-pitr.sh` exits 0 |
| Railway project created | hostyllo-api service exists |
| Upstash Redis created (TLS, nearest to Mumbai) | `rediss://` URL in .env |
| Vercel project created (hostyllo-web) | Deployment URL exists |
| Monorepo scaffold created | `pnpm install` succeeds |
| `CLAUDE.md` in repo root | Agent reads it every session |
| JWT RS256 keypair generated | Both keys in Railway env vars |
| `ENCRYPTION_KEY` generated | 32-byte hex in Railway env vars |
| Cloudflare: `api.hostyllo.app`, `app.hostyllo.app` DNS configured | Both resolve |
| Uptime Robot monitor on `/health` | Alert fires on test |
| Sentry project created | DSN in Railway env vars |

**Phase 0 Exit Gate:** `verify-pitr.sh` returns exit 0. No other gate.

### Phase 1 — Cloud API Foundation (Months 1–4)

Build all 42 endpoints. Build all 28 tables with RLS. Pass all exit criteria.

**Phase 1 Exit Criteria (from PRD v15.0 Section 00.2):**
- [ ] All 28 tables exist with RLS active on every tenant table
- [ ] `SELECT tablename FROM pg_tables WHERE rowsecurity=false` returns 0 rows
- [ ] All 42 endpoints return expected responses
- [ ] Cross-tenant isolation test passes for every endpoint (JWT A → data B → 404)
- [ ] 14 mandatory payment unit tests pass
- [ ] `/health` returns `{ db: ok, redis: ok }`
- [ ] bcrypt rounds verified ≥ 12 in auth integration test
- [ ] BullMQ: all 7 queues have `worker.on('failed')` calling `moveToDLQ()`
- [ ] Soft-delete verified: `deleted_at IS NOT NULL` records excluded from all list endpoints
- [ ] `verify-pitr.sh` exits 0

**MVP Readiness milestone:** Phase 1 exit criteria met → system is ready to onboard first client.

**First client onboarding (manual, Phase 1):**
- WARDEN_MANUAL.md (does not exist yet — create before first client)
- DPA template signed (does not exist yet — create before first client)
- Manual account creation by Super Admin (self-serve signup not live until Phase 3)
- Electron data migration tool (does not exist yet — create if client requests history import)

**MVP Business Metrics Targets:**
- 3–5 paying clients within 4 months of Phase 1 exit
- All from existing DAMAM user base (direct sales, WhatsApp)
- Manual billing (screenshot verification, manual activation)
- Monthly recurring revenue: PKR 15,000–25,000 (3–5 clients × PKR 3,000–5,000/mo)

---

## 3. STAGE 2 — GROWTH STAGE (Phase 2 + Phase 3)

**Duration:** Months 4–10.
**Target:** Self-serve acquisition. 20–50 clients. Automated onboarding. Super Admin panel.

### Phase 2 — Web Frontend (Months 4–7)

Build the Next.js 14 frontend. All 8 P0 modules live. Mobile-first.

**Phase 2 Exit Criteria:**
- All 8 P0 modules: Dashboard, Students, Payments, Rooms, Expenses, Reports, Settings, Audit Log
- Lighthouse performance score > 90 on mobile
- PWA installable (manifest.json, service worker, install prompt)
- Cross-browser tested: Chrome Android, Safari iOS, Chrome Desktop
- WCAG AA contrast ratios verified on all screens

### Phase 3 — Onboarding + Super Admin + AI Tier 1 (Months 7–10)

**Phase 3 Exit Criteria:**
- 7-step onboarding wizard live and tested with 1 non-technical person (see PRD Section 33)
- Super Admin panel live at `admin.hostyllo.app` (TOTP-gated, IP-whitelisted)
- Self-serve signup live at `hostyllo.app` (Privacy Policy and Terms must be live first)
- Payment risk scoring (rule-based) active on all student records
- WhatsApp blast automation live (or copy-paste fallback documented and tested)
- `hostyllo.app/privacy` and `hostyllo.app/terms` live and lawyer-reviewed

**Growth Stage Business Metrics Targets:**
- 20–50 paying clients by Phase 3 exit
- Self-serve signup converting at > 20% trial-to-paid rate
- MRR: PKR 60,000–250,000 (20–50 clients × PKR 3,000–5,000/mo)
- Churn: < 5% monthly

**Growth Stage Readiness Checks:**

| Capability | Required For | Status at Phase 3 Exit |
|------------|-------------|----------------------|
| Self-serve signup | Unsupervised growth | Must be live |
| Automated onboarding email | Conversion | Must be live |
| Super Admin panel | Operating > 10 tenants | Must be live |
| In-app notifications | Engagement | Must be live |
| Feedback collection | Product decisions | Must be live |
| NPS survey trigger | Retention signal | Must be live |
| Privacy policy (lawyer reviewed) | Legal | Must be live |
| DPA template (signed per client) | Legal | Must be in use |

---

## 4. STAGE 3 — SCALE STAGE (Phase 4 + Phase 5)

**Duration:** Months 10–18.
**Target:** Automated billing. 100+ clients. WhatsApp live. Offline mode. k6-verified scale.

### Phase 4 — Billing Automation + SEO (Months 10–13)

**Phase 4 Exit Criteria:**
- Paymob live: subscription creation, payment processing, webhook handling
- Dunning sequence automated (AUTO-08 through AUTO-11)
- 5 clients auto-billed through Paymob for at least 1 cycle without manual intervention
- Landing page live at `hostyllo.app` with all 9 sections (PRD Section 39.2)
- Target keywords ranked (monitor via Google Search Console)
- Referral program live (`referral_payouts` table populated)

**Paymob prerequisite:** Merchant application must be submitted in Phase 1 (takes 1–3 business days). Do not wait until Phase 4 to apply.

### Phase 5 — WhatsApp + Offline + Scale (Months 13–18)

**Phase 5 Exit Criteria:**
- 360dialog WhatsApp API live (or approved BSP alternative)
- WhatsApp blast automation tested at 250/day cap without DLQ overflow
- Offline mode: SQLite sync via OPFS, POST /sync/push handles up to 500-row batch
- k6 load test: 1000 concurrent users, all endpoints p95 < 200ms

**Scale Stage Business Metrics Targets:**
- 100–200 paying clients by Phase 5 exit
- Automated billing covering > 80% of clients (< 20% still manual)
- MRR: PKR 300,000–1,000,000
- Churn: < 3% monthly (improving from Growth Stage due to WhatsApp engagement)
- NPS: > 7

**Scale Stage Readiness Checks:**

| Capability | Required For | Status at Phase 5 Exit |
|------------|-------------|----------------------|
| Paymob auto-billing | 100+ clients without manual work | Must be live |
| WhatsApp automation | Retention and collection rates | Must be live |
| Offline mode | Low-internet area wardens | Must be live |
| k6 scale verification | Confidence at 1000 concurrent | Must pass |
| Referral loop | Organic growth | Must be active |
| SEO pipeline | Inbound acquisition | Must be generating leads |

---

## 5. STAGE 4 — ENTERPRISE STAGE (Phase 6)

**Duration:** Months 18–24.
**Target:** Chain management. API access. White labelling. Enterprise clients.
**Trigger:** MRR > PKR 500,000/month.

### Phase 6 — Enterprise + AI Tier 2 (Months 18–24)

**Phase 6 Exit Criteria:**
- Chain management live (multi-branch view for `chain_manager` role)
- API v2 live with scoped API keys (`api_keys` table)
- White-label receipts live (Enterprise plan: no HOSTYLLO branding)
- Occupancy forecasting (statistical, server-side — Phase 2 of AI)
- Defaulter probability scoring (statistical regression, not ML)
- NPS > 8

**Enterprise Feature Summary:**

| Feature | Description | Plan Gate |
|---------|-------------|-----------|
| Chain management | Multi-branch dashboard, cross-branch read access for `chain_manager` role | Enterprise |
| API access | Scoped API keys, rate-limited, documented API for integration | Enterprise |
| White labelling | Receipts, WhatsApp messages, and email without HOSTYLLO branding | Enterprise |
| SSO (Phase 8) | SAML 2.0 or OIDC integration | Enterprise |
| SCIM provisioning (Phase 8) | Automated user provisioning from enterprise IdP | Enterprise |
| Advanced RBAC (Phase 8) | Custom role definitions beyond the 5 built-in roles | Enterprise |
| Advanced compliance (Phase 8) | SOC2 Type 1 report, DPA v2 with EU SCCs | Enterprise |

**Enterprise Client Requirements (what they will ask for):**

| Requirement | HOSTYLLO Status at Phase 6 | Gap |
|-------------|--------------------------|-----|
| Signed DPA | ✓ (Phase 1) | None |
| Security architecture document | ✓ (this suite) | None |
| Data residency disclosure | ✓ (Privacy Policy) | None |
| Audit trail | ✓ (audit_log, Phase 1) | None |
| PITR backup | ✓ (Phase 0) | None |
| TOTP for admin accounts | ✓ (Phase 1) | None |
| Role-based access | ✓ (Phase 1) | None |
| API access | ✓ (Phase 6) | Phase 6 |
| White labelling | ✓ (Phase 6) | Phase 6 |
| SOC2 report | ✗ | Phase 8 (deferred) |
| Custom data residency | ✗ | Phase 8 (deferred) |
| SSO | ✗ | Phase 8 (deferred) |
| SCIM | ✗ | Phase 8 (deferred) |
| SLA > 99.9% | ✗ | Requires multi-region (Phase 8) |

**Enterprise Readiness Assessment at Phase 6 Exit:**
- Can serve enterprise clients with: chain management, API access, white-label, RBAC, DPA
- Cannot serve enterprise clients requiring: SOC2, SSO, SCIM, 99.9% SLA, EU data residency
- Sales motion: position as "built for chains and growing hostel groups" — not "enterprise" in the Fortune-500 sense

---

## 6. DEFERRED STAGES

These are not in the 24-month solo roadmap. Do not build, design, or discuss with clients until triggers are met.

### Phase 7 — AI Tier 3 (Deferred)

**Trigger:** MRR > PKR 500,000/month AND ML engineer hired.

| Feature | Why Deferred |
|---------|-------------|
| AI rent suggestions (ML inference) | Requires ML model training infrastructure |
| NLP search ("students who haven't paid") | Requires LLM API integration and prompt engineering |
| AI operational assistant | Requires LLM API, cost unpredictable at scale |
| Predictive churn detection | Requires sufficient training data (Phase 3+ data) |
| Smart WhatsApp timing | Requires per-student response data (Phase 3+ data) |

### Phase 8 — Platform Ecosystem (Deferred)

**Trigger:** 3+ person team AND MRR > PKR 1,000,000/month.

| Feature | Why Deferred |
|---------|-------------|
| SSO (SAML 2.0 / OIDC) | Complex integration, enterprise sales cycle required first |
| SCIM provisioning | Paired with SSO — no point without it |
| Custom RBAC | Only needed when standard 5 roles are insufficient |
| SOC2 Type 1 | USD 15,000–30,000 cost — needs enterprise pipeline to justify |
| EU data residency | EU expansion requires legal entity, different compliance |
| White-label mobile app | Requires native iOS/Android development — not web |
| Marketplace / integrations platform | Requires API platform to be mature first |
| Advanced reporting (BI embed) | Requires data warehouse — not justified until Phase 8 |

---

## 7. FEATURE COMPLETION TRACKER

Track progress against this list at each Phase exit review:

### Core Product (Phase 1)
- [ ] All 28 database tables with RLS
- [ ] All 42 API endpoints
- [ ] 14 payment unit tests passing
- [ ] Cross-tenant isolation verified
- [ ] BullMQ: all 7 queues with DLQ

### Frontend (Phase 2)
- [ ] Dashboard module
- [ ] Students module (list, add, profile, search)
- [ ] Payments module (record, history, defaulters, generate monthly)
- [ ] Rooms module (list, add, shift, bulk fee)
- [ ] Expenses module
- [ ] Reports module (Phase 3)
- [ ] Settings module
- [ ] Audit Log module
- [ ] PWA manifest and service worker
- [ ] Mobile responsive (390px tested)

### Operations (Phase 3)
- [ ] Onboarding wizard (7 steps)
- [ ] Super Admin panel
- [ ] Self-serve signup
- [ ] Privacy policy (lawyer reviewed)
- [ ] Terms of service (lawyer reviewed)
- [ ] DPA template (created and in use)
- [ ] WARDEN_MANUAL.md

### Billing (Phase 4)
- [ ] Paymob subscription creation
- [ ] Paymob webhook handling (idempotent)
- [ ] Dunning automation (AUTO-08 through AUTO-11)
- [ ] PII purge automation (AUTO-11)
- [ ] Data export automation (AUTO-10)
- [ ] Landing page live

### Scale (Phase 5)
- [ ] 360dialog WhatsApp integration
- [ ] WhatsApp blast automation
- [ ] Offline mode (SQLite OPFS sync)
- [ ] k6 load test: 1000 concurrent, p95 < 200ms

### Enterprise (Phase 6)
- [ ] Chain management module
- [ ] API keys system
- [ ] API v2 documentation
- [ ] White-label receipts
- [ ] Occupancy forecasting (statistical)
- [ ] Defaulter probability scoring (statistical)

---

## 8. TECHNOLOGY LIFECYCLE

Planned technology replacements as scale demands grow:

| Current | Replacement Trigger | Alternative |
|---------|--------------------|-----------| 
| Uptime Robot (free) | MRR > PKR 200,000 | Better Uptime or Checkly |
| Railway (solo) | 3+ engineers | Consider AWS ECS or Fly.io for cost/control |
| Supabase (single region) | Enterprise SLA required | Multi-region Supabase or self-hosted Postgres |
| Pino + Sentry | > 1M events/day | OpenTelemetry + Grafana stack |
| Manual deployment | > 5 services | ArgoCD or Flux (GitOps) |
| Single Railway service | > 500 req/s | Microservices split (Phase 8+) |

None of these replacements are in scope before Phase 6. The current stack handles the 24-month roadmap without change.

---

*HOSTYLLO Enterprise Readiness Roadmap v1.0 · June 2026 · Traceable to PRD v15.0 Section 44*
*Review: At each Phase exit. Update: Only when phase targets change.*
