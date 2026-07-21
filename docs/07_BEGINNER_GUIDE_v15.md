# HOSTYLLO — Beginner Execution Guide
## Step-by-Step "What To Do Next" Guide for Solo Founder
## v15.0 · May 2026
### Supersedes Beginner Guide v14.0, v13.0, v11.0 and all prior versions

> **Who this is for:** You. Zeerak. You are one person building a production SaaS.
> This guide tells you exactly what to do, in what order, and why — with no ambiguity.
> When you feel lost, open this file. It tells you the next step.

---

## BEFORE ANYTHING ELSE — READ THIS SECTION

### The Most Important Mental Model

You are not building software. You are building a business that happens to run on software.

The goal is not a feature-complete product. The goal is:
> **5 paying clients, confirmed working, before Month 6.**

Every decision you make — what to build next, what to skip, how much to polish — must be filtered through this question:

> "Does this get me closer to 5 paying clients this week?"

If the answer is no, skip it.

### Why the Electron App Is Your Biggest Advantage

Your 50+ live hostels using the Electron app are not just customers. They are:
- Your beta testers (they will use the SaaS if you ask them)
- Your proof that the product works (wardens trust it)
- Your warm pipeline (no cold outreach needed for the first 5 clients)
- Your source of truth for every feature (don't invent things they don't use)

**Call 5 of your Electron hostel clients this week. Tell them:** "I'm building the web version with cloud backup, phone access, and automatic rent reminders. Would you be willing to try it for free and give me feedback?" Get 3 yeses before you start Phase 1.

---

## TABLE OF CONTENTS

- [STAGE 1: PRE-WORK WEEK](#stage-1-pre-work-week-do-before-writing-code)
- [STAGE 2: PHASE 1 — Cloud API](#stage-2-phase-1--cloud-api-months-14)
- [STAGE 3: PHASE 2 — Web Frontend](#stage-3-phase-2--web-frontend-months-47)
- [STAGE 4: GET YOUR FIRST PAYING CLIENT](#stage-4-get-your-first-paying-client-ongoing)
- [STAGE 5: PHASE 3 — Onboarding + Super Admin](#stage-5-phase-3--onboarding--super-admin-months-710)
- [STAGE 6: PHASE 4 — Billing Automation](#stage-6-phase-4--billing-automation-months-1013)
- [STAGE 7: PHASE 5 — WhatsApp + Offline + Scale](#stage-7-phase-5--whatsapp--offline--scale-months-1318)
- [DAILY WORK HABITS](#daily-work-habits)
- [WHEN THINGS GO WRONG](#when-things-go-wrong)
- [FINANCIAL CHECKPOINTS](#financial-checkpoints)
- [SUPPORT OPERATIONS](#support-operations)
- [LEGAL CHECKLIST](#legal-checklist-pdpa-2023--pakistan)

---

## STAGE 1: PRE-WORK WEEK (Do Before Writing Code)

**Time: 1 week. These are not optional.**

### Day 1 — Apply for External Services

These have multi-week approval timelines. Apply NOW so they're ready when you need them.

**Task 1: Apply for Meta WhatsApp Business API (30 minutes)**
1. Go to business.facebook.com
2. Create a Meta Business account if you don't have one
3. Apply for WhatsApp Business Platform (not the regular WhatsApp Business app)
4. Use 360dialog as your API provider: https://360dialog.com/
5. Submit your business documents
6. Timeline: 4–8 weeks. START NOW.
7. Log this in `tasks/todo.md`: "WA application submitted: [date]"

**Task 2: Apply for Paymob Merchant Account (1 hour)**
1. Go to paymob.com (Pakistan portal)
2. Create merchant account
3. Submit business registration documents (NTN, bank account)
4. Timeline: 1–3 business days
5. Log: "Paymob application submitted: [date]"

### Day 2 — Set Up Infrastructure Accounts

**Task 3: Create all service accounts**

```bash
# Services to sign up for (all have free tiers to start):
# 1. GitHub — create hostyllo repository (private)
# 2. Railway — create account, project, set to Pro plan
# 3. Supabase — create account, create project, UPGRADE TO PRO IMMEDIATELY
#    ↑ Free tier is FORBIDDEN in production. PKR 7,000/mo is not optional.
# 4. Upstash — create Redis database
# 5. Vercel — create account
# 6. Sentry — create project "hostyllo-api"
# 7. Uptime Robot — create account
# 8. Resend — create account (email sending)
# 9. Cloudflare — create account, add hostyllo.app domain
```

**Task 4: Enable PITR on Supabase (5 minutes)**
1. Open Supabase dashboard → Project Settings → Database → Point-in-Time Recovery
2. Enable it. Set to 7-day retention.
3. Run `scripts/verify-pitr.sh` → it must exit 0
4. Screenshot the result and save it as proof. This is the most important 5 minutes this week.

### Day 3 — Generate Secrets and Set Up Environment

**Task 5: Generate JWT RS256 keypair**

```bash
# Run this on your machine:
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Add to Railway environment variables:
# JWT_PRIVATE_KEY = [content of private.pem]
# JWT_PUBLIC_KEY = [content of public.pem]
# DELETE both .pem files from your machine after adding to Railway.
# NEVER commit these files to git.
```

**Task 6: Generate all other secrets**

```bash
# Generate ENCRYPTION_KEY (for CNIC + TOTP AES-256):
openssl rand -hex 32
# Copy output → Railway env var: ENCRYPTION_KEY

# Store in Railway env vars (not in any file):
# SUPABASE_URL, SUPABASE_SERVICE_KEY
# REDIS_URL (must start with rediss://)
# RESEND_API_KEY, SENTRY_DSN
# SUPER_ADMIN_EMAIL, NODE_ENV = production
```

### Day 4 — Vercel + GitHub

**Task 7: Create GitHub repository**
```bash
# Name: hostyllo (private repository)
# Enable branch protection on "main":
#   Settings → Branches → Add rule for "main"
#   → Require a pull request before merging
#   → Require status checks to pass before merging
#   This means: no direct pushes to main, ever
```

**Task 8: Create Vercel projects**
```bash
# vercel.com → Import from GitHub
# Project 1: "hostyllo-web" → custom domain: app.hostyllo.app
# Project 2: "hostyllo-admin" → custom domain: admin.hostyllo.app
# Both connected to your GitHub repo
# Add JWT_PUBLIC_KEY and other frontend env vars to Vercel
```

### Day 5 — Monitoring + CI Scaffold

**Task 9: Set up Sentry**

Configure the PII filter so CNIC/keys never appear in logs:
```typescript
Sentry.init({ beforeSend: (event) => {
  // strip any property matching SECRET|KEY|PASSWORD|TOKEN|CNIC
}})
```
Throw a deliberate test error → verify it appears in Sentry within 60 seconds.

**Task 10: Set up Uptime Robot + scaffold CI**
```bash
# Uptime Robot → monitor GET /health → SMS alert to your phone
# GitHub Actions: create .github/workflows/ci.yml
# Pipeline: lint → unit-tests → infra-gates → deploy
# Run green on empty repo before proceeding
```

**End of pre-work week. If `verify-pitr.sh` returned exit 0 and CI is green, you're ready for Phase 1.**

---

## STAGE 2: PHASE 1 — CLOUD API (Months 1–4)

> **Your goal this stage:** Backend API that a warden can use to manage a hostel.
> You are NOT building a UI yet. Just the API.

### Week 1–2: Database Setup

**The Golden Rule:** Every table you create must have RLS enabled immediately.

```bash
# Open your Claude Code session. Your first message:
"Read docs/06_CLAUDE_MD_v15.md in full.
Then read docs/01_MASTER_PRD_v15.md Section 17 (Database Schema).
Build: Migration 001 — hostels and users tables with RLS.
Verify: SELECT tablename FROM pg_tables WHERE rowsecurity=false; must return 0 rows."
```

Build the 28 tables in this exact order (each migration = one commit):
1. `hostels` + `users` → commit
2. `students` + `rooms` + `beds` → commit
3. `payments` + `payment_extra_charges` + `expenses` + `owner_transfers` + `fines` → commit
4. `cancellations` + `room_shifts` + `maintenance_requests` + `complaints` + `checkin_log` + `notices` → commit
5. `room_inspections` + `bill_splits` → commit
6. System tables: `subscriptions` + `audit_log` + `receipt_counter` + `warden_shift_log` + `dlq_jobs` → commit
7. Product tables: `feedback` + `nps_responses` + `onboarding_events` + `referral_payouts` + `api_keys` → commit

After all migrations: Run `verify-pitr.sh` again. Run RLS check again.

### Week 3–4: Core Package Setup

**Build `packages/db` first — before any route:**

```bash
# Claude Code message:
"Read tasks/lessons.md. Read docs/06_CLAUDE_MD_v15.md.
Build packages/db:
1. withTenant.ts — the exact implementation from CLAUDE.md
2. paymentService.ts — calculateUnpaid() ported verbatim from Electron
3. paymentService.test.ts — all 14 test cases from PRD Section 09
4. formatters.ts — fmtCnic() and fmtPhone() ported verbatim
Run the tests. All 14 must pass. Show me the output."
```

**Do not build any route until these 14 tests pass.**

### Weeks 5–6: Authentication

```bash
"Build authentication:
- POST /api/v1/auth/login (bcrypt 12 rounds, RS256, TOTP check)
- POST /api/v1/auth/refresh (rolling rotation, jti Redis blocklist)
- POST /api/v1/auth/logout
- JWT middleware (algorithms: ['RS256'], jti check, role from DB)
- Rate limit middleware (10 attempts/15min/IP via Redis)
- Security headers on every response (@fastify/helmet)

After each endpoint: cross-tenant isolation test must pass."
```

### Weeks 7–12: Core CRUD + BullMQ

**Module build order** (each module = Claude Code prompt citing FR-IDs):
1. Students (7 endpoints) — FR-STU-01 through FR-STU-18
2. Rooms + Beds (6 endpoints) — FR-RM-01 through FR-RM-10
3. Payments (8 endpoints) — **PORT calculateUnpaid() verbatim, NEVER reinvent**
4. Expenses + Transfers + Fines (finance group)
5. Cancellations + Maintenance + Complaints (operations group)
6. Check-In, Notices, Dashboard stats, Users, Health
7. All 7 BullMQ workers — every worker MUST have `worker.on('failed') → moveToDLQ()`

### Phase 1 Final Gate

Before touching Phase 2, check every item in PRD Section 00.1:

```
⬜ All 28 tables with RLS enabled
⬜ verify-pitr.sh exits 0 — logged with timestamp
⬜ All 14 payment tests pass in CI
⬜ Cross-tenant isolation on every endpoint
⬜ hostyllo/require-with-tenant ESLint rule blocking in CI
⬜ /health returns db:ok and redis:ok
⬜ bcrypt rounds ≥ 12 verified
⬜ CNIC encrypted — direct DB query confirms no plaintext
⬜ Soft-delete verified on all list endpoints
⬜ get_next_receipt_number() concurrency tested
⬜ BullMQ DLQ on all 7 queues
⬜ Sentry receiving events
⬜ No secrets in git
```

**If any box is unchecked, Phase 1 is not done. Do not start Phase 2.**

---

## STAGE 3: PHASE 2 — WEB FRONTEND (Months 4–7)

> **Your goal:** A warden can manage their hostel entirely in the browser.

### Getting Started

```bash
# Claude Code message for first frontend session:
"Read docs/06_CLAUDE_MD_v15.md. Read docs/04_UX_DESIGN_SYSTEM.md.
Set up the Next.js 14 App Router shell in apps/web:
1. Install Tailwind CSS + shadcn/ui + Framer Motion
2. Load fonts: Figtree, DM Mono (from Google Fonts), Noto Nastaliq Urdu
3. Implement all design tokens from 04_UX_DESIGN_SYSTEM.md as CSS variables
4. Build the app shell: sidebar (260px desktop, icon rail on collapse) + top header
5. Add mobile bottom tab bar
Do NOT build any module screens yet. Just the shell."
```

### Mobile-First Screen Build Order

Every screen: design at 390px first. Then expand to desktop. Never the other way.

1. **Login screen** — mobile-optimized form
2. **Dashboard** — 5 KPI cards (animated count-up), alert banners, occupancy grid, quick actions
3. **Students list + Add student flow** — typeahead search, 3-step add flow
4. **Payment recording** — mobile-optimized 3-step flow (Student Picker → Details → Confirm)
5. **Rooms list + occupancy grid** — gold/green/grey beds
6. **Expenses list + add modal**
7. All remaining Phase 2 modules (follow the feature map)
8. PWA manifest.json + service worker + install prompt

### UI Quality Checklist (After Every Screen)

- [ ] Works on 390px mobile (Chrome DevTools, iPhone 13 size)
- [ ] No spinners — only skeleton shimmers while loading
- [ ] Empty state has illustration + English + Urdu + CTA button
- [ ] All tappable elements ≥ 44×44px
- [ ] Numbers use Pakistani lakh format (1,00,000 not 100,000)
- [ ] Dark mode works (toggle in header)

### Beta Client Activation (Phase 2)
- Identify 3 willing Electron clients from 50+ warm pipeline
- Offer: 3 months free access + weekly 30-min feedback sessions
- Onboard manually (direct login setup — no wizard yet)
- Collect payment manually (bank transfer / JazzCash)
- Never charge before client confirms product works for their hostel

### Frontend Performance Gate

Before Phase 3, run Lighthouse on mobile:
- Performance: > 90
- Best Practices: > 90
- Accessibility: > 80
- Test on 4G throttle (Chrome DevTools → Network → Fast 3G)

---

## STAGE 4: GET YOUR FIRST PAYING CLIENT (Ongoing)

> **This stage runs in parallel with all technical stages.**
> Do not wait for Phase 3 to start selling. Start this in Month 1.

### Month 1 — Call Your Electron Clients

1. List all 50+ Electron hostel clients you know personally
2. Call the top 5 (the ones who are most active and trust you most)
3. Your script:
   > "Bhai, I'm building the web version. Cloud backup, phone access, WhatsApp reminders. I want 3 beta testers to try it free and give feedback. Are you interested?"
4. Target: 3 yeses before Phase 2 starts

### Month 2 — Beta Onboarding (Manual)

When your API is working (Phase 1 done):
1. Sign up your first beta client manually (create their hostel in the DB directly)
2. Walk them through adding their first student together (screen share via Zoom/WhatsApp)
3. Help them record their first payment and send a WhatsApp receipt (copy-paste method)
4. Ask: "Would you pay PKR 2,999/month for this?" The answer tells you everything.

### Handling Common Objections

| Objection | Your Response |
|-----------|--------------|
| "The desktop app works fine, why pay monthly?" | "The SaaS has cloud backup (your data survives if the laptop dies), web access from your phone, and automated WhatsApp rent reminders. The desktop app has none of these." |
| "Monthly fee is expensive." | "One missed payment dispute with no audit trail costs more than 3 months of the Starter plan. With HOSTYLLO, every payment is recorded and receipted permanently." |
| "I don't trust the internet with my student data." | "Student CNIC data is AES-256 encrypted — not even I can read it without the encryption key. And you can export all your data at any time from Settings — your data is never held hostage." |
| "What if you shut down?" | "Before any account is deleted, we automatically email you a complete export of all your data. You always own your data." |

### What NOT to Do

- Do NOT build features requested by non-paying potential clients
- Do NOT launch paid ads before 5 paying clients are live for 60+ days
- Do NOT demo features that are not live in production
- Do NOT promise WhatsApp automation until 360dialog is approved and tested

---

## STAGE 5: PHASE 3 — ONBOARDING + SUPER ADMIN (Months 7–10)

> **Your goal:** New clients can sign up without calling you. This unlocks self-serve growth.

### Before Enabling Self-Serve Signups:
1. Privacy Policy live at hostyllo.app/privacy ← Legal requirement (PDPA)
2. Terms of Service live at hostyllo.app/terms ← Legal requirement
3. Onboarding wizard tested end-to-end with a non-technical person (ask a family member)
4. WhatsApp step in wizard: fallback to SMS → copy-paste → "skip" confirmed working

### Build Order

1. **Onboarding wizard** — all 7 steps with event tracking to `onboarding_events`
2. **Super Admin panel** — you need to see what's happening with clients
3. **Landing page** — hostyllo.app with pricing, Pakistani-specific trust signals
4. **AI Tier 1 features** — payment risk scoring, maintenance pattern detection (3-4 days)
5. **NPS survey** — start collecting satisfaction data

### First Paying Client Target
- By end of Phase 3: ≥1 paying client
- Accept manual payment first (bank transfer / JazzCash direct)
- Only convert to automated billing in Phase 4
- Confirm by WhatsApp: "Are you happy with the product? Can I charge you PKR 2,999?"

---

## STAGE 6: PHASE 4 — BILLING AUTOMATION (Months 10–13)

> **Your goal:** Stop manually collecting money. Every client pays automatically.

### Before You Build Paymob

1. Confirm Paymob merchant account is approved (you applied in Month 1)
2. Read Paymob's webhook documentation carefully
3. Test the full payment flow in Paymob sandbox first (they provide test JazzCash numbers)

### Most Critical Billing Task

```bash
# The Paymob webhook handler MUST verify HMAC-SHA512 before processing ANYTHING.
# A fake webhook = fake subscription activation = free access = revenue theft.

# Test: Send a webhook with wrong HMAC → must return 400 and log the attempt
# Test: Send a webhook with correct HMAC → must process normally
# Never trust a payment webhook without HMAC verification.
```

### Phase 4 Financials
- Break-even at Phase 4 costs (PKR ~38,710/mo): 6 Pro clients
- Target by Phase 4 end: 10+ clients, MRR > PKR 50,000

---

## STAGE 7: PHASE 5 — WHATSAPP + OFFLINE + SCALE (Months 13–18)

> **Your goal:** Automated communications live. System handles real scale.

### The Offline Sync Warning

The offline sync engine (SQLite CRDT) is the most complex piece of the entire system. Here is how to not destroy yourself building it:

1. Build it in `packages/sync/` in COMPLETE isolation — do not connect to any UI yet
2. Write 10 integration tests before connecting to anything
3. Tests must cover: normal sync, conflict (same record edited on two devices), large batch (500 rows), connection drop mid-sync
4. Only after all 10 tests pass: connect to the UI
5. Never ship an untested sync engine

```bash
# Load test before Phase 5 launch — non-negotiable:
k6 run --vus 500 --duration 60s scripts/load-test.js
# p95 latency must be < 200ms. If it fails, do not launch Phase 5.

# OWASP scan before Phase 5 launch — non-negotiable:
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://app.hostyllo.app
# All critical and high findings must be resolved. Do not launch Phase 5 with open findings.
```

---

## DAILY WORK HABITS

### Before Every Work Session (5 minutes)

```
1. Open docs/tasks/lessons.md — read all lessons relevant to today's work
2. Write today's plan in docs/tasks/todo.md:
   - What phase are you in?
   - What is the ONE thing you're building today?
   - What is the verification step?
3. Check: have you run verify-pitr.sh this month?
4. Check: is Phase 1 DoD complete? If not, you're still in Phase 1.
```

### During Work Session

```
→ Complete ONE task at a time
→ Write cross-tenant isolation test BEFORE marking endpoint done
→ Commit after every working endpoint: git commit -m "feat: POST /students — CNIC encrypt, photo validate"
→ If stuck > 45 min on same issue: document it in todo.md and move to next task
→ Never commit broken tests to main
```

### After Every Work Session (5 minutes)

```
1. Update docs/tasks/todo.md: mark completed items, note blockers
2. Update docs/09_BUILD_STATE_v15.md: mark tasks done
3. Add to docs/tasks/lessons.md: any correction you received or mistake you made
4. git push to your feature branch
5. One sentence: "What do I build next session?"
```

### Monthly Checks (1st of Every Month)

```bash
# 1. PITR verification (5 minutes)
./scripts/verify-pitr.sh
# Log the output with timestamp in tasks/lessons.md

# 2. Infrastructure cost review (10 minutes)
# Open Railway, Supabase, Upstash dashboards
# Record current monthly spend — compare to budget in 05_ROADMAP_v15.md

# 3. Delete orphaned Railway environments (5 minutes)
# Any preview environment not used in 7+ days: delete it

# 4. DR drill (quarterly — 2 hours)
# Pick a past timestamp (e.g., 7 days ago at 14:00)
# Request PITR restore to staging, verify row counts
# Log result: "DR drill [date]: PASSED/FAILED [notes]"
```

---

## WHEN THINGS GO WRONG

### "The tests are failing"

```
1. Run the specific failing test in isolation: vitest run --reporter=verbose paymentService
2. Read the error message exactly — do not guess what it means
3. Check docs/tasks/lessons.md for the same pattern
4. If it's a payment formula test: go to PRD Section 7.4, re-read the exact formula
5. If stuck > 3 attempts on same test: write it in lessons.md and use /debug command
```

### "The cross-tenant test is failing"

```
1. This is a CRITICAL security issue — do not dismiss it
2. Check: is withTenant() wrapping the query?
3. Check: is SET LOCAL inside BEGIN/COMMIT? (not outside)
4. Check: is hostel_id coming from JWT (req.hostelId), never from body?
5. Do not deploy until this test passes
```

### "A client reports data looks wrong"

```
Severity P0 — drop everything
1. Immediately check: is calculateUnpaid() returning correct values? Run the 14 tests.
2. Check: is the right hostel_id being used? (IDOR risk)
3. Check audit_log for the affected entity to see what changed
4. Respond to client's WhatsApp group within 1 hour: "We are investigating, here is what we know so far"
5. Never speculate in the client's WhatsApp group — only confirmed facts
```

### "Railway is down"

```
1. Check Railway status page: status.railway.app
2. Check Sentry for error spike
3. Post in client WhatsApp groups: "We are aware of a service issue. Working to restore."
4. Check if DB is inaccessible: check Supabase status at status.supabase.com
```

### "I'm not sure what to build next"

```
Answer: Re-read this Beginner Guide from your current stage.
The answer is always the next unchecked item in the current stage's build order.
If you're uncertain whether Phase 1 is done: it's not. Check the Phase 1 DoD.
```

---

## FINANCIAL CHECKPOINTS

### Before Spending Any Money on Marketing
- Phase 1 DoD: 100% complete ✓
- At least 1 beta client using the product ✓
- At least 1 client has paid (even manually) ✓

### Before Hiring Anyone
- Trigger: MRR > PKR 150,000/mo for 2 consecutive months
- First hire: Full-Stack Developer
- Second hire: Support/Customer Success
- Never hire before cash flow is positive for 2 months

### Subscription Pricing (Do Not Change Without Strong Evidence)

| Plan | Price | When to Pitch |
|------|-------|---------------|
| Starter | PKR 2,999/mo | Small hostels (≤ 50 students, 1 branch) |
| Pro | PKR 6,999/mo | Medium hostels (50–200 students) or 2–3 branches |
| Enterprise | PKR 14,999/mo | Chains (4+ branches) or very large hostels |

The annual discount (20%) is a strong closing tool. Use it when client hesitates on monthly price.

---

## SUPPORT OPERATIONS

### Every Client Gets a WhatsApp Group
Format: "HOSTYLLO — [Hostel Name]"
Members: Zeerak + hostel owner + head warden

### Response Time Commitments
- P0 (data appears wrong, can't log in): **4 hours, 8am–10pm PKT every day**
- P1 (feature broken, workaround exists): **Same business day**
- P2 (UI issue, cosmetic): **Next release**

### What to Say in WhatsApp When Something Breaks
```
"We are aware of an issue with [feature]. We are working to fix it.
Current status: investigating.
We will update you in [time estimate].
A workaround is: [if one exists].
Thank you for your patience."
```

Then: fix it. Then: confirm fixed. Then: add lesson to lessons.md.

### What NEVER to Say to Clients
- "That feature is coming soon" (unless it's in the current phase)
- "That's a bug in the other system" (own the problem)
- "I'll fix it when I get a chance" (give a time estimate)
- "Can you try clearing your cache?" (only if you actually believe it's a cache issue)

---

## LEGAL CHECKLIST (PDPA 2023 — Pakistan)

Before any paying client data enters the system:

```
⬜ Privacy Policy live at hostyllo.app/privacy
    Must state: what PII collected, how encrypted, retention periods,
                right to export, right to request deletion

⬜ Terms of Service live at hostyllo.app/terms
    Must include: ToS acceptance logged with timestamp + IP during onboarding

⬜ Data Processing Agreement (DPA) template prepared
    HOSTYLLO = data processor (processes student data for the hostel)
    Hostel = data controller (controls their students' data)
    Sign DPA before any client uploads student PII

⬜ Impersonation disclosure in both Privacy Policy and Terms
    "HOSTYLLO support staff may access your account for support purposes.
    All such access is logged and auditable."

⬜ Data export: any client can get their full data within 48 hours, on request
⬜ Data deletion: when a client cancels, their PII is deleted within 30 days
```

---

## YOUR NORTH STAR METRICS

Check these weekly. Not daily (too distracting). Not monthly (too slow to react).

| Metric | Target | Where to Find It |
|--------|--------|-----------------| 
| Paying clients | 5 before Month 6 | Manual count |
| Weekly active wardens | > 50% of clients | Super Admin panel |
| P0 incidents | 0 per month | Sentry + client WhatsApp groups |
| Payment formula test pass rate | 100% always | CI dashboard |
| API p95 latency | < 200ms | Railway metrics |

---

## THE ONE RULE TO RULE THEM ALL

If you feel overwhelmed. If you're not sure what to build next. If scope is creeping. Come back to this:

> "What is the single thing that, if I build it today, gets me one step closer to 5 paying clients?"

Build that. Ship it. Move on.

---

*HOSTYLLO Beginner Guide v15.0 · Zeerak Hostix · May 2026 · Confidential*
*Supersedes Beginner Guide v14.0, v13.0, v11.0 and all prior versions.*
*Merged from: Set B v14 business framing + Set A v13 operational detail.*
*This document is your daily operating manual. When lost, come back here.*
