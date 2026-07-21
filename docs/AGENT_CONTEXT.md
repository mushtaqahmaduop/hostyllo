# Hostyllo Repository - Agent Context Guide

## 📋 Repository Overview

**Repository**: [mushtaqahmaduop/hostyllo](https://github.com/mushtaqahmaduop/hostyllo)  
**Description**: Enterprise-level SaaS  
**Repository ID**: 1219754304  
**Status**: Active (Last push: ~4 hours ago)  
**Created**: ~47 days ago  
**Default Branch**: `Develop`  
**Live Demo**: https://hostyllo.vercel.app

---

## 📊 Language Composition

| Language | Percentage |
|----------|-----------|
| TypeScript | 82.9% |
| PLpgSQL | 13.5% |
| JavaScript | 1.5% |
| Raku | 1.1% |
| Shell | 1.0% |

---

## 🏗️ Repository Structure

```
hostyllo/
├── apps/
│   └── api/                    # Main Fastify backend server
│       ├── src/
│       │   └── server.ts       # Entry point
│       ├── dist/               # Compiled output
│       ├── package.json
│       ├── tsconfig.json
│       └── build scripts
│
├── packages/
│   ├── config/                 # Shared configuration & ESLint rules
│   │   └── package.json
│   └── db/                     # Database models & shared DB utilities
│       └── package.json
│
├── scripts/                    # Utility scripts
├── tasks/                      # Build/deployment tasks
├── .github/                    # GitHub workflows & CI/CD
├── .vscode/                    # VS Code settings
│
├── package.json                # Root monorepo config
├── pnpm-workspace.yaml         # pnpm workspaces definition
├── pnpm-lock.yaml              # Dependency lock file
├── turbo.json                  # Turbo build orchestration
├── railway.toml                # Railway deployment config
├── railpack.json               # Railpack builder config
│
└── docs/                       # Documentation

```

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Fastify 4.28.0 (high-performance Node.js framework)
- **Runtime**: Node.js 22.x (optimized for pnpm 11.1.1+)
- **Language**: TypeScript 5.5.0

### Database
- **Primary**: PostgreSQL with pg driver
- **Query Builder**: PLpgSQL (stored procedures)

### Security & Authentication
- **JWT**: jose 5.9.3
- **2FA/TOTP**: otplib 13.4.1, @otplib/preset-default 12.0.1
- **Password Hashing**: bcrypt 5.1.1
- **Security Headers**: @fastify/helmet 11.0.0
- **CORS**: @fastify/cors 9.0.0
- **Rate Limiting**: @fastify/rate-limit 9.0.0
- **Cookies**: @fastify/cookie 9.4.0
- **JWT Fastify Plugin**: @fastify/jwt 8.0.0

### Infrastructure & Queuing
- **Job Queue**: BullMQ 5.78.0
- **Cache/Queue Backend**: Redis (ioredis 5.4.1)
- **Email Service**: Resend 3.2.0

### Package Management
- **Package Manager**: pnpm 11.1.1
- **Build Orchestrator**: Turbo 2.9.16

### Deployment
- **Hosting**: Vercel (frontend)
- **Infrastructure**: Railway
- **Deployment Builder**: Railpack (auto-detects Node.js 22.x)

---

## ⚠️ Known Issues & Errors

### Issue #1: Deployment Build Failure (CRITICAL)
**PR**: [#11 - Railway Deployment fix: switch to Railpack builder](https://github.com/mushtaqahmaduop/hostyllo/pull/11)  
**Status**: Open (1 day ago)  
**Error**: `TypeError [ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING]`

**Root Cause**:
- Nixpacks was provisioning Node.js 18.20.5
- pnpm 11.1.1 uses ES module dynamic imports
- Node.js 18 CJS loader doesn't support these imports
- **Version incompatibility**: Node.js 18.x ❌ → pnpm 11.x

**Solution Applied**:
- Removed `builder = "nixpacks"` from `railway.toml`
- Switched to Railpack builder (auto-detects Node.js 22.x ✅)
- Removed redundant `pnpm install` from buildCommand
- **Fixed deployment**: Node.js 22.x ✅ → pnpm 11.1.1 ✅

**File Modified**: `railway.toml`  
**Failed Commit**: e83e0f9  
**Deployment Link**: [Railway Deployment #45f8ba](https://railway.com/project/1612445c-000a-4357-8ea4-2007a0666a48/environment/6deddcdf-0b16-4c52-82c3-32fe65344e46/deployment/45f8ba22-30aa-406d-95f6-4f3d211e48dc)

---

### Issue #2: Authentication Refactoring
**PR**: [#16 - Refactor authentication middleware, add tests, and integrate Sentry](https://github.com/mushtaqahmaduop/hostyllo/pull/16)  
**Status**: Open (4 hours ago)  
**Focus Areas**:
- Authentication middleware refactor
- Test coverage improvements
- Sentry integration for error tracking

---

### Issue #3: Package Deletion
**PR**: [#4 - Delete package.json](https://github.com/mushtaqahmaduop/hostyllo/pull/4)  
**Status**: Open (3 days ago)  
**Note**: This appears to be a workspace-level package.json deletion or restructuring

---

## 🔗 Quick Links for Agent

| Resource | URL |
|----------|-----|
| **Main Repository** | https://github.com/mushtaqahmaduop/hostyllo |
| **Live Application** | https://hostyllo.vercel.app |
| **API App Directory** | https://github.com/mushtaqahmaduop/hostyllo/tree/Develop/apps/api |
| **Packages Directory** | https://github.com/mushtaqahmaduop/hostyllo/tree/Develop/packages |
| **Config Package** | https://github.com/mushtaqahmaduop/hostyllo/tree/Develop/packages/config |
| **DB Package** | https://github.com/mushtaqahmaduop/hostyllo/tree/Develop/packages/db |
| **GitHub Issues** | https://github.com/mushtaqahmaduop/hostyllo/issues |
| **Open Pull Requests** | https://github.com/mushtaqahmaduop/hostyllo/pulls |
| **PR #11 (Deployment Fix)** | https://github.com/mushtaqahmaduop/hostyllo/pull/11 |
| **PR #16 (Auth Refactor)** | https://github.com/mushtaqahmaduop/hostyllo/pull/16 |
| **PR #4 (Package Deletion)** | https://github.com/mushtaqahmaduop/hostyllo/pull/4 |

---

## 📋 Available Commands

```bash
# Development
pnpm dev              # Start all apps in development mode

# Build
pnpm build            # Build all apps (outputs to dist/ and .next/)

# Testing
pnpm test             # Run tests across all packages

# Linting
pnpm lint             # Run ESLint on all apps

# Individual app commands
cd apps/api
pnpm dev              # Start API server with hot reload
pnpm build            # Build API (TypeScript compilation)
pnpm start            # Run compiled API server
pnpm lint             # Lint API source
```

---

## 🚀 Deployment Pipeline

### Current Setup
- **Deployment Platform**: Railway
- **Builder**: Railpack (Default)
- **Node.js Version**: 22.x (auto-detected)
- **Package Manager**: pnpm 11.1.1
- **Hosting Frontend**: Vercel

### Deployment Configuration Files
- `railway.toml` - Railway deployment config
- `railpack.json` - Railpack builder config

---

## 📦 Key Dependencies & Their Roles

| Package | Version | Purpose |
|---------|---------|---------|
| `fastify` | 4.28.0 | HTTP server framework |
| `@fastify/jwt` | 8.0.0 | JWT authentication |
| `bcrypt` | 5.1.1 | Password hashing |
| `pg` | 8.21.0 | PostgreSQL driver |
| `ioredis` | 5.4.1 | Redis client |
| `bullmq` | 5.78.0 | Job queue system |
| `resend` | 3.2.0 | Email service |
| `otplib` | 13.4.1 | 2FA/TOTP generation |
| `jose` | 5.9.3 | JWT utilities |
| `typescript` | 5.5.0 | Type safety |
| `turbo` | 2.9.16 | Build orchestration |
| `tsx` | 4.19.0 | TypeScript execution |

---

## 🔐 Security Features Implemented

✅ JWT-based authentication  
✅ 2FA/TOTP support  
✅ Password hashing with bcrypt  
✅ Security headers (Helmet)  
✅ CORS policy enforcement  
✅ Rate limiting  
✅ Cookie management  
✅ In-progress: Sentry error tracking  

---

## 💡 Development Notes for Agent

1. **Monorepo Structure**: Use `turbo` for running commands across all packages
2. **Package Manager**: Must use `pnpm` (11.1.1+) - NOT npm or yarn
3. **Node Version**: Target Node.js 22.x for compatibility
4. **Database**: PostgreSQL with custom stored procedures (PLpgSQL)
5. **Queuing**: BullMQ backed by Redis for async tasks
6. **Email**: Resend integration for transactional emails
7. **Deployment**: Railway with Railpack builder (no Nixpacks)
8. **Error Tracking**: Sentry integration in progress (PR #16)

---

## 🎯 Active Tasks

- [ ] Merge PR #11 (fix Node.js/pnpm version incompatibility)
- [ ] Review PR #16 (auth refactor + Sentry integration)
- [ ] Review PR #4 (package.json deletion/restructuring)
- [ ] Resolve 3 open issues in backlog

---

**Last Updated**: 2026-06-10  
**Repository Owner**: [@mushtaqahmaduop](https://github.com/mushtaqahmaduop)
