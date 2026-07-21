# 08_AUDIT_COMPLIANCE.md
## HOSTYLLO — Audit & Compliance
### v1.0 · June 2026 · Traceable to PRD v15.0 Sections 19, 34

---

## SCOPE

This document defines HOSTYLLO's compliance posture against Pakistan PDPA 2023, data retention obligations, audit logging architecture, privacy rights handling, and the roadmap to SOC2 readiness. It is the reference for legal, compliance, and enterprise client reviews.

---

## 1. REGULATORY CONTEXT

### 1.1 Applicable Law

**Primary:** Pakistan Personal Data Protection Act 2023 (PDPA 2023)

HOSTYLLO processes personal data (student CNIC, name, phone, payment history) on behalf of hostel owners. The legal relationships are:

- **Data Controller:** Hostel owner (decides what data to collect and why)
- **Data Processor:** HOSTYLLO / Zeerak Hostix (processes data under controller instruction)
- **Data Subjects:** Students residing in the hostel

As a data processor, HOSTYLLO's obligations under PDPA 2023 are:
- Process data only under documented instruction from the controller (DPA)
- Implement appropriate technical and organisational security measures
- Notify the controller of a personal data breach within 72 hours of discovery
- Assist the controller in responding to data subject rights requests
- Delete or return data at the end of the processing relationship
- Maintain records of processing activities

### 1.2 Regulatory Contact

Pakistan Telecommunication Authority (PTA) administers PDPA 2023.
- Breach notification: dpa@pta.gov.pk
- Required timeline: 72 hours from discovery of a breach involving PII

### 1.3 Applicable Data Types

| Data Category | Examples | PDPA Sensitivity | Where Stored |
|---------------|----------|-----------------|--------------|
| Identity | Full name, father name | Standard PII | `students.full_name`, `students.father_name` |
| National ID | CNIC number | Sensitive PII | `students.cnic_encrypted` (AES-256) |
| Contact | Phone, emergency contact, email | Standard PII | `students` table |
| Financial | Payment amounts, dates, methods | Financial PII | `payments` table |
| Location | Home address, city | Standard PII | `students.address` |
| Biometric proxy | Student photo | Sensitive PII | Supabase Storage (private bucket) |
| Account | Email, password hash | Credential data | `users` table |

---

## 2. AUDIT LOGGING

### 2.1 Architecture

The `audit_log` table is the system of record for all significant actions. It is:
- **INSERT-ONLY:** A database trigger (`audit_log_immutable`) raises an exception on any UPDATE or DELETE. This cannot be bypassed at the application level.
- **Hash-chained:** Each entry's `entry_hash` is a SHA-256 of its own content. The `prev_hash` field contains the hash of the previous entry, creating a tamper-evident chain.
- **Tenant-scoped:** All tenant entries carry `hostel_id`. Platform-level events (super admin actions affecting no tenant) carry `hostel_id = NULL`.

### 2.2 What Is Logged

| Action Category | Trigger | Fields Captured |
|-----------------|---------|-----------------|
| `student_created` | POST /students | `new_values`: name, cnic masked, room, rent |
| `student_updated` | PATCH /students/:id | `old_values`, `new_values` (diff only) |
| `student_deleted` | DELETE /students/:id | `old_values`: name, status |
| `cnic_revealed` | GET /students/:id/reveal-cnic | `cnic_revealed: true`, actor, IP |
| `payment_created` | POST /payments | `new_values`: amounts, month, method |
| `payment_updated` | PATCH /payments/:id | `old_values`, `new_values` |
| `payment_voided` | void-confirm | `old_values`, `new_values` |
| `user_login` | POST /auth/login | IP, user_agent, timestamp |
| `user_login_failed` | POST /auth/login (fail) | IP, attempted email (hashed) |
| `user_created` | POST /users | role, email |
| `user_deleted` | DELETE /users/:id | role, email |
| `room_shift` | POST /rooms/shift | from/to room, old/new rent |
| `expense_created` | POST /expenses | category, amount |
| `expense_deleted` | DELETE /expenses/:id | category, amount |
| `tenant_suspended` | Admin action | reason, actor |
| `tenant_reactivated` | Admin action | actor |
| `impersonation_start` | Super Admin impersonate | `impersonated_by`, target hostel |
| `impersonation_end` | Exit impersonation | duration |
| `data_export_requested` | Settings → export | actor, timestamp |
| `pii_purge_executed` | AUTO-11 | student count affected |
| `subscription_activated` | Plan change | plan, amount |
| `subscription_cancelled` | Cancellation | reason |

### 2.3 What Is Never Logged

- `cnic_encrypted` value (raw or decrypted) — never in `old_values` or `new_values`
- `password_hash` — never logged
- `totp_secret_enc` — never logged
- Any field matching: `password`, `secret`, `key`, `token` — blocked by Sentry filter and Pino redact config

### 2.4 Audit Log Retention

Audit log entries are retained for a minimum of **7 years**. This is not configurable and cannot be overridden by tenant cancellation or deletion. When a tenant is deleted:
- Student PII is purged (Day 31)
- Payment and financial records are anonymised
- `audit_log` entries for that `hostel_id` are **retained** with `hostel_id` intact for the 7-year minimum

Rationale: Financial and access records must survive the tenant relationship for legal and dispute resolution purposes.

---

## 3. DATA RETENTION POLICY

| Data Type | Retention Period | What Happens After |
|-----------|-----------------|-------------------|
| Active tenant operational data | Indefinite while subscribed | Normal access |
| Student PII (name, CNIC, phone) | 31 days after subscription ends | AUTO-11 purge job |
| Payment amounts and dates | 7 years | Retained even after PII purge |
| Audit log | 7 years minimum | Never deleted |
| PDF receipts (Supabase Storage) | 7 years | Deleted after 7 years |
| Tenant exports (S3) | 28 days from generation | Auto-expired by S3 lifecycle rule |
| Failed login records | 30 days | Rolling deletion from Redis |
| Idempotency keys | 24 hours | Redis TTL auto-expires |
| Session JTI blocklist | Per-token TTL | Redis TTL auto-expires |
| Unverified accounts (no email click) | 72 hours | Auto-deleted |
| Trial accounts (EXPIRED, no payment) | 3 days after trial ends | Auto-deleted |

---

## 4. PRIVACY REQUIREMENTS

### 4.1 Privacy Policy Requirements

The privacy policy at `hostyllo.app/privacy` must be live before Phase 3 self-serve signup is enabled.

Required clauses (per PRD v15.0 Section 34):

| Clause | Minimum Required Content |
|--------|--------------------------|
| Data collected | Student names, CNIC, phone, emergency contact, payment records, photos |
| CNIC protection | CNIC encrypted with AES-256. HOSTYLLO staff cannot read CNIC values. |
| Data residency | Servers located in Mumbai, India (AWS ap-south-1) |
| Retention | Data available for export 28 days after deletion. PII deleted Day 31. Financial aggregates retained 7 years. |
| Data subject rights | Right to export, right to deletion, right to correction |
| Super Admin access | Platform administrators may access data for support. All access logged. |
| Sub-processors | Supabase, Railway, Upstash, Resend, 360dialog, Paymob |
| Contact | privacy@hostyllo.app |
| Material change notice | 30-day email notice before material policy changes |

**Gate:** This document must be reviewed by a Pakistani lawyer before Phase 3 launch. Estimated cost: PKR 20,000–50,000.

### 4.2 Data Processing Agreement (DPA)

A signed DPA is required from every paying client before any student PII is uploaded.

Required DPA clauses (per PRD v15.0 Section 34):

| Clause | Content |
|--------|---------|
| Parties | HOSTYLLO (processor) and [Hostel Name] (controller) |
| Purpose | Student data processing for hostel management only |
| Data types | Name, CNIC, phone, emergency contact, payment history, room assignment |
| Sub-processors | Supabase (Mumbai), Railway, Upstash, Resend, 360dialog, Paymob |
| Data residency | Mumbai (ap-south-1). Controller consents by signing. |
| Security measures | AES-256 CNIC encryption, PostgreSQL RLS, PITR backup, TLS in transit |
| Breach notification | HOSTYLLO notifies controller within 72 hours of breach discovery |
| Deletion | Export available 28 days after termination. PII deleted Day 31. |
| Controller obligations | Controller obtains student consent under PDPA 2023 |
| Governing law | Laws of Pakistan. Disputes in courts of [founder's city]. |

**Template file:** `docs/legal/DPA_template.md` — must be created before first paying client.

**Process:** DPA sent with subscription confirmation email. Signed copy (PDF scan) retained. Receipt date logged in Super Admin tenant detail.

---

## 5. DATA SUBJECT RIGHTS

### 5.1 Right to Access (Export)

**Who can request:** The hostel owner (data controller). Students direct requests to the hostel owner, who is responsible for fulfilling them.

**HOSTYLLO's role:** Provide the hostel owner with a data export containing all student data via Settings → Data Management → Download All Data.

**Response time commitment:** Export generated within 2 hours of request (typically < 5 minutes via BullMQ).

### 5.2 Right to Deletion

**Who can request:** Hostel owner on behalf of a student, or via direct request to privacy@hostyllo.app.

**Process:**
1. Hostel owner soft-deletes student record (`DELETE /students/:id`)
2. For complete erasure (right to be forgotten): hostel owner submits request to privacy@hostyllo.app
3. HOSTYLLO manually purges that student's PII within 30 days
4. Audit log entry created: `pii_purge_requested`, `pii_purge_executed`
5. Confirmation email sent to requester

**What is retained after deletion:** Anonymised payment amounts for accounting integrity. Audit log entries (cannot be deleted — 7-year retention).

### 5.3 Right to Correction

**Process:** Hostel owner edits student record via PATCH /students/:id. All changes logged to audit_log with old and new values.

### 5.4 Breach Notification Obligation

**Timeline:** HOSTYLLO must notify:
1. Affected hostel owners (data controllers): within 24 hours of discovery
2. PTA (dpa@pta.gov.pk): within 72 hours of discovery (PDPA obligation)

**Notification must include:** Nature of breach, data categories affected, approximate number of data subjects affected, likely consequences, measures taken or proposed.

See `03_SECURITY_ARCHITECTURE.md` Section 7.3 for full incident response procedure.

---

## 6. GDPR READINESS

HOSTYLLO does not currently target the EU market and is not subject to GDPR. This section records the gap for future reference when EU expansion is considered.

**If EU expansion occurs, the following GDPR gaps must be addressed:**

| Gap | GDPR Requirement | Current State |
|-----|-----------------|--------------|
| Data residency | EU data may need to stay in EU | Currently Mumbai (ap-south-1) |
| Legal basis documentation | Must document lawful basis per processing activity | Not documented |
| DPA adequacy | SCCs required for data transfers out of EU | DPA is Pakistan-law-only |
| Right to portability (machine-readable) | Must export in structured, machine-readable format | CSV export exists |
| Consent records | Must log when and how consent was obtained | Not implemented |
| Privacy impact assessment | Required for high-risk processing (CNIC = biometric proxy) | Not done |
| 72-hour notification | Same as PDPA — already in incident response | Compliant |

**Decision:** EU expansion is out of scope until Phase 8. Revisit when EU clients appear in pipeline.

---

## 7. COMPLIANCE GAPS (CURRENT STATE)

Ordered by severity:

| Gap | Severity | Required By | Status |
|-----|----------|-------------|--------|
| DPA template not created | CRITICAL | Phase 1 first paying client | Not done |
| Privacy policy not live | CRITICAL | Phase 3 self-serve signup | Not done |
| No Pakistani lawyer review of privacy policy | HIGH | Phase 3 | Not done |
| CNIC key rotation runbook not written | HIGH | Phase 1 | Not done |
| PII purge automation (AUTO-11) not built | HIGH | Phase 4 | Not built |
| Data export automation not built | HIGH | Phase 3 | Not built |
| Signed DPA log in Super Admin not implemented | MEDIUM | Phase 1 | Not done |
| Audit log hash chain verification script not written | MEDIUM | Phase 3 | Not done |
| Sub-processor list not kept current | MEDIUM | Ongoing | Not done |

---

## 8. SOC2 READINESS ROADMAP

HOSTYLLO is not SOC2 compliant and will not be until Phase 8 at the earliest. This section records what SOC2 would require, to guide architecture decisions that reduce future compliance cost.

### 8.1 SOC2 Trust Service Criteria vs Current State

| Criterion | Description | Current State | Gap |
|-----------|-------------|--------------|-----|
| CC6.1 | Logical access controls | JWT RS256, RBAC, RLS | Documented but not audited |
| CC6.2 | Prior to issuing credentials | Account verification via email | Weak — email only, no identity verification |
| CC6.3 | Removes access when no longer needed | Soft delete, role removal | Implemented in design |
| CC6.6 | Restricts access to assets | RLS, RBAC | Implemented in design |
| CC7.1 | Detects and monitors for vulnerabilities | npm audit, Dependabot | Not active yet |
| CC7.2 | Evaluates system components for vulnerabilities | Penetration testing | Never done |
| CC8.1 | Controls changes to infrastructure | CI/CD pipeline | Not implemented |
| CC9.1 | Identifies risks | Risk register (PRD Section 19) | Documented |
| A1.1 | Maintains commitments re: availability | SLO 99.5%, Uptime Robot | Not active |
| A1.2 | Recovery from environmental failures | PITR, DR runbook | Documented, not tested |
| C1.1 | Identifies confidential information | PII classification above | Documented |
| C1.2 | Disposes of confidential information | AUTO-11 purge | Not implemented |
| PI1.1 | Accurate processing of personal information | Payment formula tests | 14 tests defined, not written |
| P1.0 | Privacy notice | Privacy policy | Not live |
| P4.0 | Collection limited to what is necessary | CNIC required for ID only | Justified in PRD |
| P6.0 | Retains personal information only as necessary | 31-day PII purge | Not implemented |
| P8.0 | Processes requests from individuals | Rights handling above | Not implemented |

### 8.2 SOC2 Preparation Trigger

Do not begin SOC2 preparation until:
- MRR > PKR 500,000/month AND
- At least one enterprise client requiring SOC2 is in pipeline

Estimated cost of first SOC2 Type 1 audit: USD 15,000–30,000. Not viable as a solo founder before the above trigger.

### 8.3 Architecture Decisions That Reduce Future SOC2 Cost

These decisions, already made in PRD v15.0, reduce future SOC2 work:
- Immutable audit log with hash chain (maps to CC7.x)
- RLS as database-level access control (maps to CC6.x)
- Role-based access with DB-level enforcement (maps to CC6.x)
- Automated PII purge at defined intervals (maps to P6.x)
- PITR backup with verification script (maps to A1.x)
- Payment formula unit tests (maps to PI1.x)

---

*HOSTYLLO Audit & Compliance v1.0 · June 2026 · Traceable to PRD v15.0 Sections 19 and 34*
*Review: Before Phase 3 launch. Update: After any regulatory change or incident.*
