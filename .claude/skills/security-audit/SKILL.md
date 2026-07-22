---
name: security-audit
description: Run a HOSTYLLO security audit of a module or the whole API against the 34 mapped risks and 6 invariants. Use before merging auth/payment/tenant-data changes, before a release, or when asked to check security. Produces severity-ranked findings with exploit + fix.
---

# Security Audit

Audit as an attacker would. Delegate to the `security` agent for deep passes. Read code; trace requests.

## Steps
1. Scope the audit (module, route group, or full API). Note the PRD risk IDs in play.
2. Run the grep sweep (below) to find candidate violations, then confirm each by reading the code.
3. Trace at least one request end-to-end through auth → tenant scoping → DB.
4. Report findings: **Critical / High / Medium / Low**, each with `file:line`, the exploit, the
   risk/invariant ID, and the fix. List what you verified as SAFE too.

## Grep sweep
- Raw DB access outside a tenant wrapper: `db.query|pool.query` not inside `withTenant`.
- Tenant injection: `hostel_id` read from `body`/`params`/`query`.
- Weak JWT: `HS256`, or `jwtVerify` without an explicit `algorithms` array.
- Money as FLOAT in migrations.
- PII leakage: CNIC/phone/email/token in `logger`/`console`/`Sentry` calls.
- Missing `additionalProperties: false` on Fastify schemas (mass assignment).
- Webhook handlers without `timingSafeEqual` HMAC verification (Phase 4).

## Focus areas (PRD Section 19)
Tenant isolation (404 not 403), auth (RS256/bcrypt/TOTP/rate-limit/account-enumeration), CNIC AES-256
+ masking, audit_log immutability, CSV formula injection, file-upload validation, security headers.

## Known standing issues to confirm/track
- Payment routes missing `audit_log` writes (INVARIANT-5).
- CNIC key-rotation runbook absent (CRIT-05). PITR-before-prod-data (INVARIANT-6).
