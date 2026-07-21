# 🤖 AGENT INSTRUCTIONS & REPOSITORY ACCESS

**Created:** June 10, 2026  
**Purpose:** Quick-start guide for AI agents reviewing the Hostyllo codebase  
**Status:** Ready for agent execution

---

## 📚 QUICK START FOR AGENTS

### 🔗 MAIN REPOSITORY LINKS

**Primary Repository:**
```
https://github.com/mushtaqahmaduop/hostyllo
```

**Owner:** mushtaqahmaduop  
**Repo Name:** hostyllo  
**Default Branch:** Develop  
**Repository Type:** Private/Public SaaS Monorepo

---

## 📂 KEY DIRECTORIES & CODE FILES

### Architecture Overview
```
hostyllo/
├── apps/
│   └── api/                          # Main Fastify API server
│       ├── src/
│       │   ├── server.ts             # ⚠️ CRITICAL - Fix health check + secrets
│       │   ├── lib/
│       │   │   ├── db.ts             # Database connection + withTenant()
│       │   │   ├── jwt.ts            # JWT signing/verification (RS256)
│       │   │   ├── redis.ts          # Redis client
│       │   │   └── bullmq-redis.ts   # BullMQ job queue
│       │   ├── middleware/
│       │   │   └── auth.ts           # JWT authentication middleware
│       │   ├── routes/
│       │   │   ├── auth.ts           # ⚠️ CRITICAL - Missing validation + OTP console.log
│       │   │   ├── students.ts       # Student management endpoints
│       │   │   ├── rooms.ts          # Room management endpoints
│       │   │   ├── payments.ts       # Payment processing endpoints
│       │   │   ├── expenses.ts       # Expense tracking endpoints
│       │   │   └── dashboard.ts      # Analytics/dashboard endpoints
│       │   ├── types/                # TypeScript type definitions
│       │   └── workers/              # Background job handlers
│       │       ├── auto-cancel.js
│       │       ├── pdf-receipts.js
│       │       └── rent-generate.js
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── config/                       # ESLint plugin + shared config
│   └── db/                           # Shared database utilities
│       ├── src/
│       │   ├── withTenant.ts         # Tenant isolation wrapper
│       │   ├── paymentService.ts     # Payment business logic
│       │   └── formatters.ts         # Data formatting utilities
│       └── migrations/               # Database migrations
├── docs/
│   └── docs/
│       ├── SESSION_HANDOFF.md        # Previous session context
│       └── AGENT_AUDIT_REPORT.md     # ← THIS AUDIT REPORT
├── railway.toml                      # 🔴 DEPLOYMENT CONFIG (broken, PR #11 pending)
├── railpack.json                     # Package manager configuration
├── pnpm-workspace.yaml               # Monorepo workspace config
├── turbo.json                        # Turbo build configuration
└── package.json                      # Root package.json
```

---

## 🔍 CODE REVIEW CHECKLIST FOR AGENT

### Step 1: Review Critical Issues (Blocking Production)

**Files to Review:**

1. **`apps/api/src/server.ts`** (CRITICAL)
   - Lines 16-25: ⚠️ Hardcoded default secrets (CORS_ORIGIN, COOKIE_SECRET)
   - Lines 35-37: ⚠️ Fake health check (always returns "ok")
   - Lines 12-14: ⚠️ Unhandled worker initialization
   - **Action:** Fix all 3 issues before deployment

2. **`apps/api/src/routes/auth.ts`** (CRITICAL)
   - Line 10: ⚠️ Hardcoded empty encryption key
   - Line 224: ⚠️ Console.log exposing OTP (remove immediately)
   - Line 31: ⚠️ No input validation (email/password)
   - **Action:** Fix validation + remove console.log + add encryption key validation

3. **`railway.toml`** (CRITICAL - PR #11 Pending)
   - 🔴 Node.js 18.20.5 incompatible with pnpm 11.1.1
   - **Action:** Merge PR #11 to fix

### Step 2: Review Security Issues (High Priority)

**Security Analysis Files:**

1. **`apps/api/src/middleware/auth.ts`** (Review)
   - JWT verification correct ✅
   - Token blocklist implemented ✅
   - Role-based access control ✅

2. **`apps/api/src/lib/jwt.ts`** (Review)
   - RS256 only ✅ (correct algorithm)
   - Key caching implemented ✅
   - RSASSA-PKCS1-v1_5 correct ✅

3. **`apps/api/src/lib/db.ts`** (Review)
   - withTenant() wrapper ✅ (tenant isolation)
   - Connection pool configured ✅
   - dbHealthCheck() implemented ✅

### Step 3: Review All Routes (Validation Missing)

**Routes to Audit:**

```typescript
// Review these files for input validation:
apps/api/src/routes/auth.ts          // POST /login, /refresh, /totp/setup, etc.
apps/api/src/routes/students.ts      // GET/POST/PUT/DELETE students
apps/api/src/routes/rooms.ts         // GET/POST/PUT/DELETE rooms
apps/api/src/routes/payments.ts      // GET/POST/PUT/DELETE payments
apps/api/src/routes/expenses.ts      // GET/POST/PUT/DELETE expenses
apps/api/src/routes/dashboard.ts     // GET analytics endpoints
```

**What to Check:**
- ❌ Email format validation missing
- ❌ Password strength validation missing
- ❌ Numeric field validation missing
- ❌ Request size limits missing
- ❌ Rate limiting not enabled (despite package installed)

### Step 4: Check Configuration Files

**Configuration Review:**

1. **`turbo.json`** — Build configuration
   - ✅ Correct dependency chain
   - ✅ Output caching configured
   
2. **`pnpm-workspace.yaml`** — Monorepo setup
   - ✅ apps/* and packages/* registered
   - ✅ Build permissions configured

3. **`railpack.json`** — Railway deployment config
   - ✅ pnpm package manager specified

4. **`package.json` (root)** — Root package config
   - ⚠️ No scripts for running tests
   - ⚠️ No lint configuration

---

## 🔗 DIRECT FILE LINKS FOR CODE REVIEW

### Critical Files (Requires Fixes)

**File Links:**
- `server.ts` — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/apps/api/src/server.ts
- `auth.ts (routes)` — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/apps/api/src/routes/auth.ts
- `auth.ts (middleware)` — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/apps/api/src/middleware/auth.ts
- `railway.toml` — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/railway.toml

### Review Files (For Understanding)

- `db.ts` — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/apps/api/src/lib/db.ts
- `jwt.ts` — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/apps/api/src/lib/jwt.ts
- `redis.ts` — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/apps/api/src/lib/redis.ts

### Route Files (Validation Review)

- Students routes — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/apps/api/src/routes/students.ts
- Rooms routes — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/apps/api/src/routes/rooms.ts
- Payments routes — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/apps/api/src/routes/payments.ts
- Expenses routes — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/apps/api/src/routes/expenses.ts
- Dashboard routes — https://github.com/mushtaqahmaduop/hostyllo/blob/Develop/apps/api/src/routes/dashboard.ts

---

## 📊 CODEBASE STATISTICS

**Current State:**
- **Language Breakdown:**
  - TypeScript: 80.7%
  - PL/pgSQL: 17.4%
  - JavaScript: 1.9%

- **Directory Structure:**
  - apps: 1 (main API)
  - packages: 2 (config, db)
  - Total routes: 6 major route files
  - Total lib files: 4 (db, jwt, redis, bullmq-redis)

- **Dependencies:**
  - Total: 20+ npm packages
  - Missing: zod (validation), @sentry/node (monitoring), pino (logging)
  - Unused: @fastify/jwt, @fastify/rate-limit (installed but not used)

---

## 🎯 AGENT TASKS (Priority Order)

### PHASE 1: Emergency Fixes (0-1 hours)
- [ ] Review `apps/api/src/server.ts` lines 16-37
- [ ] Fix hardcoded secrets (add validation)
- [ ] Fix fake health check (implement actual DB/Redis checks)
- [ ] Review `apps/api/src/routes/auth.ts` line 224 (remove console.log)
- [ ] Verify worker error handling is added

### PHASE 2: Security Hardening (1-3 hours)
- [ ] Review all route files for input validation
- [ ] Add zod schema validation
- [ ] Enable rate limiting in server.ts
- [ ] Fix TOTP backup code generation
- [ ] Add request size limits

### PHASE 3: Code Quality (3-4 hours)
- [ ] Add TypeScript strict mode
- [ ] Remove `as any` type casts
- [ ] Standardize error codes
- [ ] Add global error handler
- [ ] Add startup connection validation

### PHASE 4: Testing & Deployment (4-5 hours)
- [ ] Merge PR #11
- [ ] Run build verification
- [ ] Add test suite
- [ ] Staging deployment
- [ ] Production deployment

---

## 🔐 SECURITY FOCUS AREAS

**Critical Security Issues:**
1. ❌ Hardcoded secrets in `server.ts` (lines 20, 24)
2. ❌ Hardcoded encryption key in `auth.ts` (line 10)
3. ❌ Fake health check in `server.ts` (lines 35-37)
4. ❌ Console.log with OTP in `auth.ts` (line 224)
5. ❌ Missing input validation in all routes
6. ❌ Rate limiting not enabled
7. ❌ Weak TOTP backup codes in `auth.ts` (lines 252-254)
8. ❌ No request size limits
9. ❌ Missing error boundaries

**Security Score:** 50/100 (C grade) — Needs urgent fixes

---

## 📋 DEPLOYMENT STATUS

**Current State:** 🔴 **BLOCKED**

**Blocking Issues:**
1. PR #11 pending merge (Node.js/pnpm incompatibility)
2. 5 critical security issues
3. Missing input validation
4. Fake health check

**To Enable Deployment:**
1. Merge PR #11
2. Fix all 5 critical issues
3. Add input validation
4. Fix health check
5. Run security audit

**Estimated Timeline:** 8-11 hours total

---

## 🔍 HOW TO USE THIS FOR CODE REVIEW

### For AI Agents:

1. **Clone/Access Repo:**
   ```bash
   # Repository info
   owner: mushtaqahmaduop
   repo: hostyllo
   branch: Develop
   ```

2. **Start Review:**
   ```
   1. Read AGENT_AUDIT_REPORT.md (full context)
   2. Review critical files listed above
   3. Check each issue against code
   4. Implement fixes from recommendations
   5. Test locally before pushing
   ```

3. **Tools to Use:**
   - `getfile` — Fetch specific files
   - `lexical-code-search` — Search for patterns
   - `semantic-code-search` — Understand code intent
   - `create_or_update_file` — Fix issues
   - `get-github-data` — Pull PR/issue data

### For Manual Review:

1. Open GitHub: https://github.com/mushtaqahmaduop/hostyllo
2. Switch to `Develop` branch
3. Navigate to `docs/docs/AGENT_AUDIT_REPORT.md`
4. Review each issue
5. Create fixes following recommendations

---

## 📞 REFERENCE DOCUMENTS

**In Repository:**
- `docs/docs/AGENT_AUDIT_REPORT.md` — Full audit (this one!)
- `docs/docs/SESSION_HANDOFF.md` — Previous session context
- `package.json` — Dependencies list
- `railway.toml` — Deployment configuration

**External:**
- GitHub Issues: https://github.com/mushtaqahmaduop/hostyllo/issues
- GitHub PRs: https://github.com/mushtaqahmaduop/hostyllo/pulls
- Railway Logs: https://railway.app

---

## 🚀 ENVIRONMENT VARIABLES NEEDED

**For Local Testing:**
```bash
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----

# Encryption
ENCRYPTION_KEY=<64-char-hex-string>

# Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Security
CORS_ORIGIN=https://app.hostyllo.vercel.app
COOKIE_SECRET=<random-32-bytes>

# App
NODE_ENV=production
PORT=3001
```

---

## ✅ VERIFICATION CHECKLIST FOR AGENTS

After making fixes, verify:

- [ ] All hardcoded secrets removed
- [ ] Health check actually tests DB/Redis
- [ ] Input validation added to all routes
- [ ] console.log removed from production code
- [ ] Worker error handling implemented
- [ ] Rate limiting enabled
- [ ] Build passes locally (`pnpm build`)
- [ ] All tests pass (`pnpm test`)
- [ ] Lint passes (`pnpm lint`)
- [ ] No security warnings
- [ ] PR created with fixes
- [ ] Ready for deployment

---

## 📝 NOTES FOR NEXT AGENT

**Important Context:**
- This is a production SaaS application (hostel management system)
- 28 database tables with Row-Level Security (RLS) enabled
- Multi-tenant architecture (hostel_id isolation)
- Features: Auth, TOTP/MFA, Student management, Rooms, Payments, Expenses, Dashboard
- Deployment platform: Railway
- Frontend: Vercel deployment (separate)

**Current Phase:**
- Feature complete (all endpoints implemented)
- Code review phase (security audit)
- Pre-deployment phase (fixing issues)

**Success Criteria:**
- All critical issues fixed
- Security score ≥ 85/100
- Build passing
- Deployment to staging successful
- Ready for production launch

---

**Generated:** June 10, 2026  
**For:** AI Agent Code Review & Repository Access  
**Status:** Ready for implementation

🎯 **Next Step:** Agent should start with `AGENT_AUDIT_REPORT.md` for full context, then use file links above for code review.
