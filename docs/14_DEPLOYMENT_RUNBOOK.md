# 14 · Deployment Runbook (Production)

Single source of truth for how Hostyllo's API runs in production and how to operate it.
Last verified live: 2026-07-23 — `{"success":true,"data":{"db":"ok","redis":"ok"}}`.

---

## 1. Production stack

| Piece | Where | Notes |
|---|---|---|
| API (`@hostyllo/api`) | Railway project **Hostyllo** → service **hostyllo**, env `production` | https://hostyllo-production.up.railway.app |
| Redis | Railway plugin **Redis** (`redis-volume`) | cache + BullMQ queues |
| Postgres | **Supabase** (project ref `eprrhckgtrerknenngdy`) | via Supavisor pooler (IPv4) |
| Errors | **Sentry** — org `zeerak-services`, project `hostyllo-api` (region `de.sentry.io`) | |
| Uptime | GitHub Actions `.github/workflows/uptime.yml` → Sentry Crons monitor `hostyllo-uptime` | every 10 min |

Health endpoint: **`GET /api/v1/health`** → `200` with `{success, data:{db, redis, version}}` (liveness — always 200 while the process serves; `success` is `db && redis`). There is intentionally no `GET /` route (a `404` there is normal; a `502` is not).

---

## 2. Deploy flow (staging → production pipeline)

Two Railway environments in the **Hostyllo** project, same `hostyllo` service, isolated backends:

| Environment | Deploy branch | URL | Postgres (Supabase) | Redis |
|---|---|---|---|---|
| **production** | **`main`** | https://hostyllo-production.up.railway.app | `eprrhckgtrerknenngdy` | prod Railway Redis |
| **staging** | **`Develop`** | https://hostyllo-staging.up.railway.app | `ljnuwmfnpofzlmioskfc` (hostyllo-staging) | its own Railway Redis |

- Push to **`Develop`** → deploys to **staging** only. Push/merge to **`main`** → deploys to **production** only. Production never moves until you promote `Develop → main`.
- The per-environment deploy branch is a **deployment trigger** (not a service-level setting). The CLI `railway service source connect --branch` is service-GLOBAL and will change **both** environments — do **not** use it to change one. Set a single environment's branch via the GraphQL `deploymentTriggerUpdate` mutation (see §11) or the Railway dashboard (service → Settings → the environment's Source branch).
- `watchPatterns` in `railway.toml` means only changes under `apps/**`, `packages/**`, or the build files (`railway.toml`, `package.json`, `pnpm-lock.yaml`, `turbo.json`) trigger a redeploy — docs/CI/task pushes do not. A push whose watched tree is identical to what's already deployed shows as **SKIPPED** (expected, not an error).
- Build/run config lives in **`railway.toml`** (read per-commit):
  ```toml
  [build]
  buildCommand = "pnpm build"            # turbo builds @hostyllo/db BEFORE api — required (see §5)
  [deploy]
  startCommand = "cd apps/api && node dist/server.js"
  healthcheckPath = "/api/v1/health"
  healthcheckTimeout = 30
  restartPolicyType = "on_failure"
  ```

---

## 3. Environment variables (Railway → service `hostyllo`)

| Var | Value / source | Notes |
|---|---|---|
| `PORT` | `8080` | **Must equal the domain's targetPort (8080).** See §4. |
| `NODE_ENV` | `production` | enforces secret validation + TLS verification |
| `CORS_ORIGIN` | `https://app.hostyllo.app` | prod frontend origin |
| `COOKIE_SECRET` | strong random | required in prod |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | RS256 PEM | |
| `ENCRYPTION_KEY` | 32-byte hex | **NEVER rotate** — CNIC/TOTP are encrypted at rest with it |
| `DATABASE_URL` | `postgresql://postgres.<ref>:***@aws-1-ap-south-1.pooler.supabase.com:5432/postgres` | pooler, IPv4 (see §6) |
| `DATABASE_URL_APP` | `postgresql://hostyllo_app.<ref>:***@aws-1-ap-south-1.pooler.supabase.com:5432/postgres` | least-priv role, RLS-forced |
| `DATABASE_CA_CERT` | Supabase CA (PEM) | pins TLS so `rejectUnauthorized:true` verifies (see §6) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Railway Redis (ioredis, `family:0`) |
| `SENTRY_DSN` | Sentry project DSN | also a GitHub Actions secret for the uptime probe |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Supabase | |
| `RESEND_API_KEY` / `EMAIL_FROM` | Resend | transactional email |

Removed (dead): `BULLMQ_REDIS_*`, `UPSTASH_REDIS_REST_*` — old Upstash config, source of the `ERR max requests limit 500000` worker spam. Do not re-add.

---

## 4. Networking (the 502 trap)

Railway's public domain routes to a fixed **targetPort = 8080**. The app listens on `process.env.PORT`. If `PORT` ≠ 8080, the internal healthcheck still passes (it hits the app's port directly) but **every public request returns `502 "Application failed to respond"`**. Fix: keep `PORT=8080`, or repoint the domain (`railway domain --port <n>` only applies when generating a new domain; changing an existing one is a dashboard action).

---

## 5. Why the build must compile the whole workspace

`apps/api` imports `@hostyllo/db` (single canonical DB layer, audit M1). `pnpm --filter @hostyllo/api build` does **not** build that dependency, so `packages/db/dist` never exists → runtime `ERR_MODULE_NOT_FOUND: withTenant.js` at boot. `pnpm build` (= `turbo run build`, `^build`) compiles `db` then `api`. `packages/db` has its own `tsconfig.json` + `build` script and ships `main: ./dist/index.js`.

---

## 6. Supabase DB connectivity (the `db:down` trap)

- Use the **Supavisor pooler** host `aws-1-ap-south-1.pooler.supabase.com:5432` (session mode), **not** the direct host `db.<ref>.supabase.co` — the direct host is **IPv6-only** and Railway egress is IPv4, so it's unreachable (`db:down` with the pool unable to connect).
- Pooler usernames carry the project ref: `postgres.<ref>` and `hostyllo_app.<ref>`.
- TLS: code verifies certs (`rejectUnauthorized:true`, audit hardening — `PGSSL_NO_VERIFY` throws in prod). Supabase's chain is self-signed, so `DATABASE_CA_CERT` must hold the Supabase CA. Extract it from the live handshake if lost: Postgres `SSLRequest` (`00 00 00 08 04 D2 16 2F`) → `tls.connect` → `getPeerCertificate(true)` → PEM of the issuer chain.

---

## 7. Monitoring

- **Errors:** Sentry SDK (`apps/api/src/instrument.ts`, imported first in `server.ts`). Captures 5xx (central error handler) + `unhandledRejection`/`uncaughtException`. No-op when `SENTRY_DSN` is unset.
- **Uptime:** `.github/workflows/uptime.yml` probes `/health` every 10 min; a failed job emails the owner; each run check-ins to Sentry Crons monitor `hostyllo-uptime` (schedule `*/10`), so Sentry alerts on app-down (error check-in) **and** probe-silent (missed check-in). Set the crons alert target in Sentry (email/Slack).

---

## 8. Branches & CI

- **`Develop`** = staging branch (also the repo default). **`main`** = production branch. Promote with a PR `Develop → main`.
- GitHub ruleset `protect-develop` requires **`Lint and Test`** on PRs into Develop.
- GitHub ruleset `protect-main` requires **`Lint and Test`** AND **`Staging Smoke Test`** on PRs into main — a promotion cannot merge unless live staging is healthy. The gate job `.github/workflows/staging-smoke.yml` (`name: Staging Smoke Test`) probes staging `/health` (DB + Redis) and asserts a protected route returns 401. Both job names must stay exactly as the ruleset contexts or promotions can never merge.
- CI (`.github/workflows/ci.yml`) runs `pnpm build` before typecheck/integration so `@hostyllo/db` resolves. The `Lint and Test` job (id `lint-typecheck`) must keep `name: Lint and Test`.
- Promotion flow: `feature → PR → Develop` (Lint and Test) → auto-deploy **staging** → `PR Develop → main` (Lint and Test + Staging Smoke Test) → auto-deploy **production**.

---

## 9. Known failure modes → fixes (all hit & resolved 2026-07-22/23)

| Symptom | Cause | Fix |
|---|---|---|
| Edge `502 "Application failed to respond"` | domain targetPort (8080) ≠ app PORT | `PORT=8080` |
| Boot crash `ERR_MODULE_NOT_FOUND withTenant.js` | `db` not compiled | `buildCommand = pnpm build` + db build |
| `db:down` (health) | direct IPv6 host / cert not trusted | pooler host + `DATABASE_CA_CERT` |
| Worker spam `max requests limit 500000` | BullMQ on Upstash | migrated to Railway Redis via `REDIS_URL` |
| PRs to main never merge | ruleset needs check `Lint and Test` | CI gate job named accordingly |

---

## 10. Verify a deploy

```bash
# 1. health (liveness + backends)
curl -s https://hostyllo-production.up.railway.app/api/v1/health
#    → {"success":true,"data":{"db":"ok","redis":"ok","version":"1.0.0"}}

# 2. auth guard works (expect 401 / 400)
curl -s -X POST .../api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"x@y.z","password":"bad"}'
curl -s .../api/v1/students     # 401 Missing token

# 3. tenant isolation (as hostyllo_app, via DATABASE_URL_APP + CA):
#    no app.hostel_id context → 0 rows; correct hostel_id → own rows; wrong id → 0 rows.
```

---

## 11. Rollback (one-click, native)

A bad deploy reached production despite staging — roll back to the last-good deployment. **Nothing to build; Railway versions every deploy.**

- **Dashboard:** Railway → `hostyllo` service → **production** → Deployments → pick the last green deployment → **⋯ → Rollback** (or **Redeploy**). Instant; no rebuild.
- **CLI:** `railway redeploy --service hostyllo --environment production --yes` re-runs the current deployment. To go to an *older* commit, roll back a commit on `main` (revert the bad PR) — a push to `main` redeploys production — or use the dashboard Rollback on the specific prior deployment.
- After rollback, revert/fix on `Develop`, let it ride the staging gate, then re-promote. Don't hotfix `main` directly except in a true emergency (it bypasses the staging smoke gate).

Verify after rollback with §10.

---

## 12. Per-environment branch (staging pipeline ops)

The deploy branch is a **deployment trigger** per environment, not a service setting. `railway service source connect --branch X` is **service-global** and changes every environment — never use it to retarget one. To change a single environment's branch, use the Railway GraphQL API (token from `~/.railway/config.json` → `user.accessToken`, `User-Agent` header required or Cloudflare 1010s):

```
mutation($id:String!,$input:DeploymentTriggerUpdateInput!){
  deploymentTriggerUpdate(id:$id, input:$input){ id branch environmentId }
}
```

Find trigger ids: `project(id){ deploymentTriggers{ edges{ node{ id branch environmentId } } } }`.
Current: production trigger → `main`, staging trigger → `Develop`. Or set it in the dashboard: service → Settings → the environment's Source branch.

**Staging DB** is Supabase project `ljnuwmfnpofzlmioskfc` (hostyllo-staging), schema applied via `packages/db/migrate.mjs` (11 migrations + `hostyllo_app` role). Its `DATABASE_CA_CERT` is the same Supabase CA as prod (same regional pooler host). Staging env vars mirror prod except `DATABASE_URL*`, `REDIS_URL`, `SUPABASE_URL`; the unused `SUPABASE_SERVICE_KEY` is intentionally absent so no prod secret lives in staging.
