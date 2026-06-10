# 09_FEATURE_FLAG_ARCHITECTURE.md
## HOSTYLLO — Feature Flag Architecture
### v1.0 · June 2026 · Traceable to PRD v15.0 Section 44 (Phase gating) + Blueprint Section 6.1

---

## SCOPE

This document defines how HOSTYLLO gates features by plan, phase, and rollout stage. It covers plan-based feature access, gradual rollouts, kill switches, and emergency disables. HOSTYLLO does not use a third-party feature flag service in Phase 1–4. The system is implemented as a lightweight in-process check backed by the `hostels` and `subscriptions` tables.

---

## 1. ARCHITECTURE OVERVIEW

The feature flag system has three layers:

```
Layer 1 — Plan Gates
  Plan stored in hostels.plan ('trial'|'starter'|'pro'|'enterprise')
  Checked via checkPlanFeature(featureKey) middleware
  Enforced at API level on gated routes

Layer 2 — Phase Gates
  Features not yet built are simply absent — no routes exist
  No flag needed for un-built features; guards are for built-but-gated features

Layer 3 — Kill Switches (Emergency)
  Redis key: feature_kill:{featureName}
  Checked before feature execution
  Set by Super Admin in < 60 seconds
  Does NOT require code deploy
```

---

## 2. PLAN-BASED FEATURES

### 2.1 Feature Matrix by Plan

| Feature Key | Trial | Starter | Pro | Enterprise |
|-------------|-------|---------|-----|------------|
| `students` | ✓ (max 30) | ✓ unlimited | ✓ unlimited | ✓ unlimited |
| `rooms` | ✓ (max 10) | ✓ unlimited | ✓ unlimited | ✓ unlimited |
| `payments` | ✓ | ✓ | ✓ | ✓ |
| `pdf_receipts` | ✓ (watermarked) | ✓ branded | ✓ branded | ✓ white-label |
| `expenses` | ✓ | ✓ | ✓ | ✓ |
| `data_export` | ✗ | ✓ | ✓ | ✓ |
| `wardens` | ✓ (max 1) | ✓ (max 3) | ✓ (max 10) | ✓ unlimited |
| `csv_import` | ✓ (max 30 rows) | ✓ | ✓ | ✓ |
| `whatsapp_automation` | ✗ | ✗ | ✓ | ✓ |
| `bulk_fee_update` | ✗ | ✓ | ✓ | ✓ |
| `advanced_reports` | ✗ | ✗ | ✓ | ✓ |
| `chain_management` | ✗ | ✗ | ✗ | ✓ |
| `api_access` | ✗ | ✗ | ✗ | ✓ |
| `white_label` | ✗ | ✗ | ✗ | ✓ |
| `sso` | ✗ | ✗ | ✗ | ✓ (Phase 8) |
| `maintenance_module` | ✓ | ✓ | ✓ | ✓ |
| `complaints_module` | ✓ | ✓ | ✓ | ✓ |
| `fines_module` | ✓ | ✓ | ✓ | ✓ |
| `room_inspections` | ✗ | ✓ | ✓ | ✓ |
| `bill_splits` | ✗ | ✓ | ✓ | ✓ |
| `nps_survey` | ✓ | ✓ | ✓ | ✓ |
| `command_palette` | ✗ | ✗ | ✓ | ✓ |
| `offline_mode` | ✗ | ✗ | ✓ | ✓ (Phase 5) |

### 2.2 Plan Limit Enforcement

Limits that are numeric (not binary) are enforced at the API level before record creation:

```typescript
// packages/shared/src/featureGates.ts

export const PLAN_LIMITS = {
  trial: {
    max_students: 30,
    max_rooms: 10,
    max_wardens: 1,
    receipt_watermark: true,
  },
  starter: {
    max_students: Infinity,
    max_rooms: Infinity,
    max_wardens: 3,
    receipt_watermark: false,
  },
  pro: {
    max_students: Infinity,
    max_rooms: Infinity,
    max_wardens: 10,
    receipt_watermark: false,
  },
  enterprise: {
    max_students: Infinity,
    max_rooms: Infinity,
    max_wardens: Infinity,
    receipt_watermark: false,
  },
} as const;

export const PLAN_FEATURES = {
  data_export:           ['starter', 'pro', 'enterprise'],
  whatsapp_automation:   ['pro', 'enterprise'],
  bulk_fee_update:       ['starter', 'pro', 'enterprise'],
  advanced_reports:      ['pro', 'enterprise'],
  chain_management:      ['enterprise'],
  api_access:            ['enterprise'],
  white_label:           ['enterprise'],
  room_inspections:      ['starter', 'pro', 'enterprise'],
  bill_splits:           ['starter', 'pro', 'enterprise'],
  command_palette:       ['pro', 'enterprise'],
  offline_mode:          ['pro', 'enterprise'],
} as const;

export type FeatureKey = keyof typeof PLAN_FEATURES;
export type Plan = 'trial' | 'starter' | 'pro' | 'enterprise';

export function canAccessFeature(plan: Plan, feature: FeatureKey): boolean {
  return (PLAN_FEATURES[feature] as readonly string[]).includes(plan);
}
```

### 2.3 Middleware Implementation

```typescript
// apps/api/src/middleware/featureGate.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { canAccessFeature, FeatureKey } from '@hostyllo/shared';

export function requireFeature(feature: FeatureKey) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const plan = req.hostelPlan; // set by auth middleware from DB

    if (!canAccessFeature(plan, feature)) {
      return reply.status(402).send({
        success: false,
        code: 'FEATURE_NOT_IN_PLAN',
        message: `This feature requires a higher plan. Current plan: ${plan}.`,
        data: null,
      });
    }
  };
}

// Usage on a route:
app.get('/api/v1/export', {
  preHandler: [requireAuth, requireFeature('data_export')],
}, exportHandler);
```

### 2.4 Student/Room Limit Enforcement

Enforced inside the route handler (not middleware, because it requires a DB count query):

```typescript
// Inside POST /students handler
const { plan } = req.hostelPlan;
const limit = PLAN_LIMITS[plan].max_students;

if (limit !== Infinity) {
  const { count } = await withTenant(req.hostelId, async (db) => {
    const res = await db.query(
      'SELECT COUNT(*) FROM students WHERE hostel_id = $1 AND deleted_at IS NULL',
      [req.hostelId]
    );
    return { count: parseInt(res.rows[0].count) };
  });

  if (count >= limit) {
    return reply.status(402).send({
      success: false,
      code: 'TRIAL_STUDENT_LIMIT',
      message: `Trial plan allows a maximum of ${limit} students. Upgrade to add more.`,
      data: null,
    });
  }
}
```

---

## 3. TENANT-SPECIFIC FEATURE FLAGS

In Phase 6, individual tenant overrides may be needed (e.g., granting a Starter client access to one Pro feature as a sales incentive). This is stored in the `hostels` table as a JSONB column:

```sql
-- Migration (Phase 6 only — do not add in Phase 1)
ALTER TABLE hostels ADD COLUMN feature_overrides JSONB DEFAULT '{}';

-- Example: grant Starter client access to whatsapp_automation
UPDATE hostels
SET feature_overrides = '{"whatsapp_automation": true}'
WHERE hostel_id = 'uuid';
```

Check order in Phase 6:
1. Check `feature_overrides` — if explicitly `true`, grant access regardless of plan
2. Check `feature_overrides` — if explicitly `false`, deny access regardless of plan
3. Fall back to plan-based check

**Phase 1–5:** `feature_overrides` column does not exist. Do not implement until Phase 6.

---

## 4. GRADUAL ROLLOUTS

Used when deploying a new feature to avoid simultaneous load on all tenants.

### 4.1 Rollout Mechanism

HOSTYLLO does not use a percentage-based rollout service in Phase 1–5. Gradual rollout is achieved by Super Admin enabling the feature per tenant via `feature_overrides`.

**Phase 6 rollout process for new feature X:**

```
Week 1: Enable for 5% of tenants (manually, or by hostel_id bucket: last hex digit of hostel_id in {0,1})
Week 2: Monitor error rate and DLQ depth. If clean → expand to 20%.
Week 3: If clean → expand to 100%.
```

**Bucket calculation (deterministic, no DB change required):**
```typescript
// Is this hostelId in the first 20% bucket?
function inRolloutBucket(hostelId: string, pct: number): boolean {
  const lastByte = parseInt(hostelId.replace(/-/g, '').slice(-2), 16);
  return lastByte < (256 * pct / 100);
}
```

### 4.2 Canary Releases (Phase 6+)

Canary releases apply to infrastructure changes (new API version, schema migrations), not individual features.

Process:
1. Deploy new API version to 1 of N Railway replicas.
2. Monitor error rate on that replica via Sentry.
3. If clean after 30 minutes, deploy to all replicas.
4. If errors appear, Railway allows per-replica rollback.

**Phase 1–5:** Not applicable. Railway runs a single replica (or 2 for HA). All-or-nothing deploy.

---

## 5. KILL SWITCHES

A kill switch disables a specific feature immediately across all tenants, without a code deploy. Used for:
- Feature causing data corruption detected in production
- Third-party service (360dialog, Paymob) having an incident
- Security vulnerability in a specific feature

### 5.1 Kill Switch Implementation

```typescript
// packages/shared/src/killSwitch.ts

import { redis } from './redis';

const KILL_SWITCH_PREFIX = 'feature_kill:';
const KILL_SWITCH_TTL = 86400; // 24 hours — must be manually renewed or removed

export async function isKilled(featureName: string): Promise<boolean> {
  const val = await redis.get(`${KILL_SWITCH_PREFIX}${featureName}`);
  return val === '1';
}

export async function killFeature(featureName: string, reason: string): Promise<void> {
  await redis.setex(`${KILL_SWITCH_PREFIX}${featureName}`, KILL_SWITCH_TTL, '1');
  // Log to audit_log (platform-level event, hostel_id = NULL)
  await logPlatformEvent('feature_killed', { featureName, reason });
}

export async function restoreFeature(featureName: string): Promise<void> {
  await redis.del(`${KILL_SWITCH_PREFIX}${featureName}`);
  await logPlatformEvent('feature_restored', { featureName });
}
```

Usage in route handler or middleware:

```typescript
// In pdf-receipts BullMQ worker
if (await isKilled('pdf_receipts')) {
  logger.warn({ jobId: job.id }, 'pdf_receipts is killed — skipping, returning to queue');
  // Do NOT throw — return gracefully. Job will be retried when kill switch is lifted.
  return { skipped: true, reason: 'kill_switch' };
}
```

### 5.2 Kill Switch Inventory

| Switch Name | Kills | When to Use |
|-------------|-------|-------------|
| `pdf_receipts` | PDF receipt generation | Puppeteer crash, storage errors |
| `whatsapp_blast` | Monthly blast automation | 360dialog outage, quota exhaustion |
| `whatsapp_receipt` | Per-payment WhatsApp | 360dialog outage |
| `billing_sync` | Paymob billing automation | Paymob outage, webhook flood |
| `rent_generate` | Monthly rent generation cron | Formula bug discovered in production |
| `auto_cancel` | Nightly auto-cancellation | Logic bug found in cancellation processing |
| `csv_import` | Bulk student import | Formula injection bypass discovered |
| `data_export` | Tenant data export | Storage bucket issue, export job loop |

### 5.3 Super Admin Kill Switch UI (Phase 3)

Super Admin panel → Platform → Kill Switches:
- List of all kill switches with current status (green = active / red = killed)
- [Kill] button with reason text field (required)
- [Restore] button with confirmation
- Last killed by / last restored by / timestamp visible
- Audit trail: every kill/restore logged to `audit_log`

### 5.4 Kill Switch TTL Policy

Kill switches auto-expire after 24 hours. This prevents a forgotten kill switch from permanently disabling a feature. If the switch needs to stay active beyond 24 hours, it must be manually renewed in the Super Admin panel. This forces a conscious decision to keep a feature disabled.

---

## 6. EMERGENCY DISABLE MECHANISM

For situations more severe than a kill switch — when the entire API must be taken offline:

### 6.1 Full API Disable

```bash
# Emergency: take API offline immediately
railway scale --service hostyllo-api --replicas 0

# Restore
railway scale --service hostyllo-api --replicas 2
```

This is the `railway scale --replicas 0` procedure from `06_SAAS_OPERATIONS.md` P0 response.

### 6.2 Maintenance Mode

For planned downtime (schema migration, major deploy):

```typescript
// Redis key: maintenance_mode = '1'
// Set by Super Admin before maintenance window

// Global Fastify hook (runs before all routes)
app.addHook('onRequest', async (req, reply) => {
  if (req.url === '/api/v1/health') return; // health check always passes

  const maintenance = await redis.get('maintenance_mode');
  if (maintenance === '1') {
    return reply.status(503).send({
      success: false,
      code: 'MAINTENANCE_MODE',
      message: 'HOSTYLLO is undergoing scheduled maintenance. Back shortly.',
      data: null,
    });
  }
});
```

Set maintenance mode from Super Admin panel before starting a maintenance window. Remove immediately after.

---

## 7. PHASE-GATED FEATURES (BUILD ORDER)

Features that are documented but not yet built are gated by their absence — no route exists. This table tracks which features become available per phase, to guide the Super Admin's communication to clients:

| Feature | Available Phase | Plan Gate |
|---------|----------------|-----------|
| All core modules (students, payments, rooms, expenses) | Phase 1 | Trial+ |
| PDF receipts | Phase 1 | Trial+ (watermarked on trial) |
| Email notifications | Phase 1 | All |
| PWA (mobile installable) | Phase 2 | All |
| In-app notifications | Phase 2 | All |
| Room inspections | Phase 2 | Starter+ |
| Bill splits | Phase 2 | Starter+ |
| Self-serve signup | Phase 3 | — |
| Super Admin panel | Phase 3 | super_admin only |
| Command palette | Phase 3 | Pro+ |
| WhatsApp automation | Phase 3 | Pro+ |
| Risk scoring (rule-based) | Phase 3 | All |
| Paymob auto-billing | Phase 4 | All |
| Referral program | Phase 4 | All |
| Offline mode (SQLite sync) | Phase 5 | Pro+ |
| Chain management | Phase 6 | Enterprise |
| API access | Phase 6 | Enterprise |
| White labelling | Phase 6 | Enterprise |
| SSO | Phase 8 | Enterprise |

---

*HOSTYLLO Feature Flag Architecture v1.0 · June 2026 · Traceable to PRD v15.0 Section 44*
*Update this document when a new feature is built or a plan boundary changes.*
