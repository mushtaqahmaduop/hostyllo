# HOSTYLLO — Architecture Review Board (ARB) Engineering Audit

**Auditor posture:** Independent Principal Software Architect (Stripe/Shopify/GitHub/Google-caliber review board). No feelings spared. Every claim below cites file:line evidence from the repo at commit `062488b` (branch `Develop`).

**Scope:** All source (`apps/`, `packages/`), all migrations, CI, infra config, and the 29-file `docs/` suite. Frontend (`apps/web`, `apps/admin`) is not yet built (placeholders) — assessed as "absent," not reviewed for quality.

**One-line verdict:** A competently-built modular monolith wrapped in ~19k lines of largely speculative documentation, whose single most important promise — **DB-enforced tenant isolation — is not actually enforced.** ❌ **REJECTED for production**; fixable to BETA with 4 critical fixes.

> ## ✅ REMEDIATION STATUS (updated 2026-07-22, same day)
> **All 4 CRITICAL and all 5 MAJOR findings have been fixed.** C1 is **verified live on the
> production Supabase DB** (28/28 tables `FORCE ROW LEVEL SECURITY`; as the least-privilege
> `hostyllo_app` role, queries with no/wrong hostel context return 0 rows — proven via MCP).
> - **C1** RLS not enforced → migrations 010/011 applied live; isolation proven. *App-side
>   activation (point the running app at `DATABASE_URL_APP`=hostyllo_app) is pending the Railway
>   Hobby plan; until then the app uses the safe postgres fallback.*
> - **C2** weak enc key → boot-time `assertEncryptionKey()`; key rotated. **C3** secrets → `.env.example`
>   + rotate runbook (⚠️ founder still to rotate live creds). **C4** pitr gate → uses a PAT now.
> - **M1** duplicate pool unified · **M2** CLAUDE.md fixed · **M3** migration runner+ledger ·
>   **M4** env validation · **M5** isolation tests made real + wired into CI (first green run pending).
>
> The verdict below (❌ REJECTED) reflects the **state at audit time**. With C1–C4 closed and C1
> proven live, the product is on the short path to **⚠️ APPROVED WITH MAJOR CHANGES** for a
> controlled beta — remaining gates: app-side DATABASE_URL_APP live, CI integration job green,
> and live-credential rotation.

---

## REPORT 1 — EXECUTIVE SUMMARY & SCORES

| Dimension | Score /10 | One-line justification |
|---|:--:|---|
| Architecture (code) | 7 | Sound Fastify modular monolith; correct patterns; NOT over-microserviced. Undermined by RLS wiring. |
| Security | 3 | RLS not forced + owner connection = isolation unenforced at DB; worthless encryption key; fail-open secret defaults. Good bones (RS256, audit trigger) can't offset a broken core guarantee. |
| Scalability | 6 | Pooling, single-CTE dashboard, pg_trgm search — reasonable. Two competing pools; zero load proof. |
| Maintainability | 6 | Clean, typed code (now strict). Duplicate `withTenant`, no migration runner, doc sprawl drag it down. |
| Developer Experience | 5 | ESLint invariants + payment tests are great. Broken auto-loaded `CLAUDE.md` paths, 29-doc maze, no `.env.example` hurt. |
| Documentation | 4 | Comprehensive but drifted, self-contradictory, collision-numbered, heavy AI filler. Volume ≠ value. |
| AI-Agent Quality | 4 | The invariant idea is genuinely good; execution is stale (dead paths, wrong defect list, overstated enforcement). |
| Production Readiness | 2 | Four critical blockers. Not shippable. |
| Enterprise Readiness | 3 | Enterprise *paperwork* exists; enterprise *guarantees* do not. |
| **OVERALL** | **~4.5** | **"Promising monolith, unsafe to ship."** |

**The four things that would cost millions later** (fix before ANY paying tenant):
1. Tenant isolation is not DB-enforced (C1).
2. The encryption key protecting 2FA secrets (and, per plan, CNIC national-ID data) is a guessable pattern (C2).
3. Production secrets managed via a working-tree `.env`, incl. the RLS-bypassing service_role key (C3).
4. The Phase-1 exit gate that is supposed to prove backups work is non-functional (C4).

---

## REPORT 2 — WHAT THIS PROJECT REALLY IS

HOSTYLLO is the **cloud/SaaS re-implementation of a mature 12,000-line Electron hostel-management app** (HOSTIX, live at 50+ Pakistani hostels). Stack: pnpm/Turborepo monorepo, Fastify 4 API on Railway, Supabase Postgres (RLS + `withTenant`), Upstash Redis, BullMQ workers, JWT RS256, targeting Vercel for a not-yet-built Next.js frontend.

**Actual maturity:** Backend Phase 1 is **code ~95% authored, zero live-verified.** 16 route modules, 9 migrations (28 tables), 6 workers, 14 passing payment-formula unit tests, `tsc --strict` clean. **No frontend exists.** No live DB/Redis integration test has ever run. No deployment is proven.

**Strengths (real):** ported payment formula with a real test suite; DB-level audit-log immutability trigger; correctly-enforced RS256 with jti blocklist + refresh rotation; an ESLint plugin encoding two tenant-safety invariants; a genuinely appropriate modular-monolith choice (no premature microservices).

**Weaknesses (real):** the core multi-tenant guarantee is unenforced (Report 12); secrets/crypto hygiene is poor; there is no migration runner; the documentation is ~4× larger than the codebase and substantially drifted from it.

**Does documentation match reality?** **No.** The docs describe a hardened enterprise system ("RLS enforced by the DB engine," "28 tables with RLS," "backup verified by exit gate"). The code implements app-level session-variable filtering with RLS present-but-bypassed, a broken backup-check script, and hand-managed SQL. The gap between documented intent and operating reality is the central finding of this audit.

---

## REPORT 3 — CRITICAL ISSUES (production blockers)

### C1 — Tenant isolation is NOT enforced by the database
- **Evidence:** Every migration uses `ENABLE ROW LEVEL SECURITY` only — **no table has `FORCE ROW LEVEL SECURITY`** (`grep` across `001–007`: 28 `ENABLE`, 0 `FORCE`). No dedicated application DB role is ever created (`CREATE ROLE`/`GRANT`/`BYPASSRLS` → **zero matches** in `packages/db/migrations/`). The app connects as the **table-owner** role: `DATABASE_URL=postgresql://postgres.eprrhckgtrerknenngdy:…@…pooler.supabase.com` (`apps/api/.env:45`).
- **Why it's broken:** In PostgreSQL, a table's **owner bypasses that table's RLS policies unless `FORCE ROW LEVEL SECURITY` is set.** Migrations run as `postgres` (owner); the app connects as `postgres`. Therefore the policies in `001:58`, `003:33…` (`USING (hostel_id::text = current_setting('app.hostel_id', true))`) **are never evaluated for the app's own queries.** `withTenant`'s `set_config('app.hostel_id', …, true)` (`lib/db.ts:17`) still sets the GUC, but nothing forces RLS to consult it.
- **What actually isolates today:** the routes *also* hand-filter every query with `hostel_id = current_setting('app.hostel_id')::uuid` (e.g. `payments.ts:28,122,132,144,171,199,206`). So there is isolation **as long as every query, forever, remembers that filter.** There is **no DB safety net, no CI check, and the ESLint rule verifies only `withTenant()` wrapping — not the presence of the hostel filter** (`eslint-plugin-hostyllo/index.js:14-42`). One forgotten `WHERE` in one future JOIN/subquery = silent cross-tenant data leak.
- **Direct contradiction:** `09_BUILD_STATE_v15.md` DECISION LOG explicitly records *"PostgreSQL RLS + withTenant() — Row-level isolation enforced by DB engine"* and rejects *"App-level filtering — too easy to forget."* **The team built precisely the rejected design and documented it as the chosen one.**
- **Impact:** Catastrophic multi-tenant data breach on the first missed filter. This is the "$10M lawsuit" class for a system holding student CNIC (national ID) data.
- **Fix (priority 0):** (a) `ALTER TABLE … FORCE ROW LEVEL SECURITY` on all 26 tenant tables; **and** (b) create a non-owner `app_user` role without `BYPASSRLS`, `GRANT` it DML only, and point `DATABASE_URL` at it. Keep the explicit filters as defense-in-depth. (c) Add a CI gate: `SELECT relname FROM pg_class WHERE relrowsecurity AND NOT relforcerowsecurity` → 0 rows.
- **Confidence:** High from code; **must be confirmed on the live DB** (I cannot query it). If live verification shows a non-owner role is actually used, C1 downgrades to Major — but nothing in the repo provisions one.

### C2 — The encryption key is a guessable pattern, not a secret
- **Evidence:** `apps/api/.env:46` → `ENCRYPTION_KEY="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"` — the 12-hex string `a1b2c3d4e5f6` repeated. This key drives AES-256-GCM for TOTP secrets (`auth.ts:11-34`) and is the intended mechanism for CNIC encryption.
- **Impact:** AES with a predictable key provides **no confidentiality.** Anyone who guesses the pattern (trivial) decrypts every 2FA secret and, once implemented, every CNIC. The cryptographic control is theatre.
- **Fix:** generate a real 32-byte random key (`openssl rand -hex 32`), store in the secret manager, rotate, re-encrypt existing ciphertext. Treat key rotation as a first-class operation.

### C3 — Production secrets live in a working-tree `.env` (incl. the RLS-bypass key)
- **Evidence:** `apps/api/.env` holds **live** `JWT_PRIVATE_KEY`, `SUPABASE_SERVICE_KEY` (service_role JWT — bypasses RLS entirely), `DATABASE_URL` with password, `RESEND_API_KEY`, `SENTRY_DSN`, `UPSTASH_REDIS_REST_TOKEN`, with `NODE_ENV="production"`. It is correctly git-ignored (`.gitignore:5`) and **never committed** (verified: `git log --all -- apps/api/.env` empty) — so this is **not** a repo leak.
- **Why it's still Critical:** real production credentials sit in a developer checkout in plaintext, readable by any local tool/agent (including this audit session), with no secret manager and no rotation story. The `service_role` key in particular is a full-database skeleton key.
- **Fix:** move all secrets to Railway/Vercel secret stores; delete the local `.env` after seeding a `.env.example`; **rotate every credential now**, because they have already been exposed outside the secret boundary.

### C4 — The Phase-1 backup exit-gate script cannot pass
- **Evidence:** `scripts/verify-pitr.sh` calls the Supabase **Management API** (`https://api.supabase.com/v1/projects/$REF/database/backups`) with `Authorization: Bearer $SUPABASE_SERVICE_KEY`. The Management API requires a **Supabase Personal Access Token**, not the PostgREST `service_role` JWT. The call returns 401 regardless of PITR state → the script always exits 1.
- **Impact:** INVARIANT-6 / the Phase-1 "PITR verified" gate is **unverifiable as written.** A green run is impossible; a founder ticking it manually is trusting a broken check.
- **Fix:** use a `SUPABASE_ACCESS_TOKEN` (PAT) for the Management API call; keep `service_role` only for data-plane checks.

---

## REPORT 4 — MAJOR ISSUES

**M1 — Two `withTenant`/`Pool` implementations; the unused one is insecure and still instantiated.** Routes import `withTenant` from `apps/api/src/lib/db.ts` (max 25; TLS hardened 2026-07-22). `packages/db/src/withTenant.ts` is a **second** copy (`max:10`, `ssl:{rejectUnauthorized:false}` — still MITM-open). `packages/db/src/index.ts:1` eagerly re-exports `{withTenant, pool}`, so `import { calculateUnpaid } from '@hostyllo/db'` (`payments.ts:4`) **instantiates the insecure pool at runtime.** Two sources of truth for the "architectural cornerstone," plus a live insecure pool, plus a fragmented connection budget (25+10). *Fix: one canonical `withTenant` in `packages/db`, delete the api copy, import everywhere; apply the same TLS logic.*

**M2 — The auto-loaded `CLAUDE.md` is broken and stale.** Every doc reference points to `docs/docs/…` (`CLAUDE.md:5,6,21,136,146`) but docs were flattened to `docs/` — **all links dead.** Its "GROUND TRUTH" block still lists the 4 payment defects as unfixed and "7 migrations / 6 routes" (now 9 / 16). The file that preaches *"never trust the tracker over the code"* is itself the most drifted artifact in the repo. *Fix: correct paths, refresh the ground-truth block, or generate it from the tracker.*

**M3 — No migration runner, no schema-migration tracking.** `scripts/` contains only `verify-pitr.sh`; no `migrate` script in any `package.json`; no node-pg-migrate/drizzle/prisma/sqitch. Raw `.sql` applied by hand. Idempotency is inconsistent: `008`/`009` use `IF NOT EXISTS`, but `001–007` `CREATE TABLE`/`CREATE POLICY` do not → re-running fails; there is no `schema_migrations` ledger, no ordering guarantee beyond filename, no down-migrations, no drift detection. For a multi-tenant production DB this is a serious operational risk. *Fix: adopt a real runner + migrations ledger before first prod apply.*

**M4 — Fail-open security defaults + missing env validation.** `server.ts:68` `COOKIE_SECRET ?? 'hostyllo-cookie-secret'` (a public constant → forgeable signed cookies if env unset in prod); `server.ts:64` `CORS_ORIGIN ?? 'http://localhost:3000'`. `auth.ts:10` comment claims *"Encryption key — validated at startup in server.ts"* — **no such validation exists** in `server.ts`. There is no env schema (zod/envalid). *Fix: validate all required secrets at boot and throw in production; remove public defaults.*

**M5 — The core security property has zero automated coverage.** `ci.yml` runs `lint → tsc → vitest` with **no Postgres/Redis service**, so `isolation.test.ts` and `auth.test.ts` (the only tests that would catch C1) never run in CI. The 14 payment tests are pure arithmetic (no DB). The single most important invariant — cross-tenant isolation — is unproven and un-CI'd. *Fix: add a Postgres service to CI, run the isolation suite, add the `rowsecurity/forced` gate from C1.*

---

## REPORT 5 — MEDIUM ISSUES

- **audit_log immutability has a TRUNCATE hole.** The `audit_log_immutable()` triggers (`006:57-70`) block `UPDATE`/`DELETE` (good, real INVARIANT-5 enforcement) — but `TRUNCATE` does **not** fire `BEFORE DELETE` triggers, and the app connects as owner (C1). Tamper-evidence is thus defeatable by `TRUNCATE audit_log`. *Fix: `REVOKE TRUNCATE`, or the non-owner role from C1 removes the capability.*
- **`requireRole` assumes `requireAuth` ran.** `middleware/auth.ts:36-42` checks `request.userRole` with no guard that it's set; safe only by preHandler array ordering. A future route that lists `requireRole` without `requireAuth` fails open (userRole `undefined` → 403, actually fails closed here — but the coupling is implicit and fragile).
- **Invariant/rule framing is self-contradictory.** Root `CLAUDE.md:42` = "6 INVARIANTS (CI + ESLint enforced)"; `docs/06_CLAUDE_MD_v15.md:206` = "24 CRITICAL NEVER-VIOLATE RULES"; `06_..._ADDENDUM.md:7` = "6 ADDITIONAL HARD RULES" (never merged). Only **2** invariants are ESLint-enforced; INVARIANT-1/4/5/6 are not statically checked. "CI + ESLint enforced" is overstated.
- **`helmet` registered with no config** (`server.ts:62`). Relies entirely on defaults while `03_SECURITY_ARCHITECTURE.md` specifies explicit CSP/HSTS/X-Frame rules — undocumented drift; HSTS `maxAge`/`preload` unspecified.
- **No `.env.example`** despite `.gitignore` and the CI secrets-scan both special-casing it. New devs have no template; onboarding relies on tribal knowledge.
- **JWT carries no `iss`/`aud`** (`lib/jwt.ts`). Fine for a single service today; add before the Phase-6 external-API story.

---

## REPORT 6 — MINOR ISSUES

- Inconsistent validation: `students.ts` uses hand-rolled checks while `payments/rooms/expenses` use JSON-Schema with `additionalProperties:false`.
- Doc numbering collisions: two files each at `03_`,`04_`,`05_`,`07_`,`08_`,`09_`,`10_`.
- In-place mutation of shipped migrations (e.g. `009` renames a `001` column; a prior session edited `003`'s CHECK). Acceptable pre-prod, dangerous once any environment has applied the old version.
- `settings.ts`/route role lists still exclude `chain_manager` on student read/write while `import`/`reveal-cnic` include it (authorization inconsistency flagged in `tasks/todo`).

---

## REPORT 7 — CROSS-DOCUMENT CONTRADICTIONS

| # | Contradiction | Evidence |
|---|---|---|
| 1 | "Isolation enforced by DB engine (RLS)" vs. reality of app-level session-var filtering with RLS bypassed | `09_BUILD_STATE` DECISION LOG vs. C1 evidence |
| 2 | Build status "Phase 0 — nothing built" (multiple docs) vs. Phase-1 ~95% authored | Banner-corrected 2026-07-22 in `00_SYSTEM_OVERVIEW`, `ARCHITECTURE_GAP_REPORT`, `AGENT_AUDIT_REPORT`, `SESSION_HANDOFF` |
| 3 | "6 invariants" (root CLAUDE.md) vs "24 rules + 6 addendum" (docs/06 + addendum) | `CLAUDE.md:42` vs `06_CLAUDE_MD_v15.md:206` + `_ADDENDUM.md:7` |
| 4 | Payment defects "open, fix first" (root CLAUDE.md, June) vs fixed (`ef4bbbc`) | `CLAUDE.md:33-38` vs `tasks/todo §0` |
| 5 | Doc paths `docs/docs/…` (root CLAUDE.md) vs flattened `docs/` | `CLAUDE.md:5,6,21,136,146` |
| 6 | Spec fields `tagline/brandColor/can_edit/…` referenced by spec docs but absent from schema until (partial) mig 009 | `settings`/`users` route notes; `04_DATABASE_ARCHITECTURE` |
| 7 | "7 BullMQ queues, DLQ on all 7" vs 6 worker files (2 are Phase 3/5) | `09_BUILD_STATE` workers table |

The `28 tables` claim, by contrast, **is accurate** (28 `CREATE TABLE` across migrations) — credit where due.

---

## REPORT 8 — DOCUMENTATION PROBLEMS

29 files, **~19,000 lines — roughly 4× the size of the code it describes** (~6,000 LOC). This is the single clearest sign of **AI-generated enterprise theatre**: a pre-revenue, solo-founder, zero-user product shipped with a `11_BUSINESS_CONTINUITY.md` (483 lines), `12_ENTERPRISE_READINESS_ROADMAP.md`, `10_OBSERVABILITY_ARCHITECTURE.md`, and `13_PRODUCTION_READINESS.md` (1,255 lines) — all authored **before a single endpoint was verified to run.** Specific problems: numbering collisions (Report 7); four overlapping agent-onboarding docs (`AGENT_CONTEXT`, `AGENT_INSTRUCTIONS`, `AGENT_SESSION_GUIDE`, `06_CLAUDE_MD`); an un-merged CLAUDE addendum; stale build-status claims (now banner-corrected); and a source-of-truth tracker that drifts a full phase behind the code between sessions. **Recommendation:** freeze new documentation; collapse to a lean canonical set (PRD, API spec, DB architecture, security architecture, one CLAUDE.md, the build tracker); archive the speculative enterprise docs under `docs/_future/` until the phase that needs them.

---

## REPORT 9 — ARCHITECTURE REVIEW

**The macro choice is correct and commendable:** a single Fastify modular monolith, not a microservice sprawl. For a solo founder porting a working desktop app, this is the *right* altitude — no premature service boundaries, no Kafka, no k8s. Layering is clean: `routes → lib(db/redis/jwt) → packages/db(withTenant/paymentService)`. The monorepo (`apps/api`, `packages/db`, `packages/config`) is coherent. **Where it's wrong:** the tenant-isolation primitive is duplicated (M1) and the isolation *guarantee* is mis-wired (C1). The `packages/db` boundary is right in spirit (shared tenant + money logic) but leaks an eager Pool side-effect on import. No domain layer beyond routes — acceptable at this size; revisit if routes exceed ~600 lines (payments.ts is already 655 and is doing validation + SQL + audit inline — the first candidate to extract a `paymentService`).

---

## REPORT 10 — BACKEND REVIEW

Solid Fastify usage: JSON-Schema validation on most routes, `additionalProperties:false`, sensible HTTP codes, a consistent `{success,code,message}`/`{success,data}` envelope, and (as of 2026-07-22) a global error handler, real `/health` probe, and login rate-limiting. Transactions are handled by `withTenant`'s BEGIN/COMMIT/ROLLBACK — correct. Idempotency keys and an atomic `get_next_receipt_number()` are real strengths. **Gaps:** `payments.ts` is a 655-line god-route (extract a service); validation is inconsistent (`students.ts` hand-rolled); no request-level pagination contract documented; workers' DLQ wiring is asserted but not CI-proven; no structured error taxonomy shared between routes (each hardcodes `code` strings).

---

## REPORT 11 — DATABASE REVIEW

Schema is genuinely good: 28 normalized tables, `NUMERIC(10,2)` money (INVARIANT-4 honored), soft-delete columns, GIN/pg_trgm search indexes, an atomic receipt counter, and a **DB-level audit-log immutability trigger** (`006:57-70`) — that last one is better than most startups ever do. **But:** RLS is `ENABLE`-only, never `FORCE` (C1); no application role (C1); the TRUNCATE hole undermines the immutability claim (Report 5); there is no migration runner or ledger (M3); and shipped migrations are edited in place (Report 6). The schema *design* is A-grade; the schema *operations* are D-grade.

---

## REPORT 12 — SECURITY REVIEW

**Done well:** RS256 correctly and exclusively enforced (`lib/jwt.ts:60` `algorithms:['RS256']` — INVARIANT-1 real); jti blocklist + rolling refresh rotation; bcrypt(12); TOTP with AES-GCM (authenticated) encryption; CSV formula-injection stripping; audit trigger. **Done badly / broken:** tenant isolation not DB-enforced (C1); encryption key is a pattern (C2); secrets in working-tree `.env` incl. service_role (C3); fail-open cookie/CORS defaults + no env validation (M4); isolation untested in CI (M5); CNIC still plaintext; `helmet` unconfigured. **OWASP posture:** A01 (Broken Access Control) is the live exposure via C1; A02 (Cryptographic Failures) via C2; A05 (Misconfiguration) via M4/C3. This is not a system that should hold national-ID data in production yet.

---

## REPORT 13 — FRONTEND REVIEW

**Nothing to review.** `apps/web` and `apps/admin` are placeholders (per the tracker). The `04_UX_DESIGN_SYSTEM.md` (813 lines) and 23 Phase-2 screen rows in the tracker are **design intent with zero implementation.** This is fine for Phase 1 — but every "frontend" claim in the docs is aspirational. Do not let the volume of UX documentation create the illusion of a built UI.

---

## REPORT 14 — DEVOPS REVIEW

CI (`ci.yml`) is above-average for a solo project: lint + `tsc --noEmit` + vitest + a two-pronged secrets-scan, gated in stages. **Gaps:** no Postgres/Redis service → no integration/isolation tests (M5); no RLS/`forced` gate; no deploy job (the tracker's advertised `→ deploy` stage doesn't exist in the file); `railway.toml`/`railpack.json` present but unverified; `verify-pitr.sh` broken (C4); no Dockerfile (relying on Railway buildpacks — acceptable, undocumented); no rollback runbook that maps to reality. Observability is documented (Sentry DSN present) but "Sentry receiving events" is unproven.

---

## REPORT 15 — TESTING REVIEW

**14 payment-formula unit tests, all passing — real and valuable** (they encode the ported money logic). `isolation.test.ts` and `auth.test.ts` exist but need a live DB and **do not run in CI** (M5). There are **no route/integration tests, no worker tests, no E2E, no load tests.** Effective automated coverage of the security-critical paths (isolation, RBAC, audit writes) is **zero**. Testability is otherwise good (pure `paymentService`, DI-friendly `withTenant`). Priority: stand up an ephemeral Postgres in CI and make the isolation suite the second required gate after the payment suite.

---

## REPORT 16 — TECHNICAL DEBT REGISTER

| Issue | Risk | Likelihood | Impact | Priority | Est. refactor |
|---|---|:--:|:--:|:--:|---|
| RLS not FORCEd + owner connection (C1) | Cross-tenant breach | Med (rises with each new query) | Catastrophic | P0 | 0.5–1 day (migration + role + CI gate) |
| Guessable ENCRYPTION_KEY (C2) | 2FA/CNIC decryptable | High if attacker gets ciphertext | Severe | P0 | 0.5 day + rotation |
| Secrets in `.env` / no manager (C3) | Credential compromise | Med | Severe | P0 | 0.5 day + rotate all |
| `verify-pitr.sh` broken (C4) | False backup assurance | Certain | High | P0 | 1–2 hrs |
| Duplicate/insecure `withTenant` pool (M1) | MITM + confusion | Low–Med | High | P1 | 2–4 hrs |
| No migration runner (M3) | Prod schema drift/errors | High | High | P1 | 1 day |
| Broken CLAUDE.md paths + stale ground-truth (M2) | Agents act on wrong info | High | Med | P1 | 1–2 hrs |
| Fail-open cookie/CORS + no env validation (M4) | Cookie forgery in misconfig | Low | High | P1 | 2–4 hrs |
| Isolation untested in CI (M5) | C1-class bugs ship silently | High | Catastrophic | P1 | 0.5–1 day |
| audit_log TRUNCATE hole | Tamper evidence defeatable | Low | Med | P2 | 1 hr (subsumed by C1 role) |
| Doc sprawl / collisions / theatre | Wasted time, wrong decisions | High | Low–Med | P2 | 1–2 days consolidation |
| payments.ts god-route | Maintainability | Med | Med | P3 | 0.5 day extract service |

---

## REPORT 17 — CLAUDE CODE AUDIT (addressed to Claude Code, engineer-to-engineer)

You are a capable engineer who shipped clean, typed, well-patterned route code and a real test suite — and then undermined it with two failures a senior reviewer would not forgive.

**What you did well:** the payment formula port with 14 tests; the audit-log immutability trigger; correct RS256 enforcement; the ESLint invariant plugin; choosing a modular monolith instead of cosplay microservices. That judgment is genuinely good.

**What you did poorly / where your reasoning was weak:**
- You wrote *"isolation enforced by the DB engine"* in the decision log and then **built app-level session-variable filtering with RLS bypassed** — the exact approach you documented as rejected. You conflated "RLS policies exist in a migration" with "RLS protects the connection." A principal engineer verifies the *effective* policy against the *actual* connecting role. You never did. **This is the finding that matters.**
- You produced ~19k lines of documentation before proving one endpoint runs against a real database. You wrote a Business Continuity plan for a product with zero users. **You created documentation instead of architecture** — and worse, instead of *verification*.
- You left the auto-loaded `CLAUDE.md` pointing at `docs/docs/…` after the flatten, and left its "ground truth" listing already-fixed defects. The one file every future you reads first is the one you let rot.

**Where you overengineered:** the docs suite; the 24-rules-plus-6-addendum rule sprawl; Phase 5/6 observability and enterprise-readiness docs.
**Where you underengineered:** migration tooling (none); CI integration testing (none); secret management (a `.env`); the encryption key (a pattern).

**What to rewrite:** `verify-pitr.sh` (wrong credential); the RLS wiring (FORCE + app role).
**What to delete/merge:** collapse the 4 agent-onboarding docs into one; merge the CLAUDE addendum; archive the speculative enterprise docs.
**What to simplify:** one `withTenant`, one pool, one rule list.
**Bottom line:** you built a good monolith and then trusted your own documentation over the database. Stop writing. Start verifying against a live DB.

---

## REPORT 18 — ACTION PLAN

**Immediate (today):**
1. Rotate every credential in `apps/api/.env` (they've left the secret boundary) and generate a real `ENCRYPTION_KEY` (C2/C3).
2. Fix `verify-pitr.sh` to use a Supabase PAT (C4).
3. Fix `CLAUDE.md` paths + ground-truth block (M2).

**Next week:**
4. `FORCE ROW LEVEL SECURITY` on all tenant tables + create a non-owner `app_user` role and repoint `DATABASE_URL` (C1). Verify on the live DB that a raw `SELECT` without the GUC returns 0 rows.
5. Add a Postgres service to CI; run `isolation.test.ts`; add the `relforcerowsecurity` gate (M5, C1).
6. Unify `withTenant`/pool into `packages/db`; delete the api copy; apply the TLS-verify logic (M1).
7. Env validation at boot; remove fail-open cookie/CORS defaults; write `.env.example` (M4).

**Next month:**
8. Adopt a migration runner + `schema_migrations` ledger; backfill idempotency (M3).
9. Implement CNIC AES-256-GCM encryption + backfill (last Phase-1 code item).
10. Consolidate docs to the lean canonical set; archive enterprise theatre (Report 8).

**Before beta:** C1–C4 closed and *proven on a live DB*; isolation suite green in CI; secrets in a manager; PITR verified by a working script.
**Before production:** load test (k6), external isolation review, moving-migration runner battle-tested, Sentry proven receiving, rollback rehearsed.

---

## FINAL VERDICT

# ❌ REJECTED (for production)
### ⚠️ Path to "APPROVED WITH MAJOR CHANGES" is short and concrete.

**Defense:** The code is not the problem — it's a competent modular monolith with real tests and several controls better than typical startups (RS256, audit trigger, invariant ESLint). It is **rejected because the product's defining promise — tenant isolation — is not enforced by the database (C1), the data-protection crypto is worthless (C2), secrets are unmanaged (C3), and the backup gate is broken (C4)**, with zero automated coverage of the isolation property (M5). For a multi-tenant system holding national-ID data, shipping in this state is the kind of decision that becomes a breach notification. Close C1–C4, prove them on a live database, and green the isolation suite in CI — then this is a legitimate **APPROVED WITH MAJOR CHANGES** for a controlled beta.

*ARB audit · 2026-07-22 · Principal Architect review · Evidence at commit `062488b`, branch `Develop`. Live-DB-dependent findings (C1, RLS enforcement, PITR) flagged as requiring runtime confirmation.*
