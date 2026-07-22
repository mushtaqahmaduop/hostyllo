# HOSTYLLO — Agent Bootstrap Instructions (CLAUDE.md)
## v15.0 · Unified Suite · May 2026
### PASTE THIS AT THE START OF EVERY CLAUDE CODE SESSION

> **Authority:** This file supersedes all prior CLAUDE.md versions (v10.0, v9.0, v8.0, Agent Bootstrap files from all ZIP archives).
> It is the single source of truth for AI agent execution.
> **PRD Authority: docs/01_MASTER_PRD_v15.md · Update this file after every significant architectural change.*

---

## WHAT WE ARE BUILDING

HOSTYLLO is a multi-tenant SaaS hostel management platform for Pakistan.

- Each hostel = one isolated tenant
- Data isolation enforced at PostgreSQL Row Level Security (RLS)
- 10,000+ target tenants long-term. Pakistan-first, global-ready.
- Source of all business logic: a 12,000-line Electron desktop app currently installed at 50+ real hostels
- **DO NOT reinvent any logic that exists in the Electron app — port it verbatim**

**Current build phase:** Check `docs/09_BUILD_STATE_v15.md` before every session.
**PRD Authority:** `docs/01_MASTER_PRD_v15.md` — if anything conflicts with this CLAUDE.md, the PRD wins.

---

## SESSION START PROTOCOL (NON-NEGOTIABLE)

Before writing any code at the start of every session:

```
1. Read tasks/lessons.md → internalize all lessons from prior sessions
2. Read docs/09_BUILD_STATE_v15.md → know current phase and last completed task
3. Read tasks/todo.md → continue from where last session ended
4. State the goal for this session in ONE sentence
5. Write the session plan to tasks/todo.md with checkable items
6. Only then: start writing code
```

---

## WORKFLOW ORCHESTRATION

### 1. Plan Mode First

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- Write the plan to `tasks/todo.md` with checkable items BEFORE writing any code
- State: "About to build: [X]. Approach: [Y]. Will verify with: [Z]."
- If something goes sideways mid-session: **STOP and re-plan immediately**

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- Main session: architectural decisions and integration
- Subagents: implementation of individual files, research, test writing
- One focused task per subagent

### 3. Self-Improvement Loop

- After ANY correction from Zeerak: update `tasks/lessons.md` immediately
- Format: `LESSON: [what went wrong] → [rule to prevent recurrence]`
- **Review `tasks/lessons.md` at the start of every session before writing any code**
- If a session produces > 3 corrections on the same issue: stop coding, update this file with the clarification

### 4. Verification Before Done

Never mark a task complete without proving it works. Required for every endpoint:

```bash
# Cross-tenant isolation test — MANDATORY after every endpoint
# Create Hostel A + Hostel B. Use A's JWT to request B's data.
# Must return 404 (not 403, not 200). ALWAYS.

# Payment formula tests — if any payment code was touched
pnpm vitest packages/db/src/__tests__/paymentService.test.ts
# All 14 must pass. Zero partial credit.

# RLS check — before every deploy
SELECT tablename FROM pg_tables WHERE rowsecurity=false;
# Must return 0 rows. Any row returned = STOP, fix RLS, retry.
```

### 5. Git Discipline

```bash
# After EVERY working endpoint — not when "done", after EVERY endpoint
git add .
git commit -m "feat: [describe exactly what was built]"
# No batching. No "I'll commit at the end." Every endpoint = one commit.
```

### 6. Autonomous Problem Solving

- Given a bug report: fix it. Don't ask for hand-holding.
- Point at logs, errors, failing tests — then resolve them.
- After fixing: explain root cause + what changed + how to prevent recurrence.
- Never leave a failing CI test without understanding why it fails.

---

## TECH STACK (LOCKED — DO NOT CHANGE WITHOUT PRD UPDATE)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router · Vercel · Tailwind CSS + shadcn/ui + Framer Motion |
| Backend API | Fastify 4 + Node.js · Railway (ap-southeast-1) |
| Cloud DB | PostgreSQL via Supabase (ap-south-1 Mumbai) + Row Level Security |
| Offline DB | SQLite via wa-sqlite (OPFS, browser) — **Phase 5 ONLY. Do not import before Phase 5.** |
| Cache | Redis via Upstash (serverless, `rediss://` TLS required) |
| Auth | JWT RS256 asymmetric + httpOnly refresh cookie |
| WhatsApp | Meta Business API via 360dialog — 250 msg/day cap, 2s queue delay |
| Billing | Paymob (JazzCash/EasyPaisa) Phase 1–5 · Stripe Phase 6+ (DEFERRED until MRR trigger) |
| Job Queue | BullMQ + Redis |
| Email | Resend |
| Monitoring | Sentry (with PII filter) + Uptime Robot |
| Security | Cloudflare WAF + Turnstile CAPTCHA |
| Testing | Vitest (unit) + Playwright (E2E) + k6 (load) |
| i18n | next-intl (scaffold Phase 3, full Urdu Phase 5) |

---

## MONOREPO STRUCTURE

```
hostyllo/
  apps/
    web/          — Next.js 14 frontend (app.hostyllo.app)
    api/          — Fastify backend (Railway)
    admin/        — Super admin panel (admin.hostyllo.app)
    desktop/      — Electron app (legacy, maintenance only)
  packages/
    db/           — withTenant.ts · schema.sql · paymentService.ts · TypeScript types
    sync/         — SQLite sync engine — Phase 5 ONLY
    ui/           — shadcn/ui components + design tokens
    config/
      eslint-plugin-hostyllo/   — require-with-tenant · no-hostel-id-from-request
  docs/           — All canonical system documents (PRD v14, Blueprint, Roadmap, etc.)
  tasks/
    todo.md       — Current session tasks (update every session)
    lessons.md    — Accumulated lessons from all sessions (review every session)
  scripts/
    verify-pitr.sh  — Run on 1st of every month
```

---

## THE withTenant() PATTERN — ARCHITECTURAL CORNERSTONE

Every database query touching a tenant table MUST use this. No exceptions. Enforced at 3 levels: code, ESLint, CI.

```typescript
// packages/db/src/withTenant.ts — DO NOT MODIFY without full test suite
export async function withTenant<T>(
  hostelId: string,
  queryFn: (db: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // SET LOCAL requires an open transaction — NEVER call outside BEGIN/COMMIT
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
// hostelId ALWAYS comes from req.hostelId (set by JWT middleware)
// NEVER from req.body, req.params, or req.query
```

---

## PAYMENT FORMULA — PORT VERBATIM FROM ELECTRON

```typescript
// packages/db/src/paymentService.ts
// DO NOT modify without re-running all 14 unit tests

export function calculateUnpaid(
  rent: number,
  admFee: number,
  extraCharges: number[],
  concession: number,
  paid: number
): { totalDue: number; unpaid: number; status: 'paid' | 'partial' | 'pending' } {
  const totalDue = rent + admFee + extraCharges.reduce((sum, e) => sum + e, 0) - concession;
  const unpaid = Math.max(0, totalDue - paid);
  const status = paid >= totalDue ? 'paid' : paid > 0 ? 'partial' : 'pending';
  return { totalDue, unpaid, status };
}
```

Run before any payment UI work:
```bash
pnpm vitest packages/db/src/__tests__/paymentService.test.ts
# All 14 tests must pass. No exceptions.
```

---

## 24 CRITICAL NEVER-VIOLATE RULES

```
1.  ALL routes prefixed /api/v1/ — never add unversioned routes
2.  EVERY DB query MUST include hostel_id via withTenant() wrapper
3.  NEVER take hostel_id from URL params or request body — ALWAYS from JWT (req.hostelId)
4.  Passwords: bcrypt saltRounds=12 minimum
5.  JWT: RS256 ONLY — algorithms: ['RS256'] — never allow HS256
6.  Receipt numbers: sequential per hostel via get_next_receipt_number() — never reset, never update
7.  Phase 1–4: Cloud-only PostgreSQL. DO NOT build the offline sync engine before Phase 5.
8.  All input validated with Fastify JSON schema (additionalProperties: false) BEFORE any DB touch
9.  CNIC, TOTP secrets: AES-256 encrypted before storing — never plaintext, never in logs
10. Error responses ALWAYS use codes from Error Code Catalog (PRD Section 24)
11. CSV imports: strip = + - @ from ALL cell values before processing
12. Student photos: validate MIME type AND magic bytes, max 2MB, resize 200×200
13. File uploads: rename to {uuid}.ext BEFORE storage — never use original filename
14. WhatsApp blasts: 2-second delay between each, halt at 250/day
15. Feature gates: checkPlanFeature(featureKey) middleware before every gated route
16. HTTP Security Headers on EVERY response: CSP, HSTS, X-Frame-Options:DENY, Referrer-Policy
17. Audit log: NO delete, NO update — INSERT only, always
18. Every BullMQ worker file MUST have worker.on('failed') calling moveToDLQ()
19. git add . && git commit after every working endpoint. No exceptions.
20. Supabase Storage backup bucket: PRIVATE — signed URLs only (24hr expiry)
21. No PII (CNIC, phone, email) in Sentry error payloads — use Sentry beforeSend filter
22. All 429 responses MUST include Retry-After header
23. Logs: structured Pino JSON only. No plain text. No PII in logs ever.
24. Health check GET /api/v1/health must always respond — no auth required
```

---

## ESLINT PLUGIN — TENANT ISOLATION ENFORCEMENT

Both rules set to `'error'` — CI refuses to merge any violation.

**Rule 1: `hostyllo/require-with-tenant`**
Blocks any route handler calling `supabase.from()`, `db.query()`, `pool.query()`, or `SET LOCAL` outside a `withTenant()` wrapper.

**Rule 2: `hostyllo/no-hostel-id-from-request`**
Blocks reading `hostel_id` from `req.body`, `req.params`, or `req.query`. Only `req.hostelId` (set by JWT middleware) is valid.

```javascript
// packages/config/eslint-base.js
module.exports = {
  plugins: ['hostyllo'],
  rules: {
    'hostyllo/require-with-tenant': 'error',
    'hostyllo/no-hostel-id-from-request': 'error',
  }
};
```

---

## BULLMQ QUEUES & DEAD-LETTER QUEUE

### 7 Active Queues

| Queue | Concurrency | Retry | DLQ Action |
|-------|-------------|-------|-----------|
| pdf-receipts | 5 | 3×, exp 5s | In-app warning badge on payment |
| whatsapp-blast | 2 | 3×, 2s delay | Copy-paste modal auto-opens |
| whatsapp-receipt | 2 | 3×, 2s delay | Copy-paste modal opens |
| billing-sync | 2 | 5×, exp 5s | Super Admin red badge |
| email-send | 5 | 3×, exp 2s | Email owner about retry |
| auto-cancel | 2 | 5×, exp 10s | Super Admin alert banner |
| rent-generate | 2 | 5×, exp 10s | Super Admin warning |

### DLQ Pattern — Mandatory on Every Worker

```typescript
worker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
    await moveToDLQ(job, err); // writes to dlq_jobs table
  }
});
```

---

## CI/CD PIPELINE

```
lint-and-typecheck (all PRs + main)
      ↓
unit-tests — 14 payment tests run FIRST (all PRs + main)
      ↓
infra-gates (main branch only) — BLOCKS deploy if any fail:
  · PITR enabled and ≥ 7 days retention
  · Supabase plan is NOT free tier
  · Last backup within 48 hours
  · RLS enabled on all core tables (SELECT tablename WHERE rowsecurity=false → 0 rows)
  · ESLint violations = 0
      ↓
deploy (main branch only)
  · Vercel: app + admin
  · Railway: API
```

---

## REDIS KEY STRATEGY (All Keys Must Include hostelId)

```
# Tenant-scoped (mandatory hostelId prefix)
cache:{hostelId}:students              TTL 300s
cache:{hostelId}:rooms                 TTL 300s
cache:{hostelId}:dashboard             TTL 60s
feature:{hostelId}:{featureKey}        TTL 60s

# Rate limiting
rl:login:{ip}                          TTL 900s   (15-min login window)
rl:pwreset:{email}                     TTL 3600s  (1-hour OTP window)
rl:api:{hostelId}                      TTL 60s    (general API limit)
rl:wa:{hostelId}:daily                 TTL 86400s (WhatsApp daily cap)

# Auth
session:jti:{jtiValue}                 TTL = token expiry
idem:{idempotencyKey}                  TTL 86400s (24h)

# Admin monitoring
sync:queue:depth                       No TTL
admin:infra:status                     TTL 30s
admin:revenue:mrr                      TTL 300s
```

---

## UI DESIGN SYSTEM (Quick Reference)

```
Dark mode background:  #0b0e14   Light mode background:  #f8fafc
Gold (primary):        #c9a84c   Teal (success/paid):    #3dd8c0
Red (danger/pending):  #ef4444   Amber (warning/partial): #f59e0b
Text:                  #e2e8f4   Text muted:             #94a3b8

Fonts:
  Figtree (all English text)
  DM Mono (numbers, CNIC, money amounts)
  Noto Nastaliq Urdu (all Urdu text, line-height 2.0)

Buttons:    36px height, 8px radius, gold primary
Inputs:     40px height, gold border on focus, 3px gold ring
Loading:    NEVER spinners — skeleton shimmer ONLY
Empty:      ALWAYS illustrated + Urdu label + English label + CTA
Numbers:    Intl.NumberFormat('en-PK', {currency:'PKR'}) → 1,00,000 format
Animations: Framer Motion — page 200ms ease-out · modals 180ms scale
```

---

## DATABASE CONFIG

```
PgBouncer: poolMode=transaction (NOT session — critical for withTenant())
Max connections per API instance: 25
With 5 Railway replicas: 125 total DB connections
Supabase region: ap-south-1 (Mumbai)
Railway region: ap-southeast-1
```

---

## AI FEATURE RULES (NEW IN v11)

```
AI_RULE_1: Tier 1 AI (rule-based) = Phase 3. OK to build. No ML infrastructure needed.
AI_RULE_2: Tier 2 AI (statistical) = Phase 6. PostgreSQL window functions + regression. No GPU.
AI_RULE_3: Tier 3 AI (ML/LLM) = Phase 7 DEFERRED. DO NOT build. DO NOT design. DO NOT discuss.
AI_RULE_4: All AI outputs labeled as "Based on payment history" — never just "AI predicts"
AI_RULE_5: AI features never block core operations. Always a progressive enhancement layer.
```

---

## COURSE-CORRECTION PROTOCOL

When a session produces unexpected output or goes sideways:

```
1. STOP — do not continue in the wrong direction
2. IDENTIFY — state the exact rule from this file that was violated
3. REVERT — git diff to see what changed; git stash if needed
4. FIX — address only the identified violation, not the whole file
5. TEST — run the relevant unit test before proceeding
6. COMMIT — git commit -m "fix: [describe exact fix]" then continue
7. LEARN — update tasks/lessons.md with the pattern to prevent recurrence
```

---

## TASKS/TODO.MD FORMAT (Use This Every Session)

```markdown
# Session: [YYYY-MM-DD] — [Goal in one sentence]

## Plan
- [ ] Step 1: [description]
- [ ] Step 2: [description]
- [ ] Verify: cross-tenant isolation test on new endpoints
- [ ] Payment tests: all 14 pass (if payments touched)
- [ ] Commit: git commit -m "feat: [description]"

## In Progress
[current task]

## Done
- [x] Step 1: [description] (commit: abc1234)

## Review
[end-of-session summary: what was built, any issues found, next session starting point]
```

---

## CURRENT TASK

> [REPLACE THIS LINE WITH YOUR CURRENT TASK BEFORE EACH SESSION]
>
> Example: "Build POST /api/v1/payments with extra charges + concession support"
> Example: "Build the Cancellations page — list with 3-tab filter"
> Example: "Build AI risk scoring function in paymentService.ts"

---

*HOSTYLLO CLAUDE.md v15.0 · Zeerak Hostix · May 2026 · Confidential*
*Supersedes: CLAUDE.md v11.0, v13.0, v10.0, v9.0, Agent Bootstrap v10/v9/v8, all ZIP archive agent files.*
*PRD Authority: docs/01_MASTER_PRD_v15.md · Update this file after every significant architectural change.*

---

## QUICK REFERENCE APPENDIX

> This appendix was merged from CLAUDE.md v13.0 (Set A). It provides reference tables and a SQL query not present in v11.0.

---

## DEFERRED FEATURES — DO NOT BUILD

These are explicitly deferred. If Zeerak asks to build them before the trigger condition is met, state the trigger first:

| Feature | Trigger to Build |
|---------|-----------------| 
| Student portal (portal.hostyllo.app) | Phase 7+ — 100+ paying clients + 1 hire |
| White-label / custom domain | Phase 7+ |
| Stripe USD / multi-currency | MRR > PKR 500k/mo |
| AI rent suggestion | Hire ML engineer + MRR > PKR 500k/mo |
| ML defaulter prediction | Hire ML engineer + MRR > PKR 500k/mo |
| Offline SQLite sync | Phase 5 ONLY |
| Native iOS/Android apps | Phase 8 |
| Open API ecosystem | Phase 8 |

---

## KNOWN CRITICAL OPEN ISSUES (from 06_ISSUES_LOG.md)

These are OPEN and must be addressed in Phase 1:

| ID | Issue | Resolution |
|----|-------|-----------|
| SEC-01 | JWT HS256 forged token | `algorithms: ['RS256']` in jwtVerify |
| SEC-02 | RLS SET LOCAL race condition | withTenant() in explicit BEGIN/COMMIT |
| SEC-03 | IDOR via hostel_id in body | hostel_id from JWT only; additionalProperties:false |
| SEC-04 | RLS disabled after migration | CI check: rowsecurity=false fails build |
| SEC-05 | Role from JWT not DB | Fetch role from DB on every request |
| SEC-06 | CNIC stored unencrypted | AES-256 encryption before insert |

---

## DASHBOARD AGGREGATION QUERY (Phase 1 — One Query)

```sql
WITH monthly_data AS (
  SELECT
    COALESCE(SUM(amount_paid_pkr) FILTER (WHERE deleted_at IS NULL), 0) as revenue,
    COALESCE(SUM(unpaid_pkr) FILTER (WHERE deleted_at IS NULL), 0) as pending
  FROM payments
  WHERE hostel_id = current_setting('app.hostel_id')::uuid AND month = $1
),
expense_data AS (
  SELECT COALESCE(SUM(amount_pkr), 0) as expenses
  FROM expenses
  WHERE hostel_id = current_setting('app.hostel_id')::uuid
    AND date_trunc('month', expense_date) = date_trunc('month', $1::date)
    AND deleted_at IS NULL
),
transfer_data AS (
  SELECT COALESCE(SUM(amount_pkr), 0) as transfers
  FROM owner_transfers
  WHERE hostel_id = current_setting('app.hostel_id')::uuid
    AND date_trunc('month', transfer_date) = date_trunc('month', $1::date)
    AND deleted_at IS NULL
)
SELECT m.revenue, m.pending, e.expenses, t.transfers,
       m.revenue - e.expenses - t.transfers as net_fund
FROM monthly_data m, expense_data e, transfer_data t;
```
This is ONE query. Not five. Target: < 200ms.

---

## ENVIRONMENT VARIABLES (Complete List)

```
SUPABASE_URL, SUPABASE_SERVICE_KEY
JWT_PRIVATE_KEY (RS256), JWT_PUBLIC_KEY (RS256)
REDIS_URL (must start with rediss://)
PAYMOB_API_KEY, PAYMOB_HMAC_SECRET (Phase 4 only)
RESEND_API_KEY
WHATSAPP_API_KEY (Phase 3 only)
JAZZ_SMS_API_KEY (Phase 3 only)
ENCRYPTION_KEY (AES-256, 32 bytes)
ADMIN_ALLOWED_IPS
CLOUDFLARE_TURNSTILE_SECRET
SUPER_ADMIN_EMAIL
SENTRY_DSN
NODE_ENV
```
**All in Railway (backend) or Vercel (frontend). Zero in code. Zero in git.**

---

# PRODUCTION READINESS ADDENDUM (merged 2026-07-22)

> Merged from the former `06_CLAUDE_MD_v15_ADDENDUM.md`. Some items were aspirational when
> written (June 2026); **reconciliation notes** below mark where current code differs — trust
> the note over the original rule.

## 6 ADDITIONAL HARD RULES (25–30)

```
25. ERROR RESPONSES: never leak DB error messages, stack traces, or SQL to the client.
26. EVERY worker: on('failed') → moveToDLQ(). A worker without DLQ handling is silent data loss.
27. LOADING STATES (frontend): skeleton shimmer, not spinners.
28. EMPTY STATES: every list screen handles 0 results.
29. CROSS-TENANT TEST: after every new endpoint run the isolation helper (A JWT → B id → 404, not 403).
30. PRE-DEPLOY: run the deploy gate before every prod push; if any step fails, fix first.
```

**Reconciliation notes (code reality, 2026-07-22):**
- Rule 25 originally mandated an `AppError` class from `lib/errors` — **that class does not exist**.
  The app uses a global `setErrorHandler` (`apps/api/src/app.ts`) returning the
  `{success,code,message}` envelope with no stack leak. Follow the handler; do not invent AppError.
- Rule 29 is now automated: `apps/api/src/__tests__/isolation.test.ts` runs in the CI
  `integration-tests` job (Postgres + Redis). Still add a case per new endpoint.
- Rule 30 referenced `./scripts/pre-deploy-check.sh` — **that script does not exist**. The real
  gates today are `scripts/verify-pitr.sh`, `scripts/verify-rls.sql`, and the CI jobs.
- Health-check target below said "No DB, no Redis (<50ms)" — **superseded**: `/health` now
  intentionally probes both and returns 503 if either is down (audit finding). Latency is no
  longer the priority for that endpoint; correctness is.

## Performance targets (unchanged, still valid)

| What | Target | How |
|------|--------|-----|
| Dashboard query | < 200ms | Single CTE — never 5 queries |
| Student search | < 200ms | GIN index on pg_trgm |
| Login | < 500ms | bcrypt cost-12 is intentionally slow |

**Redis cache key format:** `cache:{hostelId}:{resource}` — the hostelId prefix is MANDATORY.
Full error catalog + CI pipeline spec: `docs/13_PRODUCTION_READINESS.md`.

