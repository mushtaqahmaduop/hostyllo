# 06_SAAS_OPERATIONS.md
## HOSTYLLO — SaaS Operations Manual
### v1.0 · June 2026 · Traceable to PRD v15.0 Sections 29, 32, 37

---

## SCOPE

This is the operational manual for running HOSTYLLO as a production SaaS. It covers tenant onboarding, trial management, subscription lifecycle, support workflow, incident escalation, and disaster recovery operations. It is written for a solo operator.

---

## 1. TENANT ONBOARDING

### 1.1 Self-Serve Onboarding (Phase 3)

The 7-step onboarding wizard runs automatically after email verification. No operator involvement required.

| Step | Content | Skippable | Event |
|------|---------|-----------|-------|
| 1 | Account created + email verified | No | wizard_step_1_complete |
| 2 | Hostel profile (name, city, phone) | No | wizard_step_2_complete |
| 3 | Logo + brand color | Yes | wizard_step_3_complete |
| 4 | First room type + room | No | wizard_step_4_complete |
| 5 | First student | Yes | wizard_step_5_complete |
| 6 | WhatsApp test | Yes | wizard_step_6_complete |
| 7 | Wizard complete → Dashboard | No | wizard_complete |

Each step fires an event to `onboarding_events` table for funnel analytics.

### 1.2 Manual Onboarding (Phase 1–2)

Before self-serve signup is live, all clients are onboarded manually.

**Pre-onboarding (before first session):**
- [ ] DPA (Data Processing Agreement) signed by owner and filed
- [ ] WhatsApp group created with client
- [ ] Hostel profile information collected (name, city, rooms, typical rent)
- [ ] Client student list obtained (Excel or manual list)

**Onboarding session (screen share, 60–90 minutes):**
- [ ] Super Admin creates hostel in admin panel
- [ ] Owner account created, login credentials shared over WhatsApp (not email)
- [ ] Client changes password immediately during session
- [ ] Room types added
- [ ] First 3–5 students added live (client does it with guidance)
- [ ] First payment recorded live (client does it)
- [ ] First receipt PDF generated and sent via WhatsApp (verified delivery)
- [ ] CSV import template provided if client has > 10 students
- [ ] Client confirms: "I can do this without help"

**Post-onboarding (48 hours later):**
- [ ] Check-in call: any questions?
- [ ] Verify at least 1 additional student added independently
- [ ] Send WARDEN_MANUAL.md link

---

## 2. TENANT PROVISIONING

### 2.1 Super Admin Tenant Creation (Phase 1–2)

```
1. Login to admin.hostyllo.app
2. Navigate to Tenants → New Tenant
3. Enter: owner email, hostel name, city, plan (default: trial)
4. System creates: hostels row, users row, subscriptions row (trial)
5. System sends: welcome email with login link
6. Log in Decision Log: {date, client name, plan, activation method}
```

### 2.2 Database Provisioning

Tenant provisioning creates exactly:
- 1 row in `hostels`
- 1 row in `users` (role: hostel_owner)
- 1 row in `subscriptions` (status: trialing, trial_ends_at: NOW() + 14 days)
- 1 row in `receipt_counter` (last_number: 0)
- 1 event in `onboarding_events` (wizard_step_1_complete)

No other setup is required. RLS handles isolation automatically.

---

## 3. TRIAL MANAGEMENT

### 3.1 Trial Limits

| Limit | Value | Error Code |
|-------|-------|------------|
| Students | 30 | TRIAL_STUDENT_LIMIT |
| Rooms | 10 | TRIAL_ROOM_LIMIT |
| Data export | Blocked | TRIAL_EXPORT_BLOCKED |
| Receipt PDF | Allowed (watermarked) | — |

### 3.2 Trial Extension

**When:** Client needs more time (legitimate), promising lead who isn't ready to pay.

**How:** Super Admin → Tenant detail → Extend Trial → N days.

**Rule:** Maximum 2 extensions per tenant. Third extension requires documented reason in Decision Log.

### 3.3 Trial Conversion

**Phase 1–3 (manual):** Super Admin activates plan manually after confirming payment received (bank transfer, JazzCash screenshot from client WhatsApp).

**Phase 4+ (automated):** Paymob webhook `payment.success` triggers automatic activation.

---

## 4. SUBSCRIPTION ACTIVATION

### 4.1 Manual Activation (Phase 1–3)

```
1. Confirm payment received (WhatsApp screenshot or bank statement)
2. Log in Decision Log: {date, amount, method, client, plan}
3. Super Admin → Tenant → Activate → Select plan + billing period
4. System: updates hostels.plan, hostels.plan_status='active'
5. System: updates subscriptions record
6. System: logs to audit_log
7. Send client: "Your account is now active" WhatsApp message
```

### 4.2 Automated Activation (Phase 4)

Paymob webhook `payment.success` → BullMQ `billing-sync` queue → Worker:
1. Validate HMAC-SHA512 signature
2. Check idempotency (processed webhook ID in Redis)
3. Update subscriptions record
4. Update hostels record
5. Send activation email via Resend
6. Log to audit_log

---

## 5. SUBSCRIPTION EXPIRY AND GRACE PERIOD

### 5.1 Expiry Flow (Phase 4 automated billing)

```
Day 0: Payment fails → PAST_DUE
Day 1: Auto-retry + email
Day 3: Auto-retry + email (urgent)
Day 7: Auto-retry + email ("7 days to suspension")
Day 14: SUSPENDED → all writes blocked
Day 28: Data export emailed automatically
Day 31: PII purge
Day 91: Full deletion
```

### 5.2 Manual Intervention Points

| Situation | Action |
|-----------|--------|
| Client contacts before Day 14 with payment | Accept payment, manual reactivate, log in Decision Log |
| Client contacts after Day 14 with payment | Accept payment, manual reactivate, verify no data loss |
| Client has hardware issue (lost phone) | Extend grace period by 7 days manually |
| Client claims they did not receive export email | Regenerate export immediately, send via WhatsApp |

---

## 6. TENANT SUSPENSION

### 6.1 Suspension Due to Non-Payment

Automatic on Day 14 of PAST_DUE (Phase 4). Manual in Phase 1–3.

After suspension, the tenant's data is read-only. All POST/PATCH/DELETE operations return `402 SUBSCRIPTION_SUSPENDED`.

### 6.2 Manual Suspension (Abuse/Fraud)

**Trigger:** Suspicious activity detected (abnormal API usage, client data exfiltration attempt, fraudulent payment dispute).

**Procedure:**
1. Document evidence in Decision Log.
2. Super Admin → Tenant → Suspend → Enter reason.
3. Email client: "Your account has been suspended. Contact us to resolve."
4. Log to audit_log with super_admin actor and reason.

**Note:** Manual suspension does not trigger the dunning sequence. It is immediate.

---

## 7. TENANT RECOVERY

### 7.1 Recovery from Suspension (Payment Made)

1. Confirm payment (WhatsApp/bank statement).
2. Super Admin → Tenant → Reactivate.
3. System restores write access immediately.
4. Send client: "Account reactivated" message.

### 7.2 Recovery from Archived State

**Possible if:** Client returns within 60-day archive window.

**What is recoverable:** Room structure, payment amounts, subscription history.
**What is not recoverable:** Student names, CNIC, phone numbers (PII purged on Day 31).

**Procedure:**
1. Inform client that student PII has been deleted per privacy policy.
2. Reactivate account.
3. Client must re-enter student data manually.
4. Log decision.

---

## 8. TENANT OFFBOARDING (Voluntary Cancellation)

### 8.1 Cancellation Request

Accepted via: in-app cancel flow (Phase 4), email, or WhatsApp to support.

**Verification steps:**
1. Confirm identity of requester (must be hostel_owner role or above).
2. Explain data retention policy: data available for 28 days, PII deleted Day 31, full deletion Day 91.
3. Offer data export before proceeding.
4. Set `cancel_at_period_end = true` in subscriptions.

**If billing period is mid-cycle:** No refunds (documented in Terms of Service). Access continues until end of current period.

### 8.2 Data Export (On Cancellation)

Client can trigger data export from Settings → Data Management → Download All Data.

Export ZIP contains:
- `students.csv` — all student records (with CNIC masked)
- `payments.csv` — full payment history
- `expenses.csv` — expense history
- `rooms.csv` — room and bed structure
- `receipts/` — all PDF receipts

Export is generated as a BullMQ job (`data-export` queue) and emailed when ready (typically < 5 minutes for < 500 students).

---

## 9. TENANT DELETION

**Automatic:** Day 91 after cancellation/suspension (PII purged Day 31, full data Day 91).
**Manual:** Super Admin can delete immediately for test/demo accounts.

Manual deletion requires:
1. Confirm `deleted_at` is set (account already deactivated).
2. Confirm data export was delivered.
3. Super Admin → Tenant → Delete Permanently → confirm.
4. System: removes all data immediately via BullMQ job.

---

## 10. CUSTOMER SUPPORT WORKFLOW

### 10.1 Support Channels (Phase 1–3)

- Primary: WhatsApp direct number (personal phone)
- Secondary: support@hostyllo.app (Resend inbox)
- Response time commitment: < 4 hours during business hours (9am–6pm PKT)

### 10.2 Support Request Triage

| Category | Response | Resolution |
|----------|----------|------------|
| Cannot login | < 30 min | Password reset or account check |
| Receipt wrong/missing | < 1 hour | Verify formula, regenerate receipt |
| Data import issue | < 2 hours | Walk through CSV template |
| Cannot add student | < 30 min | Check trial limits or role permissions |
| Billing question | < 2 hours | Check subscriptions table |
| Feature request | Log in feedback table, respond within 24h | Next roadmap review |

### 10.3 Impersonation for Support

When debugging a client issue, Super Admin can impersonate their account.

**Protocol:**
1. Inform client you are impersonating (WhatsApp message: "I'll temporarily access your account to investigate").
2. Super Admin → Tenant → Impersonate.
3. Every action taken while impersonating is logged to `audit_log` with `impersonated_by = super_admin_id`.
4. Exit impersonation as soon as issue is resolved.
5. Message client: "Investigation complete. Here's what I found."

---

## 11. INCIDENT ESCALATION

### 11.1 Incident Classification

| Severity | Definition | Example |
|----------|-----------|---------|
| P0 | All clients affected OR data breach | API down, formula error in production |
| P1 | Specific client affected, data at risk | Single client cannot login |
| P2 | Feature broken, workaround exists | Receipt PDF not generating |
| P3 | Minor issue, no workaround needed | Display formatting glitch |

### 11.2 P0 Response

See `03_SECURITY_ARCHITECTURE.md` Section 7 for full breach response.

For P0 outages:
1. Check Uptime Robot alert. Confirm outage is real (not monitoring failure).
2. Check Railway logs: `railway logs --tail`
3. Check Supabase dashboard for DB issues.
4. If API is down: attempt Railway restart first.
5. If DB is down: this is a Supabase incident. Monitor status.supabase.com.
6. Notify active clients via WhatsApp if outage > 15 minutes.

### 11.3 Client Communication During Incident

```
WhatsApp message template:
"HOSTYLLO is experiencing technical issues since [time].
Our team is working to resolve this.
Expected restoration: [time estimate, or 'investigating'].
Your data is safe. We will update you within [30/60 minutes].
Apologies for the inconvenience."
```

---

## 12. PRODUCTION OUTAGES

### 12.1 Diagnostic Commands

```bash
# Check API logs
railway logs --service hostyllo-api --tail 100

# Check if it's a deploy issue (recent change)
railway logs --service hostyllo-api --since 1h | grep "deploy\|error"

# Scale down to 0 (emergency stop)
railway scale --service hostyllo-api --replicas 0

# Scale back up
railway scale --service hostyllo-api --replicas 2

# Check Redis
redis-cli -u $UPSTASH_REDIS_URL PING

# Check Supabase DB health (from API)
curl https://api.hostyllo.app/api/v1/health
```

### 12.2 Common Outage Causes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 503 on all endpoints | Railway crash loop | Check logs → fix code → redeploy |
| Slow responses (> 2s) | DB connection pool exhausted | Kill long queries in Supabase |
| 500 on payment endpoints only | BullMQ Redis disconnected | Check Upstash status |
| Auth errors only | JWT keypair mismatch (after rotation) | Verify public key in Vercel |
| All endpoints 401 | Redis FLUSHALL (incident response ran?) | Check if jti blocklist was cleared |

---

## 13. DISASTER RECOVERY OPERATIONS

### 13.1 Point-in-Time Recovery Procedure

**Use when:** Data corruption, accidental deletion, bad migration.

```bash
# 1. Identify the last-good timestamp
# Check audit_log for when the corruption event occurred

# 2. Restore via Supabase Dashboard
# Settings → Database → Restore → Select point-in-time → Restore to new project

# 3. Verify restoration
# Connect to restored project → check record counts → verify data integrity

# 4. Update API connection string
# Railway env vars → SUPABASE_URL → update to restored project URL
# Railway restart

# 5. Inform clients of data recovery time window
```

**RTO (Recovery Time Objective):** 4–8 hours for full PITR restore.
**RPO (Recovery Point Objective):** Up to 5 minutes of data loss (WAL replication lag).

### 13.2 Quarterly DR Drill

Run on 1st of every quarter:

```bash
# 1. Run verify-pitr.sh
./scripts/verify-pitr.sh

# 2. Restore to a separate Supabase project (not production)
# Use the Supabase dashboard PITR restore feature
# Restore to a test project

# 3. Verify:
# - Row count matches production
# - Payment calculations are correct
# - CNIC decryption works (ENCRYPTION_KEY available)
# - RLS is active on all tables

# 4. Log result in Decision Log: {date, result, any issues found}

# 5. Delete the test project after verification
```

---

*HOSTYLLO SaaS Operations Manual v1.0 · June 2026 · Traceable to PRD v15.0 Sections 29, 32, 37*
*Update this document after every significant operational incident.*
