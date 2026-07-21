# 13_PRODUCTION_READINESS.md
## HOSTYLLO — Production Readiness Specification
### v1.0 · June 2026 · Traceable to PRD v15.0

> **Authority:** This document expands on 06_CLAUDE_MD_v15.md (24 rules), 03_SECURITY_ARCHITECTURE.md, and 10_OBSERVABILITY_ARCHITECTURE.md into actionable implementation specs. When in conflict, the Master PRD wins.
>
> **Scope:** Auth hardening, error handling, CI/CD, performance, testing, and production polish — the six things that separate a demo from a product.

---

## 1. AUTHENTICATION HARDENING

### 1.1 Middleware Stack (Mandatory — Every Protected Route)

Every route except `/auth/login`, `/auth/refresh`, `/health` runs this exact middleware stack in order. No shortcuts.

```typescript
// apps/api/src/middleware/stack.ts
// Order is fixed. Do not reorder.

1. rateLimitMiddleware     // Redis-backed, IP-scoped
2. csrfMiddleware          // Double-submit cookie pattern
3. jwtVerifyMiddleware     // RS256, jti blocklist, algorithm pin
4. roleFromDbMiddleware    // Role from DB — NEVER from JWT payload
5. tenantMiddleware        // Sets req.hostelId from JWT (validated)
6. planCheckMiddleware     // Gates gated routes by subscription plan
```

### 1.2 JWT Middleware — Exact Implementation

```typescript
// apps/api/src/middleware/jwtVerify.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import * as jose from 'jose';
import { redis } from '../lib/redis';
import { db } from '../lib/db';

const publicKey = await jose.importSPKI(process.env.JWT_PUBLIC_KEY!, 'RS256');

export async function jwtVerifyMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Missing token' });
  }

  const token = authHeader.slice(7);

  let payload: jose.JWTPayload & { jti: string; hostelId: string; sub: string };
  try {
    const { payload: p } = await jose.jwtVerify(token, publicKey, {
      algorithms: ['RS256'], // PINNED — algorithm confusion attack prevention
    });
    payload = p as typeof payload;
  } catch {
    return reply.status(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Invalid token' });
  }

  // JTI blocklist check (logout / rotation invalidation)
  const blocked = await redis.get(`session:jti:${payload.jti}`);
  if (blocked) {
    return reply.status(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Token revoked' });
  }

  // Role from DB — NEVER trust JWT role claim
  const { rows } = await db.query(
    'SELECT role, can_edit, can_delete, is_active FROM users WHERE user_id = $1 AND hostel_id = $2',
    [payload.sub, payload.hostelId]
  );
  if (!rows[0] || !rows[0].is_active) {
    return reply.status(401).send({ success: false, code: 'UNAUTHORIZED', message: 'User inactive' });
  }

  req.userId = payload.sub;
  req.hostelId = payload.hostelId;  // Tenant context — immutable from here
  req.role = rows[0].role;
  req.canEdit = rows[0].can_edit;
  req.canDelete = rows[0].can_delete;
  req.jti = payload.jti;
}
```

### 1.3 CSRF Protection

```typescript
// apps/api/src/middleware/csrf.ts
// Double-submit cookie pattern (works with httpOnly refresh token architecture)

export async function csrfMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return;

  const headerToken = req.headers['x-csrf-token'] as string;
  const cookieToken = req.cookies['csrf_token'];

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return reply.status(403).send({
      success: false,
      code: 'FORBIDDEN',
      message: 'CSRF validation failed',
    });
  }
}

// Frontend: on login, server sets csrf_token cookie (NOT httpOnly)
// Frontend reads it with document.cookie and sends as X-CSRF-Token header on every mutating request
// Cookie: SameSite=Strict prevents cross-origin reads anyway — this adds defense-in-depth
```

### 1.4 Input Sanitization — Fastify Schema Enforcement

Every route handler MUST declare a JSON schema. No raw `req.body` access without schema.

```typescript
// Pattern for all POST/PATCH routes
const studentCreateSchema = {
  body: {
    type: 'object',
    required: ['fullName', 'cnic', 'phone', 'roomId', 'bedId', 'rentPkr', 'joinDate'],
    additionalProperties: false,  // CRITICAL — rejects any undeclared field
    properties: {
      fullName:    { type: 'string', minLength: 2, maxLength: 100 },
      cnic:        { type: 'string', pattern: '^[0-9]{5}-[0-9]{7}-[0-9]$' },
      phone:       { type: 'string', pattern: '^03[0-9]{9}$' },
      roomId:      { type: 'string', format: 'uuid' },
      bedId:       { type: 'string', format: 'uuid' },
      rentPkr:     { type: 'number', minimum: 0, maximum: 9999999 },
      joinDate:    { type: 'string', format: 'date' },
      // hostelId is NEVER in schema — it comes from JWT only
    },
  },
} as const;

fastify.post('/api/v1/students', { schema: studentCreateSchema }, handler);
```

**CSV Import — Formula Injection Strip (mandatory):**
```typescript
// apps/api/src/lib/csvSanitize.ts
export function sanitizeCsvCell(value: string): string {
  // Strip formula injection: = + - @ in first position
  return value.replace(/^[=+\-@]/, '');
}
// Apply to EVERY cell value before any processing
```

### 1.5 Role-Based Access Control

```typescript
// apps/api/src/middleware/rbac.ts
type Role = 'super_admin' | 'hostel_owner' | 'warden' | 'viewer';

const roleHierarchy: Record<Role, number> = {
  super_admin: 4,
  hostel_owner: 3,
  warden: 2,
  viewer: 1,
};

export function requireRole(minimumRole: Role) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (roleHierarchy[req.role] < roleHierarchy[minimumRole]) {
      return reply.status(403).send({
        success: false,
        code: 'FORBIDDEN',
        message: `Requires ${minimumRole} role or above`,
      });
    }
  };
}

// Usage:
fastify.delete('/api/v1/students/:id', {
  preHandler: [requireRole('warden'), requireCanDelete],
}, handler);

// canDelete check (separate from role)
async function requireCanDelete(req: FastifyRequest, reply: FastifyReply) {
  if (req.role === 'warden' && !req.canDelete) {
    return reply.status(403).send({ success: false, code: 'FORBIDDEN', message: 'No delete permission' });
  }
}
```

---

## 2. ERROR HANDLING — COMPLETE CATALOG

### 2.1 Error Response Envelope

All errors follow this exact shape. No exceptions.

```typescript
interface ErrorResponse {
  success: false;
  data: null;
  code: string;          // Machine-readable — use for client logic
  message: string;       // Human-readable — show to user
  field?: string;        // Which field failed (validation errors only)
  retryAfter?: number;   // Seconds (429 errors only — MANDATORY)
}
```

### 2.2 Complete Error Code Catalog

**Global Codes (all endpoints):**

| Code | HTTP | When |\
|------|------|------|\
| `UNAUTHORIZED` | 401 | Missing/invalid/expired JWT |\
| `FORBIDDEN` | 403 | Role insufficient or permission denied |\
| `NOT_FOUND` | 404 | Record doesn't exist in this tenant |\
| `VALIDATION_ERROR` | 400 | Request body schema failure |\
| `RATE_LIMITED` | 429 | Too many requests — always include `retryAfter` |\
| `SUBSCRIPTION_SUSPENDED` | 402 | Tenant is suspended — writes blocked |\
| `INTERNAL_ERROR` | 500 | Unhandled exception — logged to Sentry |\
| `CONFLICT` | 409 | Generic duplicate/constraint conflict |\

**Auth Module:**

| Code | HTTP | When |\
|------|------|------|\
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email or password (identical message for both — no enumeration) |\
| `AUTH_ACCOUNT_SUSPENDED` | 403 | Tenant suspended, owner must contact support |\
| `AUTH_INVALID_MFA_TOKEN` | 401 | mfaToken expired or already used |\
| `AUTH_INVALID_TOTP_CODE` | 401 | Wrong 6-digit TOTP |\
| `AUTH_REFRESH_INVALID` | 401 | Refresh cookie missing, expired, or revoked |\
| `AUTH_RESET_INVALID_OTP` | 401 | Wrong/expired password reset OTP |\
| `AUTH_RESET_MAX_ATTEMPTS` | 429 | > 5 attempts on same OTP token |\

**Students Module:**

| Code | HTTP | When |\
|------|------|------|\
| `STU_CNIC_DUPLICATE` | 409 | CNIC already registered in this hostel |\
| `STU_BED_OCCUPIED` | 409 | Target bed has an active student |\
| `STU_PHOTO_INVALID` | 400 | MIME or magic bytes check failed |\
| `STU_PHOTO_TOO_LARGE` | 400 | Photo > 2MB |\
| `STU_PENDING_PAYMENTS` | 409 | Student has unpaid — soft-warn before delete |\
| `TRIAL_STUDENT_LIMIT` | 402 | Trial plan 30-student cap reached |\
| `IMPORT_INVALID_FILE` | 400 | Not a valid CSV |\
| `IMPORT_TOO_LARGE` | 400 | CSV > 2MB |\

**Rooms Module:**

| Code | HTTP | When |\
|------|------|------|\
| `RM_NUMBER_DUPLICATE` | 409 | Room number already exists in hostel |\
| `TRIAL_ROOM_LIMIT` | 402 | Trial plan 10-room cap reached |\
| `RM_HAS_ACTIVE_STUDENTS` | 409 | Cannot delete — room has active students |\
| `RM_BED_OCCUPIED` | 409 | Target bed already occupied (room shift) |\
| `RM_ROOM_MAINTENANCE` | 409 | Target room in maintenance mode |\

**Payments Module:**

| Code | HTTP | When |\
|------|------|------|\
| `PAY_DUPLICATE_MONTH` | 409 | Non-void payment exists for student+month |\
| `PAY_STUDENT_VACATED` | 409 | Cannot add payment for vacated student |\
| `PAY_VOID_ONLY` | 403 | Warden can request void only — not edit |\
| `PAY_ALREADY_VOID` | 409 | Payment already voided |\
| `PAY_IDEM_CONFLICT` | 409 | Duplicate idempotency key (same payment submitted twice) |\

**Users Module:**

| Code | HTTP | When |\
|------|------|------|\
| `USER_EMAIL_TAKEN` | 409 | Email already in use (globally) |\
| `USER_ROLE_FORBIDDEN` | 403 | Cannot create super_admin or additional hostel_owner |\
| `USER_SELF_DELETE` | 409 | Cannot delete your own account |\
| `USER_LAST_OWNER` | 409 | Cannot delete the last hostel_owner |\

**Billing Module (Phase 4):**

| Code | HTTP | When |\
|------|------|------|\
| `BIL_001` | 402 | Account suspended — data is read-only |\
| `BIL_WEBHOOK_INVALID_SIG` | 400 | Paymob HMAC signature verification failed |\
| `BIL_WEBHOOK_REPLAY` | 409 | Duplicate paymob_order_id (replay attack) |\

### 2.3 Global Error Handler

```typescript
// apps/api/src/lib/errorHandler.ts
import * as Sentry from '@sentry/node';
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export function globalErrorHandler(
  error: FastifyError,
  req: FastifyRequest,
  reply: FastifyReply
) {
  // Fastify schema validation errors
  if (error.validation) {
    const firstError = error.validation[0];
    return reply.status(400).send({
      success: false,
      data: null,
      code: 'VALIDATION_ERROR',
      message: firstError.message ?? 'Invalid input',
      field: firstError.instancePath?.replace('/', '') ?? undefined,
    });
  }

  // Known application errors (thrown with statusCode)
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      success: false,
      data: null,
      code: (error as any).code ?? 'CLIENT_ERROR',
      message: error.message,
    });
  }

  // Unknown 5xx — log to Sentry, return generic message (never leak internals)
  Sentry.captureException(error, {
    extra: {
      correlationId: req.correlationId,
      hostelId: req.hostelId,
      userId: req.userId,
      url: req.url,
      method: req.method,
    },
  });

  req.log.error({ err: error, correlationId: req.correlationId }, 'Unhandled error');

  return reply.status(500).send({
    success: false,
    data: null,
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong. Our team has been notified.',
    // NEVER include: stack trace, SQL query, error.message for DB errors
  });
}
```

### 2.4 Throwing Domain Errors

```typescript
// apps/api/src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Usage in route handlers:
throw new AppError('STU_CNIC_DUPLICATE', 409, 'A student with this CNIC already exists');
throw new AppError('VALIDATION_ERROR', 400, 'Phone number is invalid', 'phone');
throw new AppError('NOT_FOUND', 404, 'Student not found');

// Never throw raw Errors with DB internals:
// WRONG: throw new Error(pgError.message)
// RIGHT: log pgError internally, throw AppError to client
```

### 2.5 BullMQ Error Handling & Retry Logic

```typescript
// Pattern for EVERY worker — no exceptions
const worker = new Worker(queueName, processor, {
  connection: redis,
  concurrency: CONCURRENCY,
  attempts: MAX_ATTEMPTS,      // Queue-specific — see CLAUDE.md table
  backoff: {
    type: 'exponential',
    delay: INITIAL_DELAY_MS,
  },
});

// DLQ pattern — MANDATORY on every worker file
worker.on('failed', async (job, err) => {
  req.log?.error({ jobId: job?.id, err, queue: queueName }, 'Job failed');

  if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
    // Max attempts exhausted — move to DLQ table
    await moveToDLQ(job, err);
  }
});

// moveToDLQ writes to dlq_jobs table (INSERT only, never update)
export async function moveToDLQ(job: Job, err: Error) {
  await db.query(
    `INSERT INTO dlq_jobs (job_id, queue_name, job_data, error_message, failed_at, hostel_id)
     VALUES ($1, $2, $3, $4, NOW(), $5)`,
    [job.id, job.queueName, JSON.stringify(job.data), err.message, job.data.hostelId]
  );
}
```

### 2.6 Graceful Shutdown

```typescript
// apps/api/src/server.ts
const shutdown = async (signal: string) => {
  req.log.info({ signal }, 'Shutdown signal received');

  // 1. Stop accepting new connections
  await fastify.close();

  // 2. Drain BullMQ workers (let active jobs finish)
  await Promise.all(workers.map(w => w.close()));

  // 3. Release DB connection pool
  await pool.end();

  // 4. Flush Sentry buffer
  await Sentry.close(2000);

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

## 3. CI/CD PIPELINE — IMPLEMENTATION SPEC

### 3.1 GitHub Actions Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint           # ESLint including hostyllo/* rules
      - run: pnpm run typecheck      # tsc --noEmit across all workspaces

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      # Payment tests FIRST — these are the highest-value tests
      - run: pnpm vitest packages/db/src/__tests__/paymentService.test.ts --reporter=verbose
        name: Payment formula tests (14 — all must pass)
      # All other unit tests
      - run: pnpm vitest --project packages/db --project packages/config
        name: All unit tests

  secrets-scan:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }  # Full history for git log scan
      - name: Scan for secrets in git history
        run: |
          RESULT=$(git log -p | grep -iE "key|secret|password|token" | grep -v "//.*key\|test.*key\|fake.*key\|example" || true)
          if [ -n "$RESULT" ]; then
            echo "SECRETS FOUND IN GIT HISTORY"
            echo "$RESULT"
            exit 1
          fi
          echo "No secrets found"
      - name: Scan for hardcoded secrets in code
        run: |
          # Fail if any .env files are tracked (not .env.example)
          git ls-files | grep -E "^\.env$|^apps/.*\.env$|^packages/.*\.env$" && exit 1 || true

  infra-gates:
    runs-on: ubuntu-latest
    needs: [unit-tests, secrets-scan]
    if: github.ref == 'refs/heads/main'   # Main branch only
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: PITR verification
        run: ./scripts/verify-pitr.sh
        env:
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}

      - name: RLS verification (zero tables without RLS)
        run: |
          RESULT=$(psql $DATABASE_URL -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;")
          if [ -n "$(echo $RESULT | tr -d '[:space:]')" ]; then
            echo "TABLES WITHOUT RLS: $RESULT"
            exit 1
          fi
          echo "All tables have RLS enabled"
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: ESLint violations must be zero
        run: pnpm run lint -- --max-warnings 0

      - name: npm audit (no critical CVEs)
        run: pnpm audit --audit-level critical

  deploy:
    runs-on: ubuntu-latest
    needs: infra-gates
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy API to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: hostyllo-api

      - name: Deploy frontend to Vercel
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}

      - name: Deploy admin to Vercel
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }} --cwd apps/admin

      - name: Post-deploy health check
        run: |
          sleep 30
          RESPONSE=$(curl -sf https://api.hostyllo.app/api/v1/health)
          echo $RESPONSE | jq -e '.db == "ok" and .redis == "ok"'
          echo "Deploy verified"
```

### 3.2 Branch Protection Rules (GitHub Settings)

```
Branch: main
- Require pull request before merging: ON
- Required approvals: 0 (solo founder — skip review, not status checks)
- Require status checks to pass: ON
  - lint-and-typecheck
  - unit-tests
  - secrets-scan
- Require branches to be up to date: ON
- Restrict direct push: ON (even for admins)
- Do not allow bypassing: ON
```

### 3.3 Environment Parity

Never deploy code that hasn't been tested against a database with the same schema as production.

```
Local dev:   Docker Compose — Postgres + Redis + Fastify
Staging:     Railway (staging environment) — same migrations as prod
Production:  Railway (prod environment)

Rule: Any migration must run successfully on staging BEFORE deploying to prod.
Migration rollback plan must exist BEFORE applying any migration.
```

### 3.4 Rollback Procedure

```bash
# API (Railway) — one-click or CLI
railway rollback --service hostyllo-api

# Frontend (Vercel) — one-click from dashboard or:
vercel rollback --token $VERCEL_TOKEN

# Database migration rollback — requires pre-written DOWN migration
# Every migration file MUST include a DOWN section before it ships
psql $DATABASE_URL < migrations/003_rollback.sql

# If rollback required in < 5 minutes: Railway dashboard → Deployments → Previous → Redeploy
# If rollback required after > 30 minutes: assess whether a forward-fix is safer than rollback
```

---

## 4. PERFORMANCE OPTIMIZATION

### 4.1 Database Query Rules

```sql
-- RULE: Dashboard = ONE query (CTE), not 5 separate SELECTs
-- See CLAUDE.md Quick Reference Appendix for the exact query
-- Target: < 200ms including network roundtrip

-- RULE: Student search uses pg_trgm (GIN index) — not LIKE
-- Index already in schema.sql:
-- CREATE INDEX idx_students_search ON students USING GIN (full_name gin_trgm_ops);

-- RULE: Never SELECT * — always name columns
-- WRONG: SELECT * FROM students WHERE hostel_id = ...
-- RIGHT: SELECT student_id, full_name, status, room_id, unpaid_pkr FROM students WHERE ...

-- RULE: Payments list filter on month always hits the index
-- Index: CREATE INDEX idx_payments_month ON payments (hostel_id, month);
-- Query: WHERE hostel_id = current_setting(...)::uuid AND month = $1

-- RULE: All list queries must have LIMIT — max 100 rows enforced in schema
-- Never: SELECT ... FROM students WHERE hostel_id = ...  (unbounded)
-- Always: SELECT ... FROM students WHERE hostel_id = ... LIMIT $1 OFFSET $2
```

### 4.2 Redis Caching Strategy

```typescript
// apps/api/src/lib/cache.ts

// TTL constants — do not change without updating CLAUDE.md
const TTL = {
  DASHBOARD: 60,      // 1 minute — stale is acceptable, freshness not critical
  STUDENTS_LIST: 300, // 5 minutes — search bypasses cache
  ROOMS: 300,         // 5 minutes
  FEATURE_FLAGS: 60,  // 1 minute
};

// Cache key pattern — hostelId prefix is MANDATORY
const key = (hostelId: string, resource: string, suffix = '') =>
  `cache:${hostelId}:${resource}${suffix ? ':' + suffix : ''}`;

// Cache-aside pattern (read-through)
export async function cachedQuery<T>(
  hostelId: string,
  resource: string,
  ttl: number,
  queryFn: () => Promise<T>
): Promise<T> {
  const cacheKey = key(hostelId, resource);
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as T;

  const result = await queryFn();
  await redis.setex(cacheKey, ttl, JSON.stringify(result));
  return result;
}

// Cache invalidation — call after any write to that resource
export async function invalidateCache(hostelId: string, resource: string) {
  await redis.del(key(hostelId, resource));
}

// Usage:
// GET /dashboard/stats → cachedQuery(hostelId, 'dashboard', TTL.DASHBOARD, dashboardQuery)
// POST /students → invalidateCache(hostelId, 'students_list') after insert
// PATCH /rooms/:id → invalidateCache(hostelId, 'rooms') after update
```

### 4.3 API Response Targets

| Endpoint | P95 Target | Method |
|----------|-----------|--------|
| `GET /health` | < 50ms | No DB, no Redis |
| `GET /dashboard/stats` | < 200ms | Single CTE query + Redis cache |
| `GET /students?q=` | < 200ms | GIN index pg_trgm |
| `GET /students` (no search) | < 100ms | Redis cache |
| `POST /payments` | < 300ms | DB write + cache invalidate |
| `GET /payments/defaulters` | < 200ms | Indexed query |
| `POST /auth/login` | < 500ms | bcrypt cost-12 is slow by design |

### 4.4 Frontend Performance

```typescript
// Next.js 14 App Router — performance rules

// 1. Lazy load heavy components
const StudentImportModal = dynamic(() => import('./StudentImportModal'), {
  loading: () => <Skeleton className="h-96" />,
});

// 2. Suspense boundaries on every page
<Suspense fallback={<DashboardSkeleton />}>
  <DashboardStats hostelId={hostelId} />
</Suspense>

// 3. Skeleton shimmer — NEVER spinners (per design system rule)
// See packages/ui/src/components/Skeleton.tsx

// 4. Images
// Student photos: Next.js Image with width=200 height=200 (always this size — already resized at upload)
// Receipt PDFs: generated server-side, streamed — not embedded in page

// 5. Bundle targets
// Main bundle: < 200KB gzipped (Lighthouse budget)
// Per-page chunks: < 50KB each
// Check with: pnpm run build && pnpm run analyze
```

### 4.5 Pakistani Network Conditions

Phase 1–4 target: mobile 4G (typical Peshawar connection ~5Mbps, 150ms latency).

```typescript
// Connectivity detection
// apps/web/src/hooks/useConnectivity.ts
export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Connection quality check
    const conn = (navigator as any).connection;
    if (conn) {
      setIsSlowConnection(conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
      conn.addEventListener('change', () => {
        setIsSlowConnection(conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
      });
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSlowConnection };
}

// Display connectivity badge in header:
// 🟢 Connected | 🟡 Slow connection | 🔴 Offline (Phase 1–4: show, but data may not sync)
// Phase 5: offline mode — SQLite sync kicks in when offline
```

---

## 5. TESTING STRATEGY

### 5.1 Test Pyramid — What to Write

```
E2E (Playwright)         ~10 critical flows
  ↑
Integration (Vitest)     ~30 route tests (auth, isolation, payments)
  ↑
Unit (Vitest)            ~50 tests (business logic — paymentService, formatters, sanitizers)
```

Rationale for this shape: Unit tests are fast and catch regressions. Integration tests catch middleware/DB interaction bugs. E2E tests catch user-flow breaks. Keep E2E small — they're slow and brittle.

### 5.2 Required Unit Tests

**Payment service (14 — must all pass before any payment route ships):**

```typescript
// packages/db/src/__tests__/paymentService.test.ts
import { describe, it, expect } from 'vitest';
import { calculateUnpaid } from '../paymentService';

describe('calculateUnpaid', () => {
  it('fully paid — no extras, no concession', () => {
    expect(calculateUnpaid(8000, 0, [], 0, 8000)).toEqual({
      totalDue: 8000, unpaid: 0, status: 'paid',
    });
  });
  it('partial payment', () => {
    expect(calculateUnpaid(8000, 0, [], 0, 3000)).toEqual({
      totalDue: 8000, unpaid: 5000, status: 'partial',
    });
  });
  it('zero payment', () => {
    expect(calculateUnpaid(8000, 0, [], 0, 0)).toEqual({
      totalDue: 8000, unpaid: 8000, status: 'pending',
    });
  });
  it('with admission fee', () => {
    expect(calculateUnpaid(8000, 2000, [], 0, 10000)).toEqual({
      totalDue: 10000, unpaid: 0, status: 'paid',
    });
  });
  it('with extra charges array', () => {
    expect(calculateUnpaid(8000, 0, [500, 300], 0, 8800)).toEqual({
      totalDue: 8800, unpaid: 0, status: 'paid',
    });
  });
  it('with concession', () => {
    expect(calculateUnpaid(8000, 0, [], 1000, 7000)).toEqual({
      totalDue: 7000, unpaid: 0, status: 'paid',
    });
  });
  it('concession exceeds rent — unpaid cannot be negative', () => {
    expect(calculateUnpaid(5000, 0, [], 6000, 0).unpaid).toBeGreaterThanOrEqual(0);
  });
  it('overpayment — status is paid, unpaid is 0', () => {
    const result = calculateUnpaid(8000, 0, [], 0, 10000);
    expect(result.status).toBe('paid');
    expect(result.unpaid).toBe(0);
  });
  it('empty extras array', () => {
    expect(calculateUnpaid(8000, 0, [], 0, 0).totalDue).toBe(8000);
  });
  it('all components combined', () => {
    expect(calculateUnpaid(8000, 2000, [500, 200], 1000, 5000)).toEqual({
      totalDue: 9700, unpaid: 4700, status: 'partial',
    });
  });
  it('partial payment edge — 1 PKR short', () => {
    const r = calculateUnpaid(8000, 0, [], 0, 7999);
    expect(r.status).toBe('partial');
    expect(r.unpaid).toBe(1);
  });
  it('zero rent, zero everything', () => {
    expect(calculateUnpaid(0, 0, [], 0, 0)).toEqual({
      totalDue: 0, unpaid: 0, status: 'paid',
    });
  });
  it('large amount precision', () => {
    expect(calculateUnpaid(99999, 5000, [999], 0, 100000).unpaid).toBe(4998);
  });
  it('multiple extra charges sum correctly', () => {
    const r = calculateUnpaid(8000, 0, [100, 200, 300, 400], 0, 0);
    expect(r.totalDue).toBe(9000);
  });
});
```

**Additional required unit tests:**
```
packages/db/src/__tests__/formatters.test.ts
  - fmtCnic('3520212345679') → '35202-1234567-9'
  - fmtCnic('') → ''
  - fmtPhone('03123456789') → '0312-3456789'
  - fmtPhone(undefined) → ''

packages/api/src/__tests__/csvSanitize.test.ts
  - '=SUM(A1)' → 'SUM(A1)'
  - '+5' → '5'
  - '-5' → '5'
  - '@IMPORTRANGE' → 'IMPORTRANGE'
  - 'Ahmed' → 'Ahmed' (unchanged)
  - '' → ''

packages/api/src/__tests__/idempotency.test.ts
  - Same idempotency key returns cached response (Redis check)
  - Different key creates new record
  - Expired key (> 24h) allows new creation
```

### 5.3 Required Integration Tests

```typescript
// apps/api/src/__tests__/auth.integration.test.ts

describe('Auth integration', () => {
  it('bcrypt rounds >= 12', async () => {
    // Create user, retrieve password_hash from DB, verify bcrypt rounds
    const hash = await db.one('SELECT password_hash FROM users WHERE email = $1', [testEmail]);
    const rounds = parseInt(hash.password_hash.split('$')[3]);
    expect(rounds).toBeGreaterThanOrEqual(12);
  });

  it('RS256 algorithm pinned — HS256 token rejected', async () => {
    const hs256Token = jwt.sign({ sub: 'user-id' }, 'secret', { algorithm: 'HS256' });
    const res = await fastify.inject({
      method: 'GET',
      url: '/api/v1/students',
      headers: { authorization: `Bearer ${hs256Token}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it('cross-tenant isolation — hostel A token cannot read hostel B data', async () => {
    const tokenA = await loginAs(hostelA.owner);
    const studentB = await createStudent(hostelB);

    const res = await fastify.inject({
      method: 'GET',
      url: `/api/v1/students/${studentB.studentId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    // Must be 404 — not 403, not 200. 403 leaks that the record exists.
    expect(res.statusCode).toBe(404);
  });

  it('rate limiting fires at 11th login attempt', async () => {
    for (let i = 0; i < 10; i++) {
      await fastify.inject({ method: 'POST', url: '/api/v1/auth/login', body: badCreds });
    }
    const res = await fastify.inject({ method: 'POST', url: '/api/v1/auth/login', body: badCreds });
    expect(res.statusCode).toBe(429);
    expect(JSON.parse(res.body).retryAfter).toBeDefined();
  });

  it('logout invalidates access token', async () => {
    const { accessToken } = await loginAs(testUser);
    await fastify.inject({
      method: 'POST', url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const res = await fastify.inject({
      method: 'GET', url: '/api/v1/students',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(401);
  });
});
```

**Cross-tenant test — run after EVERY new endpoint:**
```typescript
// apps/api/src/__tests__/isolation.ts
// Import this helper and call at bottom of every route test file

export async function assertCrossTenantIsolation(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  tokenFromTenantA: string,
  resourceIdFromTenantB: string
) {
  const res = await fastify.inject({
    method,
    url: url.replace(':id', resourceIdFromTenantB),
    headers: { authorization: `Bearer ${tokenFromTenantA}` },
  });
  // 404, not 403 — 403 reveals the record exists (information leak)
  expect(res.statusCode).toBe(404);
}
```

### 5.4 Playwright E2E Tests (Critical Flows Only)

```typescript
// apps/web/e2e/critical-flows.spec.ts

test.describe('Critical user flows', () => {

  test('Login flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=email]', TEST_OWNER_EMAIL);
    await page.fill('[name=password]', TEST_OWNER_PASSWORD);
    await page.click('[data-testid=login-btn]');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid=kpi-occupancy]')).toBeVisible();
  });

  test('Add student → view profile → confirm in list', async ({ page }) => {
    await loginAs(page, TEST_OWNER);
    await page.click('[data-testid=add-student-btn]');
    await page.fill('[name=fullName]', 'Test Student E2E');
    await page.fill('[name=cnic]', '35202-9999999-9');
    await page.fill('[name=phone]', '0312-9999999');
    // ... fill all required fields
    await page.click('[data-testid=student-submit-btn]');
    await expect(page.locator('text=Test Student E2E')).toBeVisible();
  });

  test('Record payment → generate receipt', async ({ page }) => {
    await loginAs(page, TEST_OWNER);
    await page.goto(`/students/${TEST_STUDENT_ID}/payments`);
    await page.click('[data-testid=record-payment-btn]');
    await page.fill('[name=amountPaid]', '8000');
    await page.click('[data-testid=payment-submit-btn]');
    await expect(page.locator('[data-testid=payment-status-paid]')).toBeVisible();
    await page.click('[data-testid=generate-receipt-btn]');
    await expect(page.locator('[data-testid=receipt-link]')).toBeVisible();
  });

  test('Cross-tenant: cannot access other hostel data', async ({ page }) => {
    await loginAs(page, HOSTEL_A_OWNER);
    // Attempt to navigate to hostel B's student directly
    await page.goto(`/students/${HOSTEL_B_STUDENT_ID}`);
    await expect(page).toHaveURL('/404');
  });

  test('Add cancellation → room freed', async ({ page }) => {
    await loginAs(page, TEST_OWNER);
    await page.goto(`/students/${TEST_STUDENT_ID}`);
    await page.click('[data-testid=add-cancellation-btn]');
    await page.fill('[name=vacateDate]', '2026-07-01');
    await page.click('[data-testid=cancellation-confirm-btn]');
    // Verify room shows as available
    await page.goto('/rooms');
    await expect(page.locator(`[data-testid=room-${TEST_ROOM_ID}][data-status=available]`)).toBeVisible();
  });
});
```

---

## 6. PRODUCTION POLISH

### 6.1 Loading States — Mandatory Pattern

Every screen that fetches data MUST show a skeleton, never a spinner.

```tsx
// packages/ui/src/components/Skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[var(--color-surface-2)]',
        className
      )}
    />
  );
}

// Page-level skeleton (example — dashboard):
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// Rule: Every page export wraps its data-dependent content in Suspense:
// <Suspense fallback={<DashboardSkeleton />}><Dashboard /></Suspense>
```

### 6.2 Empty States — Required on Every List Screen

Every list screen (students, payments, rooms, etc.) MUST handle the empty state explicitly.

```tsx
// packages/ui/src/components/EmptyState.tsx
interface EmptyStateProps {
  icon: LucideIcon;
  titleEn: string;
  titleUr: string;
  descriptionEn: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon: Icon, titleEn, titleUr, descriptionEn, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-12 w-12 text-[var(--color-text-muted)] mb-4" />
      <h3 className="text-lg font-semibold font-[Figtree]">{titleEn}</h3>
      <p className="text-sm font-[NotoNastaliqUrdu] text-[var(--color-text-muted)] leading-loose">{titleUr}</p>
      <p className="mt-2 text-sm text-[var(--color-text-muted)] max-w-sm">{descriptionEn}</p>
      {ctaLabel && onCta && (
        <button onClick={onCta} className="mt-4 btn-primary">{ctaLabel}</button>
      )}
    </div>
  );
}

// Usage:
// Students list empty:
<EmptyState
  icon={Users}
  titleEn="No students yet"
  titleUr="ابھی کوئی طالب علم نہیں"
  descriptionEn="Add your first student to get started"
  ctaLabel="Add Student"
  onCta={() => setAddStudentOpen(true)}
/>
```

### 6.3 Toast Notification System

```tsx
// packages/ui/src/components/Toast.tsx
// Framer Motion, 4s auto-dismiss, stacked (max 3 visible)

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;  // ms, default 4000
}

// Usage patterns:
toast.success('Payment recorded successfully');
toast.error('Failed to save — please try again');
toast.warning('Student has pending payments');
toast.info('Receipt is being generated...');

// Error recovery pattern — toast must include action when recoverable:
toast.error('Could not send WhatsApp receipt', {
  action: { label: 'Copy message', onClick: () => copyReceiptText() },
});
```

### 6.4 Responsive Design Targets

```
Mobile (< 640px):   Bottom tab bar · Full-width modals as bottom sheets · Single column
Tablet (640–1024px): Sidebar collapsed to icon rail · 2-column grids
Desktop (> 1024px): Full sidebar (260px) · Multi-column dashboards

Minimum test resolution: 360×640 (Android low-end, common in Pakistan)
Test in: Chrome mobile emulation → Samsung Galaxy A series profile
```

### 6.5 Accessibility Minimums (Phase 2)

```tsx
// Required on every interactive element:
// 1. aria-label on icon-only buttons
<button aria-label="Delete student" onClick={handleDelete}>
  <Trash2 className="h-4 w-4" />
</button>

// 2. role and aria-expanded on modals
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">

// 3. Form inputs always have associated label
<label htmlFor="phone">Phone Number</label>
<input id="phone" name="phone" type="tel" />

// 4. Focus trap in modals (shadcn/ui Dialog handles this)
// 5. Keyboard navigation for all interactive elements
// 6. Error messages linked to inputs via aria-describedby
<input aria-describedby="phone-error" />
<p id="phone-error" role="alert">{error}</p>
```

### 6.6 PWA Requirements (Phase 2)

```json
// apps/web/public/manifest.json
{
  "name": "HOSTYLLO — Hostel Management",
  "short_name": "HOSTYLLO",
  "description": "Hostel management for Pakistan",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0b0e14",
  "theme_color": "#c9a84c",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Service worker caches: app shell (layout, navigation, CSS) so the UI loads instantly on repeat visits even on slow connections. API data is NOT cached in SW (correctness > speed for financial data).

### 6.7 Number Formatting — Pakistan Locale

```typescript
// packages/db/src/formatters.ts

// Pakistani lakh system: 1,00,000 (not 100,000)
export const fmtPkr = (amount: number): string =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
// → PKR 1,00,000

// Short form for KPI cards
export const fmtPkrShort = (amount: number): string => {
  if (amount >= 100000) return `PKR ${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `PKR ${(amount / 1000).toFixed(1)}K`;
  return fmtPkr(amount);
};
// → PKR 2.5L | PKR 8.5K | PKR 800
```

---

## 7. PRODUCTION MONITORING — OPERATIONAL CHECKLIST

### 7.1 Pre-Deploy Checklist (Run Before Every Production Deploy)

```bash
#!/bin/bash
# scripts/pre-deploy-check.sh

echo "=== HOSTYLLO PRE-DEPLOY CHECKLIST ==="

# 1. All tests passing
pnpm vitest --run || { echo "TESTS FAILED"; exit 1; }

# 2. Payment tests specifically
pnpm vitest packages/db/src/__tests__/paymentService.test.ts --run || { echo "PAYMENT TESTS FAILED"; exit 1; }

# 3. No secrets in git
git log -p | grep -iE "SUPABASE_SERVICE_KEY|JWT_PRIVATE|ENCRYPTION_KEY|PAYMOB" && { echo "SECRETS IN GIT"; exit 1; } || true

# 4. TypeScript compiles
pnpm typecheck || { echo "TYPECHECK FAILED"; exit 1; }

# 5. PITR active
./scripts/verify-pitr.sh || { echo "PITR NOT ACTIVE — DO NOT DEPLOY"; exit 1; }

echo "=== ALL CHECKS PASSED — SAFE TO DEPLOY ==="
```

### 7.2 Post-Deploy Verification

```bash
# Run within 5 minutes of every deploy
./scripts/verify-deploy.sh

# What it checks:
# 1. /health returns 200 with db:ok and redis:ok
# 2. /auth/login returns 401 for bad credentials (not 500)
# 3. /students returns 401 without token (not 200, not 500)
# 4. Sentry receiving events (throw test error, confirm in dashboard)
# 5. BullMQ queues: no unexpected DLQ jobs
```

### 7.3 Daily Operational Checks (Super Admin)

Once Super Admin panel exists (Phase 3), check these every morning:

| Check | What to Look For | Action if Wrong |
|-------|-----------------|-----------------|
| BullMQ DLQ depth | Any queue > 0 | Investigate job, retry or discard |
| API error rate (Sentry) | Any new error types | Patch within 24h if affects clients |
| Failed payments (Paymob webhook) | billing-sync DLQ | Manual retry via Paymob dashboard |
| Tenant last login | Any paying client > 14 days | WhatsApp check-in |
| Redis memory | > 60% plan limit | Review key TTLs, upgrade plan |

### 7.4 Monthly Operational Tasks

```bash
# 1st of every month:
./scripts/verify-pitr.sh && echo "$(date): PITR OK" >> logs/pitr-checks.log

# 1st of every quarter:
# DR drill — restore a test database from PITR, verify 3 random records
# Document result in docs/DR_DRILL_LOG.md

# Every month:
npm audit --audit-level moderate > logs/audit-$(date +%Y-%m).log
# Zero critical CVEs = required. Moderate = review within 30 days.
```

---

*HOSTYLLO Production Readiness Spec v1.0 · June 2026 · Zeerak Hostix*
*Pairs with: 03_SECURITY_ARCHITECTURE.md · 10_OBSERVABILITY_ARCHITECTURE.md · 06_CLAUDE_MD_v15.md*
*Update this file: after any security incident, after Phase 1 exit, after each infra change.*
