# 07_TENANT_LIFECYCLE.md
## HOSTYLLO — Tenant Lifecycle Management
### v1.0 · June 2026 · Traceable to PRD v15.0 Sections 26, 29, 37

---

## SCOPE

This document defines the complete lifecycle of a HOSTYLLO tenant from signup to deletion. It specifies every state, every transition rule, every automation trigger, and every data access policy per state.

---

## 1. TENANT STATE MACHINE

```
                    ┌─────────────┐
                    │   SIGNUP    │  User submits registration
                    └──────┬──────┘
                           │ Email sent
                    ┌──────▼──────┐
                    │  UNVERIFIED │  Email not yet verified
                    └──────┬──────┘
                           │ Email link clicked (≤ 24h)
                    ┌──────▼──────┐
                    │    TRIAL    │  14-day free trial starts
                    └──────┬──────┘
                    ┌──────┴──────────────┐
                    │                     │
             Trial ends,           Trial ends,
             plan selected +       no action
             payment success       │
                    │              ▼
             ┌──────▼──────┐  ┌──────────────┐
             │   ACTIVE    │  │    EXPIRED   │
             └──────┬──────┘  └──────┬───────┘
                    │                │ 3 days
             Payment fails           ▼
                    │         ┌──────────────┐
             ┌──────▼──────┐  │   DELETED    │
             │  PAST_DUE   │  └──────────────┘
             └──────┬──────┘
                    │
             Dunning sequence
             (Day 1, 3, 7 warnings)
                    │
             Day 14: Grace period ends
                    │
             ┌──────▼──────┐
             │  SUSPENDED  │  Read-only. No new records.
             └──────┬──────┘
                    ├── Payment succeeds → ACTIVE
                    │
             Day 28: Data export auto-sent
                    │
             Day 31: PII purge
                    │
             ┌──────▼──────┐
             │   ARCHIVED  │  Anonymized data only
             └──────┬──────┘
                    │ 90 days
             ┌──────▼──────┐
             │   DELETED   │  All data removed
             └─────────────┘
```

---

## 2. STATE DEFINITIONS

### 2.1 UNVERIFIED

**Trigger:** User completes registration form.

**What exists:**
- `hostels` row created with `plan_status = 'unverified'`
- `users` row for owner created (password hashed)
- Email verification token sent (6-character, 24h expiry)

**What is blocked:**
- Login is blocked until email verified
- No data can be created

**Automation:**
- Resend verification email after 24h if not clicked (once only)
- Delete `UNVERIFIED` accounts after 72h if no verification

**Transition to TRIAL:** Email verification link clicked within 24h.

---

### 2.2 TRIAL

**Trigger:** Email verified. Onboarding wizard starts.

**Duration:** 14 calendar days from `trial_starts_at`.

**What exists:**
- Full product access (all Phase 1 features)
- Maximum 30 students (trial limit)
- Maximum 10 rooms (trial limit)
- PDF receipts have "Trial - HOSTYLLO" watermark

**What is blocked:**
- More than 30 students (error: TRIAL_STUDENT_LIMIT)
- CSV import > 30 rows (error: TRIAL_STUDENT_LIMIT)
- Data export (available from ACTIVE only)

**Automation (AUTO-01 equiv for trial):**
- Day 7: Email "7 days left in your trial"
- Day 12: Email "2 days left — upgrade to keep your data"
- Day 14: Plan selection prompt in-app banner (red)
- Day 14 at midnight: transition to EXPIRED if no payment

**Transition to ACTIVE:** Owner selects plan + payment successful (Phase 4). Or: manual upgrade by Super Admin (Phase 1–3).

---

### 2.3 ACTIVE

**Trigger:** Trial converted or manual activation by Super Admin.

**What exists:** Full product access per plan.

| Feature | Starter | Pro | Enterprise |
|---------|---------|-----|------------|
| Students | Unlimited | Unlimited | Unlimited |
| Rooms | Unlimited | Unlimited | Unlimited |
| Wardens | Up to 3 | Up to 10 | Unlimited |
| PDF receipts | Branded | Branded | White-label |
| Data export | ✓ | ✓ | ✓ |
| API access | — | — | ✓ |
| Chain management | — | — | ✓ |

**Automation:**
- Monthly rent generation (AUTO-01) — 1st of every month
- Nightly auto-cancellations (AUTO-02)
- PDF receipt generation on payment (AUTO-03)

**Transition to PAST_DUE:** Payment fails (Paymob webhook `payment.failed`).

---

### 2.4 PAST_DUE

**Trigger:** Payment failure. Dunning sequence begins.

**What exists:** Full data access (read + write). No new subscription charges attempted immediately.

**Dunning sequence:**

| Day | Action |
|-----|--------|
| 0 | In-app banner: "Payment failed. Update payment method." Email notification. |
| 1 | Retry payment. Email notification. |
| 3 | Retry payment. Email notification with urgency. |
| 7 | Final retry. Email: "Subscription will be suspended in 7 days." |
| 14 | Transition to SUSPENDED. |

**What is blocked:**
- None (full access maintained during PAST_DUE to encourage payment)

**Transition to ACTIVE:** Payment retried successfully (any dunning day).
**Transition to SUSPENDED:** Day 14 of dunning without payment.

---

### 2.5 SUSPENDED

**Trigger:** Day 14 of dunning without payment OR manual suspension by Super Admin.

**What exists:** All data readable. No new records can be created.

**What is blocked:**
- `POST /students` → 402 SUBSCRIPTION_SUSPENDED
- `POST /payments` → 402 SUBSCRIPTION_SUSPENDED
- `POST /expenses` → 402 SUBSCRIPTION_SUSPENDED
- All write operations blocked
- Login is allowed (owner can read data, download export)

**In-app state:**
- Full-screen banner: "Account suspended. Update payment to resume."
- All form submit buttons disabled
- Data export button visible and enabled

**Automation:**
- Day 28 (from suspension): data export ZIP auto-generated and emailed (AUTO-10)
- Day 31 (from suspension): PII purge job runs (AUTO-11)
- Day 31 + 60 days: Full deletion

**Transition to ACTIVE:** Payment processed successfully.
**Transition to ARCHIVED:** Day 31 PII purge completes.

**Manual suspension by Super Admin:**
- Reason required (abuse, fraud, non-payment escalation)
- Logged to audit_log with super_admin actor_id
- Owner notified via email

---

### 2.6 GRACE PERIOD

Grace period is the window between SUSPENDED and data destruction. It is not a separate state — it is the last 31 days of SUSPENDED status.

**Day 0–28 (SUSPENDED):** Data intact, read-only access.
**Day 28:** Data export ZIP generated and emailed automatically.
**Day 29–31:** Final 3-day warning emails.
**Day 31:** PII purge runs. `full_name`, `cnic_encrypted`, `phone`, `emergency_contact`, `email`, `address` set to REDACTED/NULL in `students` table.

---

### 2.7 ARCHIVED

**Trigger:** PII purge completes (Day 31 after suspension).

**What exists:**
- Financial aggregates (total revenue, total expenses, monthly totals)
- Room and bed structure
- Payment records with amounts but no student PII
- Subscription history

**What is gone:**
- Student names, CNIC, phone numbers
- User accounts (except email for recovery)

**Duration:** 60 days in ARCHIVED state.
**Transition to DELETED:** 60 days in ARCHIVED state.

---

### 2.8 EXPIRED (Trial)

**Trigger:** 14-day trial ends without payment.

**Duration:** 3 days.

**What exists:** Read-only access to trial data. Login allowed.

**What is blocked:** All write operations.

**In-app state:** Upgrade prompt modal (cannot be dismissed).

**Automation:**
- Day 1 of EXPIRED: Email "Your trial has ended. Upgrade now."
- Day 3: Email "Your trial data will be deleted tomorrow."
- Day 3 at midnight: Transition to DELETED (no ARCHIVED phase for trials).

**Note:** Trials get no ARCHIVED phase. Trial data is deleted cleanly after 3 days of EXPIRED.

---

### 2.9 DELETED

**Trigger:** 60 days in ARCHIVED state OR 3 days in EXPIRED state.

**What happens:**
```sql
-- Delete all remaining records (even REDACTED ones)
DELETE FROM students WHERE hostel_id = $1;
DELETE FROM payments WHERE hostel_id = $1;
DELETE FROM rooms WHERE hostel_id = $1;
-- ... all tenant tables
DELETE FROM hostels WHERE hostel_id = $1;
-- Delete from Supabase Storage: all files in hostel_id/ bucket prefix
```

**Trigger type:** BullMQ job queued by scheduler. Irreversible.

**What is preserved:**
- `audit_log` entries with `hostel_id = NULL` (platform-level) are kept
- Subscription records kept for billing history / chargeback evidence

---

## 3. TRANSITION RULES TABLE

| From | To | Trigger | Automation | Manual Override |
|------|----|---------|------------|-----------------|
| UNVERIFIED | TRIAL | Email verified | Start 14-day trial timer | Super Admin: instant verify |
| UNVERIFIED | DELETED | 72h no verification | Delete account | — |
| TRIAL | ACTIVE | Payment success | Disable watermark, remove limits | Super Admin: manual activate |
| TRIAL | EXPIRED | Day 14, no payment | Block writes | — |
| EXPIRED | DELETED | Day 3 | Delete all data | Super Admin: restore for 24h |
| ACTIVE | PAST_DUE | Payment fails | Start dunning | — |
| PAST_DUE | ACTIVE | Payment retried | Stop dunning | Super Admin: manual clear |
| PAST_DUE | SUSPENDED | Day 14 dunning | Block all writes | Super Admin: manual suspend |
| SUSPENDED | ACTIVE | Payment success | Re-enable writes | Super Admin: manual activate |
| SUSPENDED | ARCHIVED | Day 31 | PII purge job | — |
| ARCHIVED | DELETED | Day 60 | Delete all data | Super Admin: can abort |

---

## 4. AUTOMATION TRIGGERS PER STATE TRANSITION

```
ON TRIAL_START:
  → onboarding_events: INSERT 'trial_started'
  → email: Welcome + onboarding checklist

ON TRIAL_DAY_7:
  → email: "7 days left" reminder
  → in-app: trial countdown banner

ON TRIAL_DAY_14:
  → status: TRIAL → EXPIRED
  → in-app: upgrade modal (blocking)

ON PAYMENT_SUCCESS (TRIAL → ACTIVE):
  → subscriptions: update status='active'
  → hostels: update plan, plan_status
  → email: "Welcome to Starter/Pro/Enterprise"
  → audit_log: INSERT subscription_activated

ON PAYMENT_FAILED (ACTIVE → PAST_DUE):
  → subscriptions: update status='past_due', dunning_day=0
  → in-app: payment failure banner
  → email: payment failed notification
  → queue: billing-sync for retry schedule

ON DUNNING_DAY_1, DAY_3, DAY_7:
  → retry payment via Paymob
  → email: escalating urgency

ON DUNNING_DAY_14 (PAST_DUE → SUSPENDED):
  → hostels: update plan_status='suspended'
  → API: all write endpoints return 402
  → email: suspension notice
  → audit_log: INSERT tenant_suspended

ON SUSPENDED_DAY_28:
  → queue: data-export job
  → email: "Your data export is attached"

ON SUSPENDED_DAY_31:
  → queue: pii-purge job (AUTO-11)
  → hostels: update plan_status='archived'
  → email: "Personal data has been removed from our systems"

ON ARCHIVED_DAY_60:
  → queue: full-delete job
  → DELETE all remaining data
  → email: "Your account has been permanently closed"

ON PAYMENT_SUCCESS (SUSPENDED → ACTIVE):
  → hostels: update plan_status='active'
  → subscriptions: update status='active', dunning_day=0
  → email: "Welcome back — account reactivated"
  → audit_log: INSERT tenant_reactivated
```

---

## 5. DATA ACCESS BY STATE

| State | Login | Read | Write | Export | Receipt PDF |
|-------|-------|------|-------|--------|-------------|
| UNVERIFIED | ✗ | ✗ | ✗ | ✗ | ✗ |
| TRIAL | ✓ | ✓ | ✓ (limits) | ✗ | ✓ (watermarked) |
| ACTIVE | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAST_DUE | ✓ | ✓ | ✓ | ✓ | ✓ |
| SUSPENDED | ✓ | ✓ | ✗ | ✓ | ✗ (new only) |
| EXPIRED | ✓ | ✓ | ✗ | ✗ | ✗ |
| ARCHIVED | ✗ | ✗ | ✗ | ✗ | ✗ |
| DELETED | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 6. SUPER ADMIN TENANT OPERATIONS

All Super Admin operations on tenants are logged to `audit_log` with the Super Admin's `actor_id`.

| Operation | When Used | Effect |
|-----------|-----------|--------|
| Force verify email | Support request | UNVERIFIED → TRIAL immediately |
| Extend trial | Sales decision | trial_ends_at += N days |
| Manual activate | Phase 1–3 (pre-Paymob) | TRIAL/EXPIRED → ACTIVE |
| Manual suspend | Abuse / fraud | ACTIVE → SUSPENDED immediately |
| Lift suspension | Payment resolved offline | SUSPENDED → ACTIVE |
| Abort deletion | Accidental | ARCHIVED → SUSPENDED (must re-export) |
| Impersonate | Support | Acts as hostel_owner in that tenant |

---

*HOSTYLLO Tenant Lifecycle v1.0 · June 2026 · Traceable to PRD v15.0 Sections 26, 29, 37*
