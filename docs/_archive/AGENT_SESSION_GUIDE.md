# 🚀 Hostyllo Agent Session Guide

**Your comprehensive guide to start working with the Hostyllo codebase**

---

## 📌 Quick Reference

| Aspect | Details |
|--------|---------|
| **Repository** | [mushtaqahmaduop/hostyllo](https://github.com/mushtaqahmaduop/hostyllo) |
| **Type** | Enterprise-level SaaS (Monorepo with Turbo) |
| **Live Demo** | https://hostyllo.vercel.app |
| **Primary Language** | TypeScript (82.9%) |
| **Main Branch** | `Develop` |
| **Package Manager** | pnpm 11.1.1 (REQUIRED) |
| **Build Tool** | Turbo 2.9.16 |
| **Backend Framework** | Fastify 4.28.0 |
| **Database** | PostgreSQL + PLpgSQL |
| **Deployment** | Railway (with Railpack builder) |

---

## 🏗️ Repository Architecture

### Monorepo Structure (Turborepo)

```
hostyllo/
├── apps/
│   └── api/                              # Main backend server
│       ├── src/
│       │   ├── server.ts                 # Entry point (Fastify app)
│       │   ├── routes/
│       │   │   ├── auth.ts              # Authentication endpoints
│       │   │   ├── students.ts          # Student management
│       │   │   ├── rooms.ts             # Room management
│       │   │   ├── payments.ts          # Payment processing
│       │   │   ├── expenses.ts          # Expense tracking
│       │   │   └── dashboard.ts         # Dashboard data
│       │   ├── workers/                 # BullMQ job workers
│       │   │   ├── auto-cancel.js       # Auto-cancellation jobs
│       │   │   ├── pdf-receipts.js      # PDF generation
│       │   │   ├── rent-generate.js     # Rent calculation
│       │   │   ├── billing-sync.js      # Billing synchronization
│       │   │   └── email-send.js        # Email notifications
│       │   └── middleware/              # (To be confirmed)
│       ├── dist/                         # Compiled TypeScript output
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── config/                           # Shared config & ESLint rules
│   │   ├── eslint-plugin-hostyllo/      # Custom ESLint plugin
│   │   └── package.json
│   └── db/                               # Database models & utilities
│       ├── src/
│       │   ├── models/                  # DB schemas
│       │   └── migrations/              # SQL migrations
│       └── package.json
│
├── scripts/                              # Utility scripts
├── tasks/                                # Build/deployment tasks
├── .github/
│   ├── workflows/                        # CI/CD pipelines
│
├── .vscode/                              # VS Code workspace settings
├── docs/                                 # Documentation
│
├── ROOT Configuration Files:
│   ├── package.json                      # Root monorepo config
│   ├── pnpm-workspace.yaml              # Workspace definitions
│   ├── pnpm-lock.yaml                   # Dependency lock file (100KB+)
│   ├── turbo.json                       # Turbo build orchestration
│   ├── railway.toml                     # Railway deployment config
│   ├── railpack.json                    # Railpack builder settings
│   ├── AGENT_CONTEXT.md                 # Original agent context
│   ├── .gitignore
│   └── README.md                        # (Not found - may be missing)
```

---

## ⚙️ Build System Explained

### What is "Build"?

In the Hostyllo context, **"build"** refers to the entire process that takes your TypeScript source code and prepares it for production deployment:

```
TypeScript (src/) 
  ↓
  tsc (TypeScript Compiler)
  ↓
JavaScript (dist/)
  ↓
Production Ready
```

### Build Pipeline

1. **Local Development Build**:
   ```bash
   cd apps/api
   pnpm build        # Runs: tsc (compiles TypeScript → JavaScript in dist/)
   ```

2. **Monorepo-Wide Build** (via Turbo):
   ```bash
   pnpm build        # Turbo runs build across all packages in dependency order
   ```

3. **Deployment Build** (Railway):
   ```bash
   buildCommand = "pnpm --filter @hostyllo/api build"  # Only builds the API app
   ```

### Build Output
- **API**: `apps/api/dist/server.js` (main executable)
- **Packages**: Compiled outputs in respective `dist/` folders
- **Cache**: Turbo caches build artifacts for incremental builds

### Build Configuration (turbo.json)

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],     // Builds dependencies first
      "outputs": [".next/**", "dist/**"]  // What to cache
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

---

## 🔧 Tech Stack Deep Dive

### Backend Framework
- **Fastify** (4.28.0): High-performance Node.js HTTP framework
  - 16+ registered plugins (CORS, security, JWT, rate-limit, etc.)
  - Entry point: `apps/api/src/server.ts`

### Security Layer
- **JWT Authentication** (jose 5.9.3): Token-based auth
- **2FA/TOTP** (otplib 13.4.1): Time-based one-time passwords
- **Password Hashing** (bcrypt 5.1.1): Secure password storage
- **Helmet** (11.0.0): Security headers
- **CORS** (9.0.0): Cross-origin requests
- **Rate Limiting** (9.0.0): DDoS protection
- **Cookies** (9.4.0): Session management

### Database & Storage
- **PostgreSQL** (pg 8.21.0): Primary relational database
- **PLpgSQL**: Stored procedures for complex queries
- **Redis** (ioredis 5.4.1): Caching & queue backend

### Asynchronous Task Processing
- **BullMQ** (5.78.0): Job queue system
- **Redis**: Queue storage and processing
- **Worker Types** (in `apps/api/src/workers/`):
  - Auto-cancel jobs
  - PDF receipt generation
  - Rent calculations
  - Billing synchronization
  - Email notifications

### Email Service
- **Resend** (3.2.0): Transactional email provider

### Development Tools
- **TypeScript** (5.5.0): Type safety
- **TSX** (4.19.0): Run TypeScript directly
- **ESLint**: Code quality via custom plugin

### Build & Deployment
- **pnpm** (11.1.1): Package manager (MUST USE)
- **Turbo** (2.9.16): Monorepo build orchestrator
- **Node.js** (22.x): Runtime
- **Railway**: Hosting platform
- **Railpack**: Builder (auto-detects Node.js 22.x)

---

## 🚀 Getting Started Commands

### Setup
```bash
# Install dependencies (MUST use pnpm, not npm)
pnpm install

# Set up environment variables
cp .env.example .env.local
```

### Development
```bash
# Start all apps in watch mode
pnpm dev

# Start only the API server
cd apps/api && pnpm dev

# Watch and recompile TypeScript
cd apps/api && tsx watch src/server.ts
```

### Building
```bash
# Build all packages (via Turbo)
pnpm build

# Build only API
cd apps/api && pnpm build

# Start built API server
cd apps/api && pnpm start
# or
cd apps/api && node dist/server.js
```

### Quality Assurance
```bash
# Lint all packages
pnpm lint

# Run tests across monorepo
pnpm test
```

### Deployment
```bash
# Railway will run:
pnpm --filter @hostyllo/api build
# Then start with:
cd apps/api && node dist/server.js
```

---

## 🌐 API Endpoints Structure

Base URL: `/api/v1`

### Authentication Routes (`/api/v1/auth`)
- Setup & verify endpoints (including TOTP setup)
- JWT token management
- Session handling

### Resource Routes
- `/api/v1/students` - Student management
- `/api/v1/rooms` - Room management
- `/api/v1/payments` - Payment processing
- `/api/v1/expenses` - Expense tracking
- `/api/v1/dashboard` - Dashboard metrics

### Health Check
- `GET /api/v1/health` - Returns: `{ success: true, data: { db: 'ok', redis: 'ok', version: '1.0.0' } }`

---

## ⚠️ Critical Issues & Errors

### Issue #1: Deployment Build Failure (RESOLVED in PR #11)
**Status**: Open PR (awaiting merge)  
**Severity**: CRITICAL 🔴

**Error**:
```
TypeError [ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING]
```

**Root Cause**:
- Old config used Nixpacks builder → provisioned Node.js 18.20.5
- pnpm 11.1.1 requires Node.js 20.x+ (uses ES module dynamic imports)
- Node.js 18's CommonJS loader doesn't support these imports
- **Version mismatch**: Node.js 18.x ❌ + pnpm 11.x ❌

**Solution** (in `railway.toml`):
```toml
# ❌ BEFORE (Broken)
builder = "nixpacks"  # Auto-provisions Node.js 18.x

# ✅ AFTER (Fixed)
# (Removed nixpacks builder line)
# Railway now uses Railpack → auto-detects Node.js 22.x
```

**Action Required**:
- Merge PR #11 to fix deployment
- Verify Railway build succeeds

---

### Issue #2: Authentication Refactoring
**Status**: Open PR #16  
**Severity**: MEDIUM 🟡

**Focus Areas**:
- Refactor authentication middleware
- Add comprehensive test coverage
- Integrate Sentry for error tracking

**PR Link**: [#16 - Refactor authentication middleware, add tests, and integrate Sentry](https://github.com/mushtaqahmaduop/hostyllo/pull/16)

**Action Required**:
- Review middleware changes
- Verify test coverage improvements
- Validate Sentry integration

---

### Issue #3: Open PR #4 - Delete package.json
**Status**: Open (unclear intent)  
**Severity**: LOW 🟠

**PR Link**: [#4 - Delete package.json](https://github.com/mushtaqahmaduop/hostyllo/pull/4)

**Note**: Context unclear - may be workspace restructuring. Needs clarification.

---

## 🔗 Environment Variables Required

Create `.env.local` in root:

```bash
# Server
PORT=3001
NODE_ENV=production

# CORS
CORS_ORIGIN=https://hostyllo.vercel.app

# Security
COOKIE_SECRET=your-secret-key-here
JWT_SECRET=your-jwt-secret-here

# Database
DATABASE_URL=postgresql://user:password@host:port/hostyllo

# Redis
REDIS_URL=redis://host:port

# Email Service
RESEND_API_KEY=your-resend-key-here

# Sentry (for PR #16)
SENTRY_DSN=your-sentry-dsn-here

# 2FA/TOTP
TOTP_WINDOW=2
```

---

## 📊 Repository Stats

| Metric | Value |
|--------|-------|
| **Primary Language** | TypeScript (82.9%) |
| **Secondary Languages** | PLpgSQL (13.5%), JavaScript (1.5%), Raku (1.1%), Shell (1.0%) |
| **Repository Size** | ~211 KB |
| **Open Issues** | 3 |
| **Open PRs** | 3 |
| **Last Push** | 2026-06-10 (today) |
| **Created** | ~47 days ago |
| **Visibility** | Public |

---

## 🎯 Agent Workflow Recommendations

### Priority 1: Fix Deployment
1. Review PR #11 (Railway Deployment fix)
2. Verify `railway.toml` changes
3. Merge to fix Node.js/pnpm incompatibility
4. Monitor Railway build

### Priority 2: Authentication & Monitoring
1. Review PR #16 (Auth refactoring + Sentry)
2. Check middleware implementation
3. Validate test coverage
4. Approve/merge when ready

### Priority 3: Code Quality
1. Clarify intent of PR #4
2. Run full test suite
3. Ensure lint passes: `pnpm lint`
4. Validate monorepo integrity

### Priority 4: Documentation
1. Update/create README.md
2. Document API endpoints
3. Add deployment guide
4. Document database schema

---

## 🔐 Security Checklist for Agent

- ✅ JWT-based authentication configured
- ✅ 2FA/TOTP setup endpoints (PR #14)
- ✅ Password hashing with bcrypt
- ✅ Security headers (Helmet)
- ✅ CORS properly configured
- ✅ Rate limiting enabled
- ✅ Cookie secrets configured
- ⏳ Sentry error tracking (in PR #16)

---

## 📋 Common Tasks

### Add a New Route
1. Create route file in `apps/api/src/routes/`
2. Import in `apps/api/src/server.ts`
3. Register with: `app.register(myRoutes, { prefix: '/api/v1/path' })`

### Add a Background Job
1. Create worker in `apps/api/src/workers/`
2. Use BullMQ to define job queue
3. Register in `server.ts`

### Update Database Schema
1. Create migration in `packages/db/src/migrations/`
2. Update models in `packages/db/src/models/`
3. Run: `pnpm --filter @hostyllo/db migrate`

### Deploy Changes
1. Merge to `Develop` branch
2. Railway auto-deploys from `Develop`
3. Verify build: Check Railway deployment logs
4. Test live: https://hostyllo.vercel.app

---

## 🐛 Debugging Tips

### View Server Logs
```bash
cd apps/api && pnpm dev
# Logs appear in console with timestamp & level
```

### Check Database Connection
```bash
# API health check includes DB status
curl http://localhost:3001/api/v1/health
# Returns: { success: true, data: { db: 'ok', redis: 'ok', version: '1.0.0' } }
```

### Debug Job Queue
```bash
# BullMQ jobs are stored in Redis
# Use Redis CLI to inspect queue state
redis-cli
> KEYS *
> HGETALL hostyllo:*
```

### TypeScript Compilation Errors
```bash
cd apps/api
pnpm build  # Will show TS errors
# Fix and retry
```

---

## 📚 Useful Links

| Resource | URL |
|----------|-----|
| GitHub Repo | https://github.com/mushtaqahmaduop/hostyllo |
| Live App | https://hostyllo.vercel.app |
| API Directory | https://github.com/mushtaqahmaduop/hostyllo/tree/Develop/apps/api |
| Packages | https://github.com/mushtaqahmaduop/hostyllo/tree/Develop/packages |
| Issues | https://github.com/mushtaqahmaduop/hostyllo/issues |
| PRs | https://github.com/mushtaqahmaduop/hostyllo/pulls |
| PR #11 (Deployment) | https://github.com/mushtaqahmaduop/hostyllo/pull/11 |
| PR #16 (Auth) | https://github.com/mushtaqahmaduop/hostyllo/pull/16 |
| Turbo Docs | https://turbo.build |
| Fastify Docs | https://www.fastify.io |
| pnpm Docs | https://pnpm.io |
| Railway Docs | https://railway.app/docs |

---

## ✅ Pre-Session Checklist

Before starting work on this repository:

- [ ] Clone repository: `git clone https://github.com/mushtaqahmaduop/hostyllo.git`
- [ ] Install pnpm: `npm install -g pnpm@11.1.1`
- [ ] Install dependencies: `pnpm install`
- [ ] Set up `.env.local` with required variables
- [ ] Verify setup: `pnpm dev` (should start without errors)
- [ ] Run tests: `pnpm test`
- [ ] Check linting: `pnpm lint`
- [ ] Review open PRs (#4, #11, #16)
- [ ] Understand database schema (check `packages/db/`)

---

## 🚨 Critical Notes

1. **Package Manager**: Use **pnpm ONLY** - never npm or yarn
2. **Node Version**: Target Node.js **22.x** for deployment
3. **Default Branch**: Changes go to **Develop**, not main
4. **Build Output**: API builds to `apps/api/dist/server.js`
5. **Database**: PostgreSQL is REQUIRED (not optional)
6. **Environment**: Always use `.env.local` for local development
7. **Deployment**: Railway auto-deploys from Develop branch
8. **Monorepo**: Use `turbo` commands for cross-package operations

---

**Last Updated**: 2026-06-10  
**Repository Owner**: [@mushtaqahmaduop](https://github.com/mushtaqahmaduop)  
**Prepared for**: Agent Session Initialization
