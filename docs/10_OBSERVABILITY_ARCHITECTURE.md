# 10_OBSERVABILITY_ARCHITECTURE.md
## HOSTYLLO — Observability Architecture
### v1.0 · June 2026 · Traceable to PRD v15.0 Section 43

---

## SCOPE

This document defines the complete observability stack for HOSTYLLO: structured logging, metrics, distributed tracing, alerting, SLOs, and operational dashboards. All configurations are prescriptive — not conceptual.

> **IMPLEMENTATION STATUS (2026-07-23) — what is actually live vs. designed:**
> - ✅ **Structured logging** (Pino, via Fastify) — live.
> - ✅ **Error reporting: Sentry** — wired in `apps/api/src/instrument.ts` (imported first in
>   `server.ts`); captures 5xx (central error handler) + `unhandledRejection`/`uncaughtException`.
>   Org `zeerak-services`, project `hostyllo-api`. No-op without `SENTRY_DSN`.
> - ✅ **Uptime**: GitHub Actions `.github/workflows/uptime.yml` probes `/health` every 10 min →
>   Sentry Crons monitor `hostyllo-uptime` (alerts on app-down **and** probe-silent).
> - ⬜ **Metrics / distributed tracing / SLO dashboards** below are still design-only (Sentry perf
>   tracing is available via `SENTRY_TRACES_SAMPLE_RATE` but off by default). See
>   `14_DEPLOYMENT_RUNBOOK.md` §7 for the live monitoring setup.

---

## 1. LOGGING

### 1.1 Logging Library

**Library:** Pino (fast, structured JSON logging, native to Fastify)

```typescript
// packages/config/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // PII Filter: block secrets from logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.cnic',
      'req.body.cnic_encrypted',
      '*.cnic_encrypted',
      '*.totp_secret_enc',
      '*.password_hash',
    ],
    censor: '[REDACTED]',
  },
  // Sentry-compatible format
  formatters: {
    level(label) { return { level: label }; }
  }
});
```

### 1.2 Mandatory Log Fields

Every log entry must contain these fields. No exceptions.

```typescript
interface LogEntry {
  // Always present
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  time: number;                   // Unix timestamp ms
  msg: string;

  // Request context (every HTTP log)
  req?: {
    method: string;
    url: string;
    correlationId: string;        // X-Correlation-ID header or generated UUID
    hostelId?: string;            // from JWT (never from body)
    userId?: string;              // from JWT
    role?: string;                // from JWT
    ip: string;                   // Cloudflare-CF-Connecting-IP header
    userAgent: string;
  };

  // Response context
  res?: {
    statusCode: number;
    responseTime: number;         // milliseconds
  };

  // Error context (for error logs)
  err?: {
    type: string;
    message: string;
    stack: string;
  };

  // Domain context (for business operations)
  hostelId?: string;
  studentId?: string;
  paymentId?: string;
  action?: string;
}
```

### 1.3 Correlation IDs

Every request gets a correlation ID. This ID follows the request through all logs, Sentry errors, and BullMQ jobs.

```typescript
// Fastify middleware (apps/api/src/middleware/correlationId.ts)
app.addHook('onRequest', async (req, reply) => {
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    crypto.randomUUID();

  req.correlationId = correlationId;
  reply.header('X-Correlation-ID', correlationId);
});
```

BullMQ jobs include `correlationId` in their job data so log chains can be traced from HTTP request → job queue → worker.

### 1.4 Log Levels in Production

| Level | When Used |
|-------|-----------|
| `error` | Unhandled exceptions, failed DB queries, BullMQ job failures |
| `warn` | Rate limit approaching, slow queries (> 500ms), deprecated API usage |
| `info` | HTTP requests (200/300), BullMQ job starts and completions, tenant lifecycle events |
| `debug` | Disabled in production (LOG_LEVEL=info in Railway) |

---

## 2. MONITORING

### 2.1 Uptime Monitoring

**Tool:** Uptime Robot (free tier sufficient for Phase 0–3)

**Monitors:**

| Name | URL | Type | Interval | Alert |
|------|-----|------|----------|-------|
| API Health | `https://api.hostyllo.app/api/v1/health` | HTTP | 5 min | SMS + email |
| Frontend | `https://app.hostyllo.app` | HTTP | 5 min | Email |
| Admin Panel | `https://admin.hostyllo.app` | HTTP | 5 min | Email |

**Health endpoint response (must return all three):**
```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "version": "1.2.3",
  "timestamp": "2026-06-05T12:00:00Z"
}
```

If `db` or `redis` is not `"ok"`, the status is `"degraded"` and the HTTP status code is 503.

### 2.2 Error Monitoring

**Tool:** Sentry

**Configuration (apps/api/src/lib/sentry.ts):**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,         // 10% of requests traced (Phase 1 — increase as needed)
  beforeSend(event) {
    // Strip PII from Sentry events
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      const blocked = ['password', 'cnic', 'cnic_encrypted', 'totp_secret_enc'];
      blocked.forEach(key => {
        if (data[key]) data[key] = '[REDACTED]';
      });
    }
    return event;
  },
  // Deny list prevents secrets from appearing in Sentry
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
  ],
});
```

**Sentry alert rules:**
- Error rate > 5% over 5 minutes → immediate Sentry alert to email
- New error type never seen before → immediate alert
- Error rate spike (10x normal) → immediate alert

### 2.3 Application Performance Monitoring (APM)

Railway provides basic CPU/memory metrics. For deeper APM, use Sentry Performance:

```typescript
// Sentry transaction wrapping for critical operations
const transaction = Sentry.startTransaction({
  name: 'POST /api/v1/payments',
  op: 'http.server',
});

const span = transaction.startChild({
  op: 'db.query',
  description: 'calculateUnpaid',
});
// ... query
span.finish();
transaction.finish();
```

Phase 1 APM scope: instrument payment creation and student search only.

---

## 3. METRICS

### 3.1 Metrics Available from Existing Infrastructure

Without a dedicated metrics service (Prometheus/Grafana not justified until Phase 4+), metrics come from:

- **Railway dashboard:** CPU, memory, request count, response time
- **Upstash dashboard:** Redis command rate, memory usage, connection count
- **Supabase dashboard:** DB connection count, query execution time, replication lag
- **BullMQ:** Job count per queue (active, waiting, failed, completed)
- **Cloudflare:** Request count, bandwidth, cached vs uncached ratio, threat score

### 3.2 Business Metrics (Super Admin Dashboard)

These are computed from the database, not infrastructure:

```sql
-- MRR (computed daily by Super Admin dashboard query)
SELECT
  SUM(amount_pkr) FILTER (WHERE billing_cycle = 'monthly') +
  SUM(amount_pkr / 12) FILTER (WHERE billing_cycle = 'annual') AS mrr_pkr
FROM subscriptions
WHERE status = 'active';

-- Active tenants by plan
SELECT plan, COUNT(*) FROM hostels
WHERE plan_status = 'active'
GROUP BY plan;

-- Trial conversion rate (30-day window)
SELECT
  COUNT(*) FILTER (WHERE plan_status = 'active') AS converted,
  COUNT(*) FILTER (WHERE plan_status IN ('expired','deleted')) AS churned,
  COUNT(*) AS total_trials
FROM hostels
WHERE trial_starts_at > NOW() - INTERVAL '30 days';
```

---

## 4. DISTRIBUTED TRACING

### 4.1 Tracing Strategy (Phase 1)

Phase 1 tracing: Sentry with 10% sample rate. No additional tracing infrastructure.

Correlation chain:
```
HTTP Request → X-Correlation-ID generated
              → Pino log: {correlationId, userId, hostelId, url}
              → Sentry transaction: {correlationId}
              → withTenant() DB query: {correlationId in Pino context}
              → BullMQ job.data.correlationId: traced to worker log
```

Phase 4+ consideration: OpenTelemetry + Grafana Tempo if p95 debugging becomes insufficient with Sentry alone.

---

## 5. ALERTING

### 5.1 Alert Channels

| Severity | Channel | Response |
|----------|---------|----------|
| P0 | SMS (Uptime Robot) + Sentry email | Immediate |
| P1 | Sentry email | < 4 hours |
| P2 | Sentry email digest | Next business day |

### 5.2 Alert Rules

| Alert | Threshold | Tool | Severity |
|-------|-----------|------|----------|
| API downtime | `/health` non-200 for > 5 min | Uptime Robot | P0 |
| Error rate spike | > 5% of requests return 5xx over 5 min | Sentry | P0 |
| p99 latency | > 2s sustained over 5 min | Railway metrics | P1 |
| DB connection pool | > 80% utilization | Supabase dashboard alert | P1 |
| BullMQ DLQ depth | > 10 jobs in any queue | Custom (checked in Super Admin) | P1 |
| Redis memory | > 80% of plan limit | Upstash alert | P2 |
| Failed payment webhook | Any unprocessed Paymob event > 5 min | BullMQ billing-sync DLQ | P1 |
| Receipt generation failure | pdf-receipts DLQ receives job | Super Admin red badge | P2 |

### 5.3 Alert Suppression

Do NOT send alerts during:
- Planned maintenance windows (documented in Super Admin before starting)
- Known Supabase/Railway incidents (check status pages before triggering runbook)

---

## 6. SLOs AND ERROR BUDGETS

### 6.1 Service Level Objectives

| SLO | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| API Availability | 99.5% | 30-day rolling | Uptime Robot |
| API p95 Latency | < 200ms | 7-day rolling | Railway metrics |
| Error Rate | < 1% | 7-day rolling | Sentry |
| Receipt Generation | < 2s (async) | Per-event | BullMQ job timing |
| Student Search | < 200ms p95 | Daily | k6 load test (Phase 5) |

**Why 99.5% and not 99.9%:** 99.9% allows 43 minutes downtime/month. 99.5% allows 3.6 hours/month. For a Phase 1 bootstrapped solo product, 99.5% is achievable with Supabase + Railway. 99.9% requires multi-region redundancy not present in the current architecture.

### 6.2 Error Budgets

Monthly error budget for 99.5% availability: **3.6 hours of downtime**.

Track via Uptime Robot monthly uptime report. If error budget is > 50% consumed by mid-month, pause new feature releases and focus on stability.

---

## 7. INCIDENT DETECTION

### 7.1 Automated Detection

| Signal | Detection Time | Source |
|--------|---------------|--------|
| API fully down | < 5 minutes | Uptime Robot |
| High error rate | < 5 minutes | Sentry alert |
| Database unreachable | < 5 minutes | Uptime Robot (via /health) |
| Redis unreachable | < 5 minutes | Uptime Robot (via /health) |
| BullMQ worker stopped | < 15 minutes | DLQ accumulation |
| Payment webhook failures | < 30 minutes | billing-sync DLQ |

### 7.2 Manual Detection (Recurring Checks)

| Check | Frequency | How |
|-------|-----------|-----|
| BullMQ queue depth | Daily | Super Admin panel |
| Failed jobs in DLQ | Daily | Super Admin panel |
| Sentry error trends | Weekly | Sentry dashboard |
| Railway resource usage | Weekly | Railway dashboard |
| PITR status | Monthly | verify-pitr.sh |
| Backup restore test | Quarterly | DR drill |

---

## 8. OPERATIONAL DASHBOARDS

### 8.1 Super Admin Dashboard (Phase 3)

The Super Admin panel shows:

**Business Row:**
- Total active tenants | MRR (PKR) | MRR growth % (vs last month) | Trial pipeline count | Churned this month

**Platform Health Row:**
- API uptime % (30-day) | BullMQ queue depth (all queues) | API p95 latency | Failed jobs (24h) | WhatsApp quota used (250/day)

**Charts:**
- MRR trend (12-month bar chart)
- Tenant growth (cumulative line, by plan)
- Onboarding funnel (7 wizard steps, conversion rate)
- Plan distribution (donut: Starter/Pro/Enterprise)

### 8.2 Tenant Health Monitoring (Super Admin)

Each tenant row shows:
- Last login date (inactive > 7 days = amber, > 30 days = red)
- Plan status badge
- Student count vs plan limit
- Last payment timestamp (billing health)
- Open DLQ jobs for this tenant (if any)

### 8.3 Railway Dashboard Usage

For Phase 1–3, Railway's built-in metrics replace a dedicated observability stack:
- CPU usage per replica
- Memory per replica
- Request count and response time (from Railway's HTTP metrics)
- Deploy history (rollback is one click)

---

*HOSTYLLO Observability Architecture v1.0 · June 2026 · Traceable to PRD v15.0 Section 43*
*Review after Phase 5 (scaling phase) — consider OpenTelemetry if Sentry p95 debugging becomes insufficient*
