# CLAUDE.MD ADDENDUM — Production Readiness Rules
## Append to 06_CLAUDE_MD_v15.md after the "24 CRITICAL NEVER-VIOLATE RULES" section
## v1.0 · June 2026

---

## PRODUCTION READINESS — 6 ADDITIONAL HARD RULES

These complement the 24 critical rules. Same enforcement level.

```
25. ERROR RESPONSES: Always use AppError class + code from 13_PRODUCTION_READINESS.md catalog.
    Never leak DB error messages, stack traces, or SQL to the client.

26. EVERY worker file: worker.on('failed') calling moveToDLQ() — no exceptions.
    A worker without DLQ handling is a silent data loss bug.

27. LOADING STATES: Never use spinners in the UI. Skeleton shimmer only.
    Every screen that fetches data needs a skeleton component before the data component ships.

28. EMPTY STATES: Every list screen must handle 0 results.
    An unhandled empty state is a broken screen for every new client.

29. CROSS-TENANT TEST: After every new endpoint — not before, AFTER — run the isolation helper.
    Pattern: Hostel A JWT → Hostel B resource ID → must return 404.
    404 not 403. 403 leaks that the record exists.

30. PRE-DEPLOY: Run ./scripts/pre-deploy-check.sh before every prod push.
    If any step fails, do not deploy. Fix first.
```

---

## ERROR HANDLING QUICK REFERENCE

```typescript
// Throwing errors — always use AppError
import { AppError } from '../lib/errors';

throw new AppError('STU_CNIC_DUPLICATE', 409, 'CNIC already registered');
throw new AppError('NOT_FOUND', 404, 'Student not found');
throw new AppError('VALIDATION_ERROR', 400, 'Phone invalid', 'phone'); // field = 4th arg

// NEVER:
throw new Error(pgError.message);          // leaks DB internals
return reply.status(500).send(err.stack);  // leaks stack trace
console.log('cnic:', student.cnic);        // PII in logs
```

**Complete error code catalog:** See `docs/13_PRODUCTION_READINESS.md` Section 2.2.

---

## TESTING QUICK REFERENCE

```bash
# Before ANY payment route work:
pnpm vitest packages/db/src/__tests__/paymentService.test.ts
# All 14 must pass. Zero exceptions.

# After EVERY new endpoint:
# 1. Run isolation test (Hostel A JWT → Hostel B resource → 404)
# 2. Run the full unit test suite
pnpm vitest --run

# Before every deploy:
./scripts/pre-deploy-check.sh

# E2E (run before Phase 2 release):
pnpm playwright test apps/web/e2e/critical-flows.spec.ts
```

---

## CI PIPELINE QUICK REFERENCE

```
PR merge requires ALL green:
  lint-and-typecheck → unit-tests (payment tests first) → secrets-scan

Deploy to prod requires ALL green (main branch only):
  ↑ above + infra-gates (PITR + RLS + ESLint zero + npm audit)
  → deploy (Railway API + Vercel frontend + Vercel admin)
  → post-deploy health check (auto, 30s after deploy)
```

**Full pipeline spec:** See `docs/13_PRODUCTION_READINESS.md` Section 3.

---

## PERFORMANCE QUICK REFERENCE

| What | Target | How |
|------|--------|-----|
| Dashboard query | < 200ms | Single CTE — never 5 queries |
| Student search | < 200ms | GIN index on pg_trgm |
| Any list endpoint | < 100ms (cached) | Redis cache, invalidate on write |
| Login | < 500ms | bcrypt cost-12 is intentionally slow |
| Health check | < 50ms | No DB, no Redis |

**Cache pattern:** `cachedQuery(hostelId, 'resource', TTL, queryFn)` — see `13_PRODUCTION_READINESS.md` Section 4.2.
**Redis key format:** `cache:{hostelId}:{resource}` — hostelId prefix is MANDATORY.

---

*Append this addendum to 06_CLAUDE_MD_v15.md before first Claude Code session.*
*Source doc: 13_PRODUCTION_READINESS.md*
