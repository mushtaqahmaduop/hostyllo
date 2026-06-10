# 03_SECURITY_ARCHITECTURE.md
## HOSTYLLO — Security Architecture
### v1.0 · June 2026 · Traceable to PRD v15.0 Section 19

---

## SCOPE

This document is the standalone security reference for HOSTYLLO. It covers every security control, threat model, and response procedure. It is reviewed before every major deployment and updated after every security incident.

**Authority:** PRD v15.0 Section 19 is the source of the 34 risk controls. This document expands those controls into reviewable architecture.

---

## 1. SECURITY PRINCIPLES

### 1.1 Zero Trust

HOSTYLLO trusts no request by default. Every request must prove identity. Every database query must prove tenant context. No component assumes another component has already validated input.

Concrete implementations:
- Every API route executes the full middleware stack (rate-limit → JWT verify → role from DB → tenant check) regardless of which component called it.
- The API does not trust the frontend. The frontend does not trust the API response without schema validation.
- The database does not trust the application layer. RLS policies enforce isolation at the database level independent of what the API does.
- Super Admin impersonation is logged to `audit_log` at the database level, not just application logs — even if the application is compromised, the database record exists.

### 1.2 Least Privilege

Each role has the minimum permissions required for its function. Permissions are never escalated at runtime unless explicitly authorized.

- `warden` role: cannot access Settings, cannot delete records unless `can_delete=true` in DB.
- `hostel_owner` role: cannot access other tenants' data under any circumstance.
- `super_admin` role: access to all tenants, but every access is logged.
- API keys (Phase 6): scoped to specific endpoints, never to full API access.
- Supabase service key: used only in server-side contexts (BullMQ workers, admin panel). Never exposed to frontend.
- Database connection string: used only in Fastify API process. Never in Next.js frontend.

### 1.3 Defense in Depth

Security controls exist at multiple layers. Bypassing one layer does not grant access.

```
Layer 1: Cloudflare WAF — blocks known attack patterns, DDoS, malicious IPs
Layer 2: Rate limiting — Redis-backed per-IP throttling
Layer 3: Fastify schema validation — rejects malformed requests before route handler
Layer 4: JWT verification — RS256, jti blocklist, algorithm pinning
Layer 5: Role enforcement — role fetched from DB, never trusted from JWT
Layer 6: PostgreSQL RLS — tenant isolation enforced at database level
Layer 7: Application-level checks — hostel_id always from JWT, never from request
```

Any single layer can fail and the remaining layers prevent exploitation.

---

## 2. THREAT MODEL

### 2.1 External Threats

| Threat | Vector | Control |
|--------|--------|---------|
| Credential stuffing | Login endpoint | Rate limit: 10 attempts/15min/IP (Redis) + Cloudflare Turnstile CAPTCHA |
| Brute force password | Login endpoint | bcrypt cost factor ≥ 12 (makes each attempt slow) + rate limit |
| DDoS | All endpoints | Cloudflare WAF + `@fastify/rate-limit` |
| SQL injection | Any input field | Parameterized queries only — no string interpolation in SQL |
| XSS stored | Student names, notes | React auto-escaping + HTML escape in PDF generator |
| XSS reflected | Query parameters | Fastify schema validation strips unexpected params |
| CSRF | State-changing requests | SameSite=Strict on auth cookies + CSRF token for form submissions |
| SSRF | Outbound HTTP requests | Allowlist validation + RFC1918 block on all outbound URLs |
| Path traversal | File uploads | Files renamed to `{uuid}.ext` before storage, never user-controlled paths |
| CSV formula injection | CSV import | Strip `= + - @` from first char of every cell before processing |
| ReDoS | Regex in search | No catastrophic backtracking patterns; pg_trgm used for search |

### 2.2 Internal Threats

| Threat | Vector | Control |
|--------|--------|---------|
| Secrets in git | Developer error | `git log -p \| grep -iE "key\|secret\|password"` in CI — blocks merge if found |
| Secrets in logs | Pino logging | Sentry filter blocks `SECRET\|KEY\|PASSWORD\|TOKEN` patterns |
| Hardcoded credentials | Code review | Custom ESLint rules + pre-commit hooks |
| Dependency CVE | npm packages | `npm audit` in CI; Dependabot enabled |
| Mass assignment | API body | `additionalProperties: false` on ALL Fastify JSON schemas |
| CNIC in plaintext | Database | ESLint rule blocks creation of any column named `cnic` that is not `cnic_encrypted` |

### 2.3 Tenant Threats (Cross-Tenant)

The primary multi-tenant risk: Tenant A accessing Tenant B's data.

| Threat | Vector | Control |
|--------|--------|---------|
| IDOR via URL manipulation | `GET /students/:id` with another tenant's ID | RLS returns empty (not 403, returns 404 to prevent enumeration) |
| hostel_id injection via request body | `POST /students` with crafted body | `hostel_id` always sourced from `req.hostelId` (JWT), request body `hostel_id` ignored |
| RLS disabled table | Database migration without RLS | CI check: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false` fails build |
| Redis key collision | Cache operations | All cache keys: `cache:{hostelId}:{resource}:{id}` — hostelId prefix mandatory |
| JWT reuse across tenants | Token theft | `hostelId` in JWT is immutable; switching tenants requires new login |
| withTenant bypass | Raw DB query | ESLint rule `hostyllo/no-raw-db-query` blocks any direct pool.query() outside withTenant() |

### 2.4 Credential Theft

| Threat | Control |
|--------|---------|
| JWT access token theft | 15-minute expiry limits blast radius. Stolen token expires before significant damage. |
| JWT refresh token theft | httpOnly cookie (not accessible to JavaScript), SameSite=Strict, Secure flag, 7-day rolling rotation |
| ENCRYPTION_KEY theft | Stored only in Railway env vars (never in code or .env file in git). Key rotation runbook required. |
| SUPABASE_SERVICE_KEY theft | Immediately revocable in Supabase dashboard. Step 1 of breach response. |
| Compromised Railway env vars | If Railway credentials are compromised, attacker gets env vars. Mitigation: 2FA on Railway account. |

### 2.5 Insider Threats

HOSTYLLO is a solo operation. Insider threat is the founder.

| Threat | Control |
|--------|---------|
| Founder accessing tenant data directly | All Super Admin access via `audit_log` (INSERT-only, hash chain). Cannot be silently deleted. |
| Founder bypassing RLS with service key | Impersonation logged to audit_log with `impersonated_by` field even when using service key. |
| Accidental deletion | Soft delete on all records. `deleted_at IS NOT NULL` rows visible in admin, restorable. |

### 2.6 Data Exfiltration

| Threat | Control |
|--------|---------|
| Bulk export by unauthorized user | Export endpoint restricted to `hostel_owner` role only (RBAC). |
| Scraping via pagination | Rate limits on list endpoints. Max 100 rows per page. |
| CNIC mass extraction | CNIC never returned in API responses (always `masked_cnic`). Reveal endpoint requires explicit action + audit log entry. |
| Database backup access | Supabase backups stored in private S3. Access requires Supabase credentials. |
| PDF receipts in public bucket | Receipts stored in PRIVATE Supabase Storage bucket. Accessed via signed URLs with 24h expiry. |

### 2.7 API Abuse

| Threat | Control |
|--------|---------|
| Payment replay | Idempotency key required on `POST /payments`. Stored in Redis 24h. Duplicate key returns cached response. |
| Webhook replay | Processed webhook IDs stored in Redis 48h TTL. Duplicate rejected. |
| Webhook forgery | Paymob HMAC-SHA512 verified with `crypto.timingSafeEqual()`. |
| Denial of service via large upload | File uploads: max 2MB enforced at Fastify level before processing. |
| Account enumeration | Login endpoint returns identical error message and identical response time for wrong email vs wrong password. |

---

## 3. AUTHENTICATION

### 3.1 JWT Architecture

**Algorithm:** RS256 (asymmetric) — mandatory. HS256 is rejected.

Reason: HS256 shares the signing key between issuer and verifier. If the verifier is compromised, the attacker can forge tokens. RS256 separates the private signing key (Railway API) from the public verification key (Next.js frontend, admin panel). The verifier cannot forge tokens.

```typescript
// CORRECT — enforced in CI via test
const payload = await jose.jwtVerify(token, publicKey, {
  algorithms: ['RS256'], // PIN THIS — do not use ['RS256', 'HS256']
});

// WRONG — algorithm confusion attack possible
const payload = jwt.verify(token, process.env.JWT_SECRET); // never
```

**Access token:** 15 minutes. Contains: `sub` (user ID), `hostelId`, `iat`, `exp`, `jti` (unique token ID).
**Refresh token:** 7 days, rolling rotation. Stored as httpOnly SameSite=Strict Secure cookie.
**Role:** NOT in JWT. Fetched from database on every request.

### 3.2 MFA — TOTP

- **Mandatory for:** `super_admin` role.
- **Optional for:** `hostel_owner` role (strongly recommended, shown during onboarding).
- **Not applicable to:** `warden`, `viewer` (these roles operate under the owner's security posture).

TOTP secrets stored as `totp_secret_enc` — AES-256 encrypted. Never stored plaintext. Never logged.

TOTP flow:
```
1. User logs in with email + password
2. If totp_enabled=true: access token NOT issued yet
3. Server returns: { requiresMfa: true, mfaToken: <short-lived-single-use-token> }
4. Client prompts for TOTP code
5. POST /auth/totp/verify with mfaToken + code
6. Server verifies TOTP, then issues access token + refresh cookie
```

### 3.3 Password Policies

- Minimum 8 characters (enforced at Fastify schema level, not just frontend)
- bcrypt cost factor: **12 rounds minimum** (verified in CI integration test)
- Password reset: 6-digit numeric OTP, 10-minute expiry, maximum 5 attempts before token invalidated
- Account enumeration prevention: identical response for "email not found" and "password incorrect"
- Session invalidation on password change: all existing JTIs added to blocklist

### 3.4 Session Management

- Access token stored in memory (never localStorage, never sessionStorage)
- Refresh token stored in httpOnly cookie
- Token rotation on every refresh (old refresh token immediately invalidated via jti blocklist)
- `jti` blocklist stored in Redis with TTL matching token expiry
- Logout: both tokens invalidated immediately
- Session fixation prevented: new jti generated on every token issuance

### 3.5 Device Management

Phase 1: No multi-device session management. All sessions from a single account share the same refresh token chain.

Phase 6 consideration: Per-device session tracking (device fingerprint stored per session, revocable from account settings). Not in scope until Phase 6.

---

## 4. AUTHORIZATION

### 4.1 RBAC Model

```
super_admin
  └── has access to all tenants
  └── impersonation logged to audit_log
  └── access from admin.hostyllo.app only
  └── TOTP mandatory
  └── IP whitelist (ADMIN_ALLOWED_IPS env var)

hostel_owner
  └── has access to own tenant only
  └── full feature access within tenant
  └── manages wardens, billing, exports

chain_manager
  └── cross-branch read access (chain owner grants)
  └── no billing access
  └── no warden management

warden
  └── daily operations access
  └── limited by per-warden flags:
      - can_delete (default: true)
      - can_settings (default: false)
      - can_edit (default: true)
  └── cannot edit own payment records (void-request only)

viewer
  └── read-only access
  └── reports, student list, room list
  └── no write operations
```

### 4.2 Permission Hierarchy

Role is fetched from DB on **every request**. The `users` table is the source of truth. JWT payload role field is ignored for authorization decisions.

```typescript
// CORRECT
const user = await db.query('SELECT role, can_delete, can_settings, can_edit FROM users WHERE id = $1', [req.sub]);
req.role = user.role;
req.canDelete = user.can_delete;

// WRONG — never trust JWT payload for role
req.role = req.jwtPayload.role; // never
```

### 4.3 Resource Ownership

The `hostel_id` field on every record is the ownership boundary.

- Records are never accessible across `hostel_id` boundaries (enforced by RLS).
- `hostel_id` is set on record creation from `req.hostelId` (sourced from JWT).
- `hostel_id` cannot be updated after creation (no migration between tenants at record level).
- `hostel_id` is never accepted from the request body, query parameters, or URL parameters.

---

## 5. APPLICATION SECURITY

### 5.1 XSS

- React: JSX auto-escaping prevents XSS in rendered content.
- PDF receipts: All user data HTML-escaped before insertion into receipt template. `buildReceiptHTML()` uses `escapeHtml()` on every user-controlled field.
- Rich text: No rich text input accepted anywhere. All text fields are plaintext.
- CSP header: `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'`

### 5.2 CSRF

- SameSite=Strict cookie prevents cross-site request forgery for cookie-based auth.
- State-changing API endpoints require `Authorization: Bearer <token>` header — not achievable from a cross-site context.
- No form submissions to external URLs.

### 5.3 SSRF

- Outbound HTTP requests: validated against allowlist before execution.
- Allowlist: `360dialog.com`, `api.paymob.com`, `resend.com` — all others rejected.
- RFC1918 addresses (`10.x.x.x`, `172.16.x.x`, `192.168.x.x`, `127.x.x.x`) blocked in outbound request validator.

### 5.4 SQL Injection

- All database queries use parameterized statements. No string interpolation in SQL.
- Fastify schema validation with `additionalProperties: false` prevents unexpected fields from reaching queries.
- Custom ESLint rule flags any template literal containing SQL keywords outside of designated query files.

### 5.5 File Upload Security

- MIME type checked at application level AND magic bytes verified (first bytes of file).
- Student photos: MIME must be `image/jpeg` or `image/png`. Magic bytes must match.
- File renamed to `{uuid}.ext` before storage. Original filename discarded.
- Max file size: 2MB enforced at Fastify request level (before processing).
- Photos resized to 200×200px before storage (removes EXIF data, normalizes format).
- Storage bucket: PRIVATE. No direct URL access. Only signed URLs with 24h expiry.

---

## 6. INFRASTRUCTURE SECURITY

### 6.1 Secrets Management

**Rule:** No secret ever appears in source code, .env files committed to git, or application logs.

Secret categories and locations:
```
JWT_PRIVATE_KEY        → Railway env var (PEM format, RS256)
JWT_PUBLIC_KEY         → Railway env var + Vercel env var (verification)
ENCRYPTION_KEY         → Railway env var (AES-256, 32 bytes, hex-encoded)
SUPABASE_SERVICE_KEY   → Railway env var only (never Vercel)
SUPABASE_URL           → Railway + Vercel env vars
UPSTASH_REDIS_URL      → Railway env var (rediss:// with TLS)
PAYMOB_SECRET_KEY      → Railway env var
RESEND_API_KEY         → Railway env var
WHATSAPP_API_KEY       → Railway env var
SENTRY_DSN             → Railway + Vercel env vars (not secret, but managed as env var)
```

Verification: `git log -p | grep -iE "key|secret|password|token"` runs in CI pre-deploy and blocks merge if any match found.

### 6.2 Key Rotation Policy

**JWT RS256 keypair:**
- Rotation trigger: Every 12 months (scheduled) OR immediately on suspected compromise.
- Rotation procedure: Generate new keypair → deploy new public key to verifier (Vercel) → deploy new private key to signer (Railway) → wait for all active refresh tokens to expire (7 days) → decommission old keys.
- User impact: No immediate impact. Existing access tokens (15 min) continue to work. Refresh tokens issued with old key will fail after Railway is updated. Users must re-login within 7 days.

**ENCRYPTION_KEY (CNIC):**
- Rotation trigger: On suspected compromise only (not scheduled — key rotation requires re-encrypting all CNIC records).
- Rotation procedure: Create `ENCRYPTION_KEY_NEW` env var → run migration script that re-encrypts all `cnic_encrypted` values → verify re-encryption → remove `ENCRYPTION_KEY_OLD` → rename `ENCRYPTION_KEY_NEW` to `ENCRYPTION_KEY`.
- This procedure is HIGH RISK. Must be tested on a database snapshot before production execution.

**SUPABASE_SERVICE_KEY:**
- Rotation trigger: Immediately on suspected compromise.
- Rotation procedure: Revoke in Supabase dashboard → generate new → update Railway env var → restart API.
- User impact: ~30 seconds of API unavailability during Railway restart.

### 6.3 TLS

- All connections use TLS. No plaintext HTTP in production.
- Cloudflare: Full (strict) mode — encrypts both Cloudflare-to-origin and client-to-Cloudflare.
- Redis: `rediss://` URL required. Connection refused if URL starts with `redis://`.
- Supabase: TLS enforced by Supabase. Cannot be disabled.
- Railway: TLS termination at Cloudflare layer for custom domain. Railway internal: HTTPS.

### 6.4 Encryption at Rest

- **CNIC:** AES-256 using Node.js `crypto.createCipheriv('aes-256-gcm', ...)`. IV generated per encryption. IV stored alongside ciphertext. Never the same IV twice.
- **TOTP secrets:** AES-256 encrypted. Same mechanism as CNIC.
- **Database:** Supabase storage is encrypted at rest by AWS (AES-256). Covers all database files and backups.
- **Supabase Storage (file uploads):** Encrypted at rest by AWS S3.
- **Railway logs:** Encrypted at rest by Railway infrastructure.

---

## 7. INCIDENT RESPONSE

### 7.1 Detection

Incidents are detected via:
- Sentry: Error rate > 5% over 5 minutes → immediate alert.
- Uptime Robot: `/health` endpoint down > 5 minutes → SMS alert.
- Cloudflare analytics: Traffic spike or geographic anomaly.
- Supabase alerts: Database connection count > 80% of pool.
- BullMQ DLQ: Failing jobs → Super Admin red badge.

### 7.2 Severity Classification

| Level | Trigger | Max Response Time |
|-------|---------|-------------------|
| P0 | Data breach / formula error / full outage | < 1 hour |
| P1 | Auth broken / partial outage / payment errors | < 4 hours |
| P2 | Degraded performance / single module broken | < 8 hours |
| P3 | Non-critical bug / cosmetic issue | Next business day |

### 7.3 P0 Data Breach Response (Step-by-Step)

**STEP 1 — CONTAIN (target: < 15 minutes)**
```bash
# Cloudflare: enable Under Attack mode via dashboard
# Blocks all non-CAPTCHA traffic immediately

# Railway: scale API to 0 replicas
railway scale --replicas=0 hostyllo-api

# Supabase: revoke service_role key
# Dashboard → Settings → API → Service Role → Revoke

# Redis: invalidate all sessions
redis-cli -u $UPSTASH_REDIS_URL FLUSHALL

# Set repeating 1-hour alarm to track response
```

**STEP 2 — ASSESS (target: < 1 hour)**
```sql
-- Which hostel_id was affected?
SELECT entity_type, entity_id, action, hostel_id, actor_id, created_at
FROM audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 100;

-- Was CNIC data accessed?
-- Check if cnic_encrypted column was included in SELECT queries
-- Review Cloudflare access logs for endpoint hit patterns
```

**STEP 3 — NOTIFY (PDPA obligation: < 72 hours)**

Affected hostel owners:
```
"We detected unauthorized access to our systems on [date/time].
We immediately took the system offline. Student data in our system
is encrypted. We are investigating whether any data was decrypted.
We will update you within 24 hours.
If you have questions, call [number] directly."
```

Pakistan Data Protection Authority (PTA):
- Contact: dpa@pta.gov.pk
- Required if PII (CNIC, name, phone) was potentially compromised.
- Report within 72 hours of discovery.

**STEP 4 — REMEDIATE**
- Identify root cause (audit_log, Cloudflare logs, Sentry traces).
- Fix the vulnerability.
- Rotate ALL secrets (JWT keypair, ENCRYPTION_KEY, SUPABASE_SERVICE_KEY).
- Run OWASP ZAP scan on fixed version before bringing back online.

**STEP 5 — RESTORE**
```bash
# Deploy fixed version to staging first
# Run full integration test suite
# Run 14 payment unit tests
# Run cross-tenant isolation tests on every endpoint
railway scale --replicas=2 hostyllo-api
# Disable Cloudflare Under Attack mode
```

**STEP 6 — POST-MORTEM (< 48 hours)**
- Write full incident report in `tasks/lessons.md`.
- Add new ESLint rule, CI check, or test to prevent recurrence.
- Update this document with new controls if applicable.

### 7.4 Recovery Contacts

| Resource | Contact | Action |
|----------|---------|--------|
| Railway | support.railway.app | API restore / env var issues |
| Supabase | support.supabase.com | Database / key revocation |
| Cloudflare | dash.cloudflare.com | WAF / Under Attack mode |
| 360dialog | support.360dialog.com | WhatsApp API suspension |
| Paymob | Merchant dashboard | Suspend incoming payments |
| PTA (Pakistan) | dpa@pta.gov.pk | PDPA breach notification |

---

## 8. SECURITY CHECKLIST

Run this before every Phase exit and before every major deploy:

```
PRE-DEPLOY SECURITY GATES
[ ] git log -p | grep -iE "key|secret|password" returns EMPTY
[ ] All 28 tables have rowsecurity=true (CI check passes)
[ ] withTenant() ESLint rule blocks raw queries (CI passes)
[ ] no-hostel-id-from-request ESLint rule passes (CI passes)
[ ] 14 payment unit tests pass
[ ] Cross-tenant isolation test passes (JWT A → data B → 404)
[ ] bcrypt rounds ≥ 12 (auth integration test passes)
[ ] cnic column (not cnic_encrypted) does not exist in any table
[ ] SENTRY_FILTER_PATTERNS blocks KEY|SECRET|PASSWORD|TOKEN in logs
[ ] /health returns db:ok and redis:ok
[ ] JWT algorithm pinned to RS256 (not HS256)
[ ] Rate limit active on /auth/login endpoint
[ ] Cloudflare WAF is active (not bypassed for testing)
[ ] Supabase Storage bucket is PRIVATE (not public)
[ ] PDF receipt signed URL expiry is 24h (not permanent)
[ ] TOTP setup verified for super_admin account

QUARTERLY SECURITY REVIEW
[ ] Rotate JWT RS256 keypair (if 12 months since last rotation)
[ ] Run npm audit — no high/critical CVEs unresolved
[ ] Review Dependabot PRs — merge security patches
[ ] Review audit_log for any super_admin impersonation events
[ ] Test incident response: simulate P0 breach response (steps 1-2 only)
[ ] Verify PITR is active (verify-pitr.sh exits 0)
[ ] Verify backup restore works (restore to separate database, verify data)
```

---

*HOSTYLLO Security Architecture v1.0 · June 2026 · Traceable to PRD v15.0 Section 19*
*Review: Before every Phase exit. Update: After every incident.*
