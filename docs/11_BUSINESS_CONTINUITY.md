# 11_BUSINESS_CONTINUITY.md
## HOSTYLLO — Business Continuity & Disaster Recovery
### v1.0 · June 2026 · Traceable to PRD v15.0 Section 19 + PRD Section 43

---

## SCOPE

This document defines HOSTYLLO's recovery procedures for every infrastructure failure scenario: database, region, vendor, and security breach. It includes RTO/RPO targets, the quarterly DR drill procedure, and all runbook commands.

---

## 1. RECOVERY OBJECTIVES

| Objective | Target | Rationale |
|-----------|--------|-----------|
| RTO (Recovery Time Objective) | 4 hours | Maximum acceptable downtime before client impact is severe |
| RPO (Recovery Point Objective) | 5 minutes | Supabase PITR WAL replication lag |
| Backup verification frequency | Monthly | `verify-pitr.sh` — confirms 7-day recovery window is active |
| DR drill frequency | Quarterly | Validates recovery procedures work before they are needed |

**RTO Breakdown:**
- Detection: < 5 minutes (Uptime Robot alert)
- Assess and contain: < 30 minutes
- Recovery decision made: < 1 hour
- Database restore (if PITR needed): 2–4 hours (Supabase restore to new project)
- DNS propagation: 5–30 minutes
- Verification: 30 minutes
- Total worst-case: ~6 hours (breach of 4h RTO for extreme scenarios)

---

## 2. INFRASTRUCTURE FAILURE SCENARIOS

### 2.1 API Service Failure (Railway)

**Symptom:** Uptime Robot alert — `/health` non-200. Clients cannot access app.

**Diagnosis:**
```bash
# Step 1: Confirm it's real (not Uptime Robot failure)
curl -I https://api.hostyllo.app/api/v1/health

# Step 2: Check Railway logs for crash loop or OOM
railway logs --service hostyllo-api --tail 50

# Step 3: Check if it's a recent deploy issue
railway logs --service hostyllo-api --since 30m | grep "deploy\|error\|crash"
```

**Recovery:**

| Cause | Fix | Time |
|-------|-----|------|
| OOM crash | Increase Railway memory limit (dashboard) | < 5 min |
| Bad deploy | Railway rollback to previous deploy (one click) | < 2 min |
| Crash loop (code bug) | Fix code → push → Railway auto-deploys | Varies |
| Resource exhaustion | Scale replicas down to 0, then back to 2 | < 5 min |

**Rollback command:**
```bash
# Railway CLI rollback
railway rollback --service hostyllo-api
```

Or via Railway dashboard: Deployments → Previous successful deploy → Redeploy.

---

### 2.2 Database Failure (Supabase)

**Symptom:** `/health` returns `{ "db": "error" }`. API returns 503.

**Diagnosis:**
```bash
# Check Supabase status page
open https://status.supabase.com

# Check DB connectivity from API logs
railway logs --service hostyllo-api --tail 20 | grep "db\|pool\|connection"
```

**Recovery by cause:**

**A — Connection pool exhausted (not a failure, a performance issue):**
```sql
-- From Supabase SQL editor: identify blocking queries
SELECT pid, now() - query_start AS duration, state, left(query, 80) AS query
FROM pg_stat_activity
WHERE state != 'idle' AND query_start < now() - interval '30 seconds'
ORDER BY duration DESC;

-- Kill the blocking queries
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE state != 'idle' AND query_start < now() - interval '2 minutes';
```

**B — Supabase region outage (Mumbai ap-south-1):**

This is a vendor incident. HOSTYLLO has no secondary region configured. The response is to wait, communicate with clients, and execute PITR restore to a different region only if the outage exceeds 4 hours.

```
Timeline:
  0–30 min: Monitor status.supabase.com. Notify clients: "investigating."
  30–120 min: If no ETA from Supabase, begin PITR restore to Singapore (ap-southeast-1).
  120+ min: Restore complete. Update API connection string. Update DNS.
```

**C — Data corruption (bad migration or application bug):**

Use PITR restore. See Section 3.

---

### 2.3 Redis Failure (Upstash)

**Symptom:** `/health` returns `{ "redis": "error" }`. Rate limiting non-functional. Session validation fails.

**Diagnosis:**
```bash
redis-cli -u $UPSTASH_REDIS_URL PING
# Check Upstash dashboard for service status
open https://status.upstash.com
```

**Impact without Redis:**
- Rate limiting disabled (brute force protection down — P0 risk)
- JWT JTI blocklist unavailable (logged-out tokens temporarily reusable — P0 risk)
- Idempotency keys unavailable (payment deduplication broken — P0 risk)
- Session invalidation unavailable

**Immediate response (Redis down > 5 minutes):**
1. Enable Cloudflare Under Attack mode (blocks most bot traffic as rate-limit substitute)
2. Alert: log to audit_log that Redis is down (via direct DB write)
3. Accept degraded operation for < 30 minutes (low risk if already in Cloudflare WAF mode)
4. If > 30 minutes: take API offline (`railway scale --replicas 0`) until Redis restored

**Upstash recovery:** If Upstash itself has a service outage, wait for resolution. If credential issue, rotate `UPSTASH_REDIS_URL` in Railway env vars and restart.

**On Redis restoration:** `FLUSHALL` is NOT executed on routine recovery — only on breach response. Existing keys are valid.

---

### 2.4 Storage Failure (Supabase Storage / S3)

**Symptom:** PDF receipt URLs return 403/404. Photo uploads fail.

**Impact:** Receipts cannot be downloaded. New photos cannot be uploaded. Core payment and student functions still work.

**Response:**
```
1. Confirm it's Supabase Storage (check status.supabase.com).
2. If Supabase Storage is degraded: disable photo upload temporarily (kill switch: csv_import as proxy, or deploy temporary disable).
3. PDF receipts: DLQ will accumulate failed jobs. Users see "Regenerate" button.
4. On restoration: replay DLQ jobs via Super Admin → BullMQ → Retry All in pdf-receipts queue.
```

---

### 2.5 CDN / DNS Failure (Cloudflare)

**Symptom:** `app.hostyllo.app` unreachable from some regions.

**Diagnosis:** Check https://www.cloudflarestatus.com. Test direct Railway URL (bypasses Cloudflare).

**Response:** If Cloudflare is the cause, update DNS to point directly to Railway's provided URL (bypasses Cloudflare, loses WAF protection — acceptable for short-term recovery). Restore Cloudflare when issue is resolved.

---

## 3. POINT-IN-TIME RECOVERY (PITR)

### 3.1 When to Use

- Data corruption from a bad migration
- Accidental mass deletion (even soft-deleted records need to be verified)
- Malicious data modification (post-breach response)
- Data integrity failure discovered after the fact

### 3.2 PITR Procedure

**Prerequisites:** Supabase Pro plan active. `verify-pitr.sh` passed within 30 days.

```
Step 1: Identify the recovery point
  - Check audit_log for the timestamp when corruption started
  - Or check Supabase logs for the failing query
  - Target: the last timestamp before corruption

Step 2: Initiate restore in Supabase Dashboard
  - Supabase Dashboard → Settings → Database → Restore
  - Select "Point in Time Recovery"
  - Enter target timestamp (UTC)
  - Select "Restore to new project" (NOT overwrite — safer)
  - Click Restore. Wait 2–4 hours.

Step 3: Verify the restored project
  - Connect to restored project via psql or Supabase SQL editor
  - Check row counts: SELECT tablename, n_live_tup FROM pg_stat_user_tables;
  - Verify a known correct payment record
  - Run: SELECT COUNT(*) FROM audit_log — should match expectation
  - Test CNIC decryption with ENCRYPTION_KEY (must be same key)
  - Verify RLS is active: SELECT tablename FROM pg_tables WHERE rowsecurity=false

Step 4: Switch API to restored project
  - Railway → hostyllo-api → Variables
  - Update SUPABASE_URL to restored project URL
  - Update SUPABASE_SERVICE_KEY to restored project service key
  - Restart API (Railway auto-restarts on env change)

Step 5: Verify API health
  - curl https://api.hostyllo.app/api/v1/health
  - Confirm { db: "ok", redis: "ok" }
  - Test login with known account
  - Test one payment retrieval

Step 6: Communicate to clients
  - Inform affected hostel owners of data recovery time window
  - Specify what data may have been lost (between corruption time and recovery point)
  - Log full incident in Decision Log

Step 7: Decommission original project
  - Keep original project active for 72 hours (evidence preservation)
  - Delete after 72 hours once recovery is confirmed stable
```

---

## 4. REGION FAILURE

### 4.1 Current Single-Region Architecture

HOSTYLLO Phase 1–5 runs in a single region:
- Supabase: Mumbai (ap-south-1)
- Railway: ap-southeast-1 (Singapore — closest to Mumbai for API)
- Upstash: nearest region to Mumbai

**Known risk:** A Mumbai (ap-south-1) AWS availability zone failure would cause full service outage. This risk is accepted for Phase 1–5 given the infrastructure cost of multi-region.

**Mitigation:** Supabase PITR allows restore to any Supabase-supported region. Recovery to Singapore (ap-southeast-1) is possible within 4–8 hours.

### 4.2 Region Failover Procedure

**Trigger:** Mumbai outage > 2 hours with no Supabase ETA for recovery.

```
Step 1: Initiate PITR restore to Singapore project (see Section 3.2)
  Use last clean backup timestamp (Supabase provides timestamps up to the outage)

Step 2: Create new Railway deployment in ap-southeast-1
  (Railway already in Singapore — confirm region in dashboard)
  Update SUPABASE_URL to Singapore project

Step 3: Update Cloudflare DNS
  Change api.hostyllo.app A record to new Railway URL
  TTL: 60 seconds (confirm this TTL is set in Cloudflare before any incident)

Step 4: Notify clients
  "Service temporarily relocated for recovery. Expect 5–15 minutes of additional loading time."

Step 5: After Mumbai restoration
  When Supabase Mumbai recovers, data written during Singapore operation must be migrated back
  OR: continue on Singapore permanently (acceptable long-term)
```

### 4.3 Multi-Region Readiness Trigger

Invest in proper multi-region architecture when:
- MRR > PKR 1,000,000/month AND
- Uptime SLO commitment to enterprise clients is 99.9% or above

---

## 5. VENDOR FAILURE SCENARIOS

### 5.1 Paymob Outage

**Impact:** Subscription billing automation halted. No new payments processed via Paymob.

**Response:**
1. Enable manual billing mode (Rule R-07): accept payment screenshots via WhatsApp, activate accounts manually.
2. Kill switch: `billing_sync` (prevents billing-sync BullMQ jobs from accumulating errors).
3. Notify clients: "Online billing temporarily unavailable. Contact us to arrange payment."
4. Retry automatically when Paymob is restored (BullMQ retry).

---

### 5.2 360dialog (WhatsApp) Outage or Suspension

**Impact:** WhatsApp automation halted. Receipts and reminders not delivered via WhatsApp.

**Response:**
1. Kill switches: `whatsapp_blast`, `whatsapp_receipt`
2. Copy-paste fallback activates automatically for receipt sends (PRD FR-WA-01 fallback)
3. Manual blast: export defaulters list, send individually via WhatsApp
4. Notify clients: "WhatsApp automation temporarily offline. Receipts available as PDF download."

**If 360dialog account suspended (policy violation):**
- Registered fallback: Safepay (registered, pending document verification as of June 2026)
- WhatsApp BSP migration timeline: 1–2 weeks (new WABA setup)

---

### 5.3 Resend (Email) Outage

**Impact:** Password reset emails, subscription invoices, onboarding emails not delivered.

**Response:**
1. Password reset: provide OTP via WhatsApp as fallback (Super Admin can relay)
2. Transactional emails: queue in BullMQ (`email-send`) — auto-retry when Resend restores
3. Duration < 30 minutes: no action needed (BullMQ retry covers it)
4. Duration > 2 hours: consider Resend alternative (Postmark, AWS SES) — update `EMAIL_PROVIDER` env var

---

### 5.4 Railway Outage

**Impact:** Full API outage. All client operations blocked.

**Response:**
1. Check Railway status: https://status.railway.app
2. If Railway is the issue: wait for restoration (cannot migrate API in < 4 hours)
3. Notify clients via WhatsApp
4. Long-term mitigation (Phase 6+): evaluate Fly.io or AWS App Runner as secondary compute

---

### 5.5 Vercel Outage

**Impact:** Frontend (`app.hostyllo.app`) unavailable. API still functional.

**Response:**
1. Check Vercel status: https://www.vercel-status.com
2. Wait for Vercel restoration
3. If > 4 hours: deploy Next.js to Railway as emergency static fallback (pre-built export)

---

## 6. SECURITY BREACH RESPONSE

Security breach response is fully defined in `03_SECURITY_ARCHITECTURE.md` Section 7.

Summary for cross-reference:

| Step | Action | Target Time |
|------|--------|-------------|
| 1 | Contain: Railway → 0 replicas, revoke Supabase service key, Redis FLUSHALL | < 15 min |
| 2 | Assess: audit_log review, determine scope | < 1 hour |
| 3 | Notify: hostel owners + PTA (PDPA 72h) | < 24h (hostel owners), < 72h (PTA) |
| 4 | Remediate: fix vulnerability, rotate ALL secrets | < 4 hours |
| 5 | Restore: staging verify → production restore | < 2 hours |
| 6 | Post-mortem: full write-up, new controls | < 48 hours |

---

## 7. BACKUP ARCHITECTURE

### 7.1 Database Backups

| Type | Frequency | Retention | Managed By |
|------|-----------|-----------|------------|
| PITR (WAL streaming) | Continuous | 7 days | Supabase Pro |
| Daily snapshot | Daily 02:00 UTC | 7 days | Supabase Pro |

**Verification:** `scripts/verify-pitr.sh` runs monthly. Script exits 1 if PITR is not active — blocks the DR drill checklist.

### 7.2 File Backups (Supabase Storage)

Student photos and PDF receipts stored in Supabase Storage (S3-backed) are NOT included in PITR. They are backed up by AWS S3's built-in 99.999999999% durability guarantee (11 nines). No additional backup required.

Export ZIPs generated for tenant offboarding are stored with 28-day S3 lifecycle expiry.

### 7.3 Secrets Backup

All secrets stored in Railway environment variables and Vercel environment variables. These are the canonical source. No secrets are stored in code, git, or external vaults in Phase 1–5.

**Procedure if Railway account is compromised:**
1. Revoke all secrets immediately (Supabase service key, Paymob key, etc.)
2. Regenerate Railway access token
3. Re-enter all secrets into new Railway project
4. Update Cloudflare DNS to new Railway deployment URL

---

## 8. QUARTERLY DR DRILL CHECKLIST

Run on 1st of each quarter. Takes approximately 2 hours. Log results in `tasks/decision-log.md`.

```
QUARTERLY DR DRILL — [DATE]

[ ] 1. Run verify-pitr.sh → confirm exit 0
       ./scripts/verify-pitr.sh

[ ] 2. PITR restore to test project
       - Supabase Dashboard → Settings → Database → Restore
       - Select point-in-time: 24 hours ago
       - Restore to new project named: hostyllo-dr-test-[date]
       - Wait for completion (30–90 minutes)

[ ] 3. Verify restored project
       - Check row counts match production snapshot
       - Verify payment formula on a known record
       - Verify CNIC decryption works (test ENCRYPTION_KEY)
       - Verify RLS active: 0 rows returned from
         SELECT tablename FROM pg_tables WHERE rowsecurity=false

[ ] 4. Test kill switch
       - Set feature_kill:pdf_receipts = 1 in production Redis
       - Verify /api/v1/payments/{id}/send-receipt returns graceful response
       - Remove kill switch
       - Verify receipts work again

[ ] 5. Test rollback
       - Make a trivial code change (add a log statement)
       - Deploy to production
       - Railway CLI: railway rollback
       - Verify previous version is running

[ ] 6. Check alert channels
       - Confirm Uptime Robot still sends SMS to correct number
       - Confirm Sentry still sends email to correct address
       - Confirm Upstash Redis alert email is current

[ ] 7. Review secrets rotation schedule
       - JWT RS256 keypair: last rotated [date] — next rotation due [date + 12 months]
       - ENCRYPTION_KEY: rotation required only on compromise (not scheduled)

[ ] 8. Delete test project
       - Supabase Dashboard → hostyllo-dr-test → Settings → Delete Project

[ ] 9. Log results
       - In tasks/decision-log.md: {date, all steps passed Y/N, issues found, resolved Y/N}
```

---

## 9. CLIENT COMMUNICATION TEMPLATES

### Planned Maintenance

```
WhatsApp message to all active clients (send 24h before window):

"HOSTYLLO Maintenance Notice

We will perform scheduled maintenance on [DATE] from [TIME] to [TIME] (PKT).

During this window, the system will be temporarily unavailable.

Your data is safe. No action required.

Apologies for the inconvenience.
— HOSTYLLO Team"
```

### Unplanned Outage

```
Initial notification (send within 15 minutes of confirmed outage):

"HOSTYLLO is currently experiencing technical issues.
Our team is working to restore service.
Expected resolution: [TIME] or 'under investigation'.
Your data is safe. We will update you in [30] minutes.
— HOSTYLLO Team"

Update (every 30 minutes until resolved):

"Update: [Current status]. Still investigating / Resolution in progress.
Next update in 30 minutes."

Resolution:

"HOSTYLLO is fully restored as of [TIME].
[Brief cause if shareable: 'A database connection issue was resolved.']
Thank you for your patience.
— HOSTYLLO Team"
```

---

*HOSTYLLO Business Continuity v1.0 · June 2026 · Traceable to PRD v15.0 Sections 19 and 43*
*DR Drill: Quarterly. Last drill: Not yet performed. Next drill: Before Phase 1 first client.*
