# ARCHITECTURE GAP REPORT
## HOSTYLLO v15 — Enterprise SaaS Audit
### Audited: June 2026 | Status: Pre-Build (Phase 0 Not Started)

> ⚠️ **SUPERSEDED FOR BUILD STATE (banner added 2026-07-22).** This was a June 2026
> *documentation-only* review, written when no code existed — its "nothing has been built"
> premise is now false. Phase 1 code is ~95% authored (see `09_BUILD_STATE_v15.md`). The
> architectural gap *analysis* here may still be useful as a design critique, but do NOT cite
> its build-status/coverage claims — they describe a pre-build snapshot, not today's repo.

---

## AUDIT CONTEXT

This is a review of documentation and architectural decisions only. No production code exists. No infrastructure is provisioned. Every score below reflects the quality of decisions committed to paper, not working software. The gap between documented intentions and operational reality is absolute — because nothing has been built yet. Scores that appear high reflect strong architectural thinking, not delivery.

---

## CURRENT STRENGTHS

**1. Multi-Tenancy Model is Correct**
The `withTenant()` + PostgreSQL RLS architecture is the right pattern for a bootstrapped multi-tenant SaaS. Shared infrastructure, row-level isolation, enforced at three levels (code, ESLint, CI). The `SET LOCAL` inside `BEGIN/COMMIT` eliminates the race condition that kills most naive RLS implementations. This is production-grade thinking.

**2. Security Surface is Well-Mapped**
34 identified risks, each with a concrete implementation. JWT algorithm pinning to RS256, CNIC encryption at AES-256, immutable audit log, idempotency keys, timing-safe comparisons for webhook HMAC — these are not copy-pasted security checklists. They trace to real threat vectors.

**3. Payment Formula is Treated as Critical Infrastructure**
14 mandatory unit tests, NUMERIC(10,2) enforcement, invariant-level enforcement in CI. For a Pakistani hostel product where trust is the core product, this is correct prioritization.

**4. Phase Discipline is Enforced**
The Solo Founder Operating Rules section is the most important document in the suite. Rule R-01 through R-12, the Phase 1 Definition of Done, and the DEFERRED markers on AI/ML features demonstrate genuine scope control. Most solo SaaS products die because of the opposite of this.

**5. Business Logic Has a Ground Truth**
The Electron app at 50+ live hostels is an exceptional advantage. Functions like `recalcUnpaid()`, `processAutoCancellations()`, and `buildReceiptHTML()` are production-proven. The decision to port verbatim rather than redesign is correct.

**6. Data Integrity Rules Are Machine-Enforced**
Custom ESLint rules (`require-with-tenant`, `no-hostel-id-from-request`), CI checks for RLS disabled tables, and the `get_next_receipt_number()` atomic function prevent whole categories of bugs from existing. This is better engineering discipline than most funded startups demonstrate.

---

## WEAKNESSES

**1. Zero Code Exists**
The documentation is comprehensive. The product is not. Every strength listed above exists only on paper. A documentation suite, however excellent, provides zero protection against data breaches, zero revenue, and zero market validation. Phase 0 has not started as of the audit date.

**2. Security Architecture Document Does Not Exist as Standalone File**
Section 19 of the PRD covers 34 risks. The incident response plan is embedded in Section 19.1. There is no standalone `03_SECURITY_ARCHITECTURE.md`. When a security auditor, enterprise client, or compliance reviewer asks for a security architecture document, they need a single file — not a section in a 1,715-line PRD.

**3. Database Architecture Has No Canonical SQL**
28 tables are defined. Column names are implied. Constraints are described in prose. The actual `schema.sql` does not exist anywhere in the uploaded files. `08_MISSING_SUGGESTED.md` correctly identifies this as critical, but the file has not been created. There is no ERD. There is no index strategy document. There is no query strategy.

**4. API Specification is Incomplete**
The PRD lists 42 endpoint names. Request schemas, response schemas, error codes, and rate limit rules for each endpoint are not documented. The feature map and blueprint describe what endpoints exist — not what they accept or return. A developer (or Claude Code agent) cannot build from what is documented without making decisions the PRD has not made.

**5. No Tenant Lifecycle State Machine**
The system describes tenant states (trial, active, suspended, deleted) in scattered sections. There is no single document defining the transition rules, what triggers each transition, what automation fires on each transition, what the grace period behavior is, and what data survives deletion. This must exist before Phase 3 self-serve signup is live.

**6. Observability is Alerts-Only**
Section 43 defines alerting thresholds. It does not define: what a Sentry project configuration should look like, what Pino log schema fields are mandatory on every request, what the distributed tracing strategy is (correlation IDs), what dashboards will exist and what they measure, or what the SLO/error budget framework is. "Set up Sentry" is not an observability architecture.

**7. BullMQ Architecture Lacks Failure Scenario Coverage**
Seven queues are defined with concurrency and retry settings. What is not defined: what happens when the pdf-receipts queue is backed up for 4 hours (user impact), what happens when whatsapp-blast hits the 250/day cap mid-blast (partial send state), whether jobs are idempotent on retry (critical for billing-sync), and what the DLQ TTL policy is.

**8. Subscription Engine Has No State Machine**
Section 26 is deferred to v13 (not included in v15 suite). The dunning sequence is mentioned in automation triggers but there is no complete subscription state machine. What happens on trial expiry, what data is accessible during grace period, exactly when RLS becomes restrictive, exactly when the data export job fires — these are not defined completely.

**9. Super Admin Panel Spec is Insufficient for Build**
Section 28 mentions "12 KPI types, 8 tenant tabs, DLQ monitor" as existing in v13. The v15 suite does not contain this section. A Claude Code agent cannot build the Super Admin panel from what is available.

**10. No Migration Strategy**
The 50+ existing Electron clients represent the primary growth vector for Phase 1. There is no document defining how their data migrates from the Electron app (localStorage/JSON file) to the SaaS database. This is not a technical detail — it is the go-to-market strategy for the first paying clients.

**11. Railway Architecture is Underspecified**
The PRD says "Railway ap-southeast-1" for the API. Auto-scaling rules mention "CPU > 70% → add replica (max 5)". How cold starts are handled (Railway spins down on free tier, but even on Pro, cold starts exist), what the health check configuration is, how zero-downtime deployments work, and what the Railway service topology looks like are not documented.

**12. No Secrets Rotation Plan**
23 environment variables are listed. There is no plan for rotating them — when to rotate (scheduled vs incident-triggered), how rotation is tested without downtime, and which secrets require coordinated rotation (JWT keypair rotation requires all active sessions to be invalidated, which is a user-impact event).

---

## CRITICAL RISKS

**CRIT-01: No Code, No Product**
The most critical risk is that Phase 0 has not started. Every week of delay on Phase 0 infrastructure is a week of delay before the first rupee of revenue. The documentation is complete enough to begin. Start.

**CRIT-02: Sections 20–34 Not In Suite**
The v15 PRD says sections 20–34 are "preserved verbatim from PRD v13.0 — see that document." That document is not in the uploaded suite. Critical sections are missing: disaster recovery policy, billing and subscription engine, WhatsApp system, Super Admin panel spec, onboarding wizard, environment variables, and error codes. These sections are referenced but not available.

**CRIT-03: Supabase PgBouncer Incompatibility Risk**
The architecture specifies PgBouncer in transaction mode. The `withTenant()` pattern uses `SET LOCAL` inside an explicit transaction, which is transaction-mode-compatible. However, Supabase's PgBouncer setup has version-specific behaviors with `SET LOCAL`. This must be verified in Phase 0 before any data reaches production, not discovered in Phase 2 when clients exist.

**CRIT-04: BullMQ + Railway Ephemeral Storage**
BullMQ jobs include PDF receipt generation. If Railway restarts the API pod during active job processing (deploy, crash, scale-down), in-flight jobs are lost unless the BullMQ worker uses stalled job detection. The PRD does not specify `stalledInterval` or `maxStalledCount` configuration. Lost receipt jobs = missing receipts = client trust damage.

**CRIT-05: CNIC Encryption Key Rotation Not Defined**
CNIC is AES-256 encrypted at rest. The `ENCRYPTION_KEY` env var holds the key. There is no plan for what happens when this key is compromised or needs rotation. Re-encrypting tens of thousands of CNIC records in a live production database requires a migration strategy. No such strategy exists in the documentation.

**CRIT-06: Missing Client Migration Path**
Phase 1 target is existing Electron clients. These clients have student records, payment history, and room data in localStorage/JSON. No import tooling, migration protocol, or data mapping document exists. Without this, Phase 1 "first client" requires manual data entry, which damages the pitch to existing DAMAM users who expect their historical data to survive the migration.

---

## MEDIUM RISKS

**MED-01: Font Strategy Conflict**
PRD Section 42 specifies `Figtree` as the body font. CLAUDE.md references `Geist + JetBrains Mono` from memory in prior sessions. The UX Design System (04_UX_DESIGN_SYSTEM.md) confirms Figtree. This inconsistency exists in the documentation history and could cause a Claude Code agent using an older session to use the wrong font system.

**MED-02: Urdu RTL Not Scoped for Phase 1**
The PRD lists Urdu as a requirement. Section 41.5 mentions full RTL support. But `next-intl` is scaffolded in Phase 3, full Urdu in Phase 5. Phase 1 clients using the product in English will experience an English-only interface. The PRD does not explicitly state Phase 1 is English-only, creating ambiguity for the agent building it.

**MED-03: Paymob Integration Risk**
Paymob is the sole billing mechanism for Phase 4. The merchant account application takes 1–3 business days. The PRD requires starting this in Phase 1. If Paymob rejects the application or requires additional documentation for a solo founder without a registered business entity, Phase 4 billing automation has no fallback. Manual billing (Rule R-07) covers this operationally, but there is no documented contingency gateway.

**MED-04: 360dialog WhatsApp Approval**
WhatsApp Business API approval takes 4–8 weeks and can be rejected. Phase 3 ships WhatsApp automation. If 360dialog approval fails, the entire WhatsApp automation pillar of Phase 3 is blocked. The copy-paste fallback is noted but the user experience difference is significant. No alternative provider (like WABA direct or a different BSP) is documented.

**MED-05: `data-export` Queue Not in BullMQ Spec**
The Product Blueprint lists `data-export` as one of the 7 queues. The BullMQ specifications in Section 37.3 list only 7 queues but the list includes `whatsapp-blast`, `whatsapp-receipt`, `billing-sync`, `email-send`, `auto-cancel`, `rent-generate`, and `pdf-receipts`. `data-export` appears in the Blueprint but is absent from the Section 37.3 queue table. A discrepancy in queue inventory before any code is written will cause a discrepancy in what gets built.

**MED-06: Electron Codebase Not In Repository**
The PRD repeatedly references the Electron app as the source of truth. Functions like `recalcUnpaid()`, `processAutoCancellations()`, and `buildReceiptHTML()` must be "ported verbatim." The Electron codebase is not in the uploaded suite. If the PRD's description of these functions diverges from the actual implementation, the port will be wrong. A Claude Code agent cannot port verbatim what it cannot read.

---

## LOW RISKS

**LOW-01: PgBouncer Session Mode Used by Supabase Auth**
Supabase's built-in auth features require session mode PgBouncer. HOSTYLLO uses Supabase for the database only (custom JWT, not Supabase Auth). This should be fine, but if any Supabase extensions or dashboard features that use session-mode PgBouncer are enabled inadvertently, it could affect the transaction-mode assumption.

**LOW-02: Redis Key Expiry for Idempotency**
Idempotency keys are stored in Redis with 24h TTL. If Redis is flushed (incident response Step 1 includes `FLUSHALL`), all in-flight idempotency keys are lost. A payment submitted just before an incident flush could be reprocessed. This is an extremely low probability but should be documented as a known limitation.

**LOW-03: Vitest vs Jest**
Testing framework is listed as Vitest. The `paymentService.test.ts` from `hostyllo_fixes.zip` was written before this decision was committed. If it uses Jest-specific APIs, it will need adaptation. Low risk — Vitest is Jest-compatible for most use cases — but requires verification.

---

## MISSING COMPONENTS

These components are required for production and do not exist anywhere in the documentation suite or referenced archives:

| Component | Blocks | Priority |
|-----------|--------|----------|
| `packages/db/src/schema.sql` | All Phase 1 DB work | CRITICAL |
| `packages/db/src/__tests__/paymentService.test.ts` (at correct path) | Phase 1 exit gate | CRITICAL |
| `03_SECURITY_ARCHITECTURE.md` (standalone) | Security audits, compliance | HIGH |
| `04_DATABASE_ARCHITECTURE.md` (standalone with ERD) | Database build | HIGH |
| `05_API_SPECIFICATION.md` (full request/response schemas) | API build | HIGH |
| `06_SAAS_OPERATIONS.md` | Phase 3 operations | HIGH |
| `07_TENANT_LIFECYCLE.md` | Phase 3 self-serve | HIGH |
| `08_AUDIT_COMPLIANCE.md` | PDPA obligation | HIGH |
| `09_FEATURE_FLAG_ARCHITECTURE.md` | Phase 2+ rollouts | MEDIUM |
| `10_OBSERVABILITY_ARCHITECTURE.md` | Phase 1 monitoring | HIGH |
| `11_BUSINESS_CONTINUITY.md` | Production readiness | HIGH |
| `12_ENTERPRISE_READINESS_ROADMAP.md` | Growth planning | MEDIUM |
| `docs/WARDEN_MANUAL.md` | First client onboarding | HIGH |
| `docs/CLIENT_ONBOARDING.md` | First client onboarding | HIGH |
| `docs/legal/DPA_template.md` | PDPA compliance | HIGH |
| `scripts/verify-pitr.sh` (at monorepo path) | Phase 0 exit | CRITICAL |
| `scripts/setup-dev.sh` | Developer experience | LOW |
| `docs/ELECTRON_DATA_MIGRATION.md` | Phase 1 client migration | HIGH |
| PRD Sections 20–34 (missing from suite) | Multiple phases | CRITICAL |
| BullMQ stalled job configuration | Phase 1 reliability | HIGH |
| CNIC key rotation runbook | Security operations | HIGH |

---

## RECOMMENDED ADDITIONS

1. **Standalone Security Architecture Document** — Pull Section 19 + incident response into a reviewable standalone file.
2. **Canonical schema.sql** — Generate as first Phase 1 act, verify against every PRD invariant.
3. **Full API Specification** — Each of the 42 endpoints needs request schema, response schema, and error codes. This is the build contract for Claude Code.
4. **Tenant Lifecycle State Machine** — Diagram + transition table + automation triggers per state.
5. **Electron Data Migration Guide** — How to export from localStorage JSON and import to the SaaS API.
6. **Observability Configuration Guide** — Sentry project config, Pino log schema, correlation ID strategy, dashboard definitions.
7. **BullMQ Production Configuration** — `stalledInterval`, `maxStalledCount`, idempotency guarantees per queue, DLQ TTL.

---

## RECOMMENDED REMOVALS

1. **Redundant version references in SYSTEM_OVERVIEW.md** — The contradiction log and file origin tracking (Set A vs Set B) is historical context useful during merge but noise for ongoing development. Archive to a separate `docs/archive/merge-history.md`.
2. **Enterprise vision sections (35–42) in PRD** — These are correctly labeled as vision documents. They should be moved to a separate `docs/vision/` directory. Their presence in the main PRD creates cognitive load for a Claude Code agent reading the PRD to build Phase 1 features.
3. **Duplicate content across 00_SYSTEM_OVERVIEW.md and 01_MASTER_PRD.md** — Critical invariants appear in both files. Single source of truth means one location. PRD wins; Overview should reference without duplicating.

---

## RECOMMENDED REFACTORS

1. **PRD Structure** — Split the 1,715-line PRD into: `01_PRD_FOUNDATION.md` (Sections 00–16, what to build), `01_PRD_INFRASTRUCTURE.md` (Sections 17–25, how to build it), `01_PRD_BUSINESS.md` (Sections 26–34, business systems). A Claude Code agent starting a new session should not load 1,715 lines to find the 200 lines relevant to its current task.
2. **CLAUDE.md** — Move the tech stack table and monorepo structure from CLAUDE.md into the blueprint. CLAUDE.md should be agent behavioral rules only, not architecture reference. Agents should not look up the Fastify version in their behavioral instructions file.
3. **Build State** — The `09_BUILD_STATE_v15.md` needs a richer current-session artifact format: last endpoint built, last test that passed, current migration number. What it has is a checklist, not a state machine.

---

## LAUNCH READINESS SCORE

**2 / 10**

Rationale: The architectural thinking is production-grade. Nothing is built. Phase 0 infrastructure is unprovisioned. Zero endpoints exist. Zero clients are onboarded. A score above 2 would require at least one working endpoint and one passing test in CI. The documentation quality saves this score from being 1.

---

## ENTERPRISE READINESS SCORE

**3 / 10**

Rationale: Multi-tenancy model is correct. Security risks are identified. Compliance obligations (PDPA) are acknowledged. What is missing: no audit trail is running, no compliance documentation is complete, no DPA has been signed with any client, no SOC2 controls are defined, no penetration test has occurred. Enterprise clients cannot use a product with a zero-line codebase regardless of how good the architecture document is.

---

## TECHNICAL DEBT SCORE

**2 / 10** (low debt — 2 is good here)

Rationale: Debt is minimal because nothing is built. The decisions made on paper are sound. The NUMERIC(10,2) invariant, the withTenant pattern, and the ESLint enforcement mean that when code is written, it will be built correctly by default. The main debt risk is the enterprise vision sections (35–42) creating scope pressure to build too much too early.

---

## SECURITY SCORE

**6 / 10**

Rationale: On paper, the security architecture is strong. RS256, CNIC encryption, RLS, immutable audit log, idempotency — these are correct decisions. Score is penalized because: no penetration test has been done, CNIC key rotation is undefined, the incident response plan has never been rehearsed, and the document-to-implementation gap means the security controls are theoretical.

---

## SCALABILITY SCORE

**7 / 10**

Rationale: The architecture (RLS multi-tenancy, connection pooling, Redis caching, BullMQ async processing, stateless API) scales correctly to thousands of tenants without architectural change. Score is penalized because: no load testing has been done, cold start behavior on Railway is uncharacterized, and the materialized view refresh strategy for analytics under load is not defined.

---

## OPERATIONAL MATURITY SCORE

**2 / 10**

Rationale: The runbook does not exist. The on-call process is a solo founder's phone. Monitoring is a Sentry project that has not been configured. Alerting is Uptime Robot that has not been set up. Zero incidents have been handled. Score reflects operational reality, not documented intent.

---

*HOSTYLLO Architecture Gap Report · June 2026 · Confidential*
*Audited against: HOSTYLLO_PRD_v15_suite.zip + HOSTYLLO_v15_docs.zip*
