# 14 · Deployment Runbook (Production)

Single source of truth for how Hostyllo's API runs in production and how to operate it.
Last verified live: 2026-07-23 — `{"success":true,"data":{"db":"ok","redis":"ok"}}`.

> **The frontend (Vercel) has never deployed successfully.** See §13 — it is one Project Setting,
> and it is a founder action. Every other item below concerns the Railway API, which is live.

---

## 1. Production stack

| Piece | Where | Notes |
|---|---|---|
| API (`@hostyllo/api`) | Railway project **Hostyllo** → service **hostyllo**, env `production` | https://hostyllo-production.up.railway.app |
| Redis | Railway plugin **Redis** (`redis-volume`) | cache + BullMQ queues |
| Postgres | **Supabase** (project ref `eprrhckgtrerknenngdy`) | via Supavisor pooler (IPv4) |
| Errors | **Sentry** — org `zeerak-services`, project `hostyllo-api` (region `de.sentry.io`) | |
| Uptime | **UptimeRobot** (external, 5-min) → email alerts, on `/api/v1/ready`. GitHub Actions `uptime.yml` is a hourly backup probe. | primary = UptimeRobot |

Two probes:
- **`GET /api/v1/health`** → **always `200`** with `{success, data:{db, redis, version}}` (**liveness** — never fails so the Railway deploy healthcheck can't tear down a working process; `success` is `db && redis`).
- **`GET /api/v1/ready`** → `200` when healthy, **`503` when `db` or `redis` is down** (**readiness** — for external HTTP monitors like UptimeRobot, since a plain HTTP monitor only sees the status code). Same body shape.

There is intentionally no `GET /` route (a `404` there is normal; a `502` is not).

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

- **Errors:** Sentry SDK (`apps/api/src/instrument.ts`, imported first in `server.ts`). Captures 5xx (central error handler) + `unhandledRejection`/`uncaughtException`. No-op when `SENTRY_DSN` is unset. `environment` = `SENTRY_ENVIRONMENT` (staging/production) ?? `NODE_ENV`, so staging and prod are separated even though both run `NODE_ENV=production`.
- **Uptime:** **UptimeRobot** (external, 5-min HTTP monitors on `/api/v1/ready` for prod + staging → email alerts) is primary. `/ready` returns 503 when a backend is down, so a free HTTP monitor catches "app up but DB/Redis down" — not just process-down. Free plan blocks monitor *creation* via API, so add them in the UptimeRobot dashboard (reads/deletes still work via API, key `u3510412-…`). `.github/workflows/uptime.yml` remains a lightweight hourly backup probe on `/ready` (emails on failure). The old Sentry Crons monitor `hostyllo-uptime` was decommissioned — GitHub throttles the `*/10` schedule to ~hourly, which caused false "missed check-in" alerts; delete that monitor in Sentry → Crons.

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

---

## 13. Frontend (Vercel) — ⚠️ has never deployed successfully

Project **`hostyllo.web`** (`prj_voZlvDgX4knrEQ0yHMx6uoIzZEjC`), team `mushtaqs-projects-ed730108`.
Every deployment since the project was created is in `ERROR` state — including ones from before
`apps/web` existed.

**The app is not the problem.** The build log from the 2026-07-28 run shows Next compiling cleanly,
TypeScript passing and all 13 routes generating. Only the final packaging step fails.

Two configuration errors, in order:

1. **`framework: null` + Root Directory at the repo root.** With no framework detected, Vercel runs
   the build (which succeeds) and then looks for a static `public/` directory at the repo root:
   `Error: No Output Directory named "public" found after the Build completed.`
2. Adding a root `vercel.json` with `framework: "nextjs"` moved the error but did not fix it:
   `Error: No Next.js version detected. Make sure your package.json has "next" in either
   "dependencies" or "devDependencies".` Framework detection reads the package.json **in the Root
   Directory** — the repo root's has only `turbo`. No amount of `vercel.json` can fix this, which is
   why that file was removed again rather than left as dead config.

### The fix — one Project Setting, founder action

> Vercel → project **hostyllo.web** → Settings → Build & Deployment → **Root Directory** = `apps/web`

That is sufficient on its own. With it set, Vercel finds `apps/web/package.json`, auto-detects
Next.js, and runs `next build` there. `apps/web` has no workspace dependencies, so nothing else
needs compiling; leave "Include source files outside the Root Directory" **on**, because pnpm needs
the root `pnpm-workspace.yaml` and lockfile to install.

Equivalent via the REST API, if a token is to hand:

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/prj_voZlvDgX4knrEQ0yHMx6uoIzZEjC?teamId=team_sayArFSzn74VPxYLn2pRgA5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d '{"rootDirectory":"apps/web","framework":"nextjs"}'
```

### Then: the runtime env var

`apps/web` reads **`API_BASE_URL`** on the server at request time (never inlined into the client
bundle — the browser only ever talks to this app's own route handlers). It must be set per Vercel
environment or every page that fetches will fail at runtime even once the build is green:

| Vercel environment | Value |
|---|---|
| Production | `https://hostyllo-production.up.railway.app` (→ `https://api.hostyllo.app` once DNS is set) |
| Preview | `https://hostyllo-staging.up.railway.app` |

Note the build going green does **not** prove this is set: `/login` renders without it, and only the
authenticated screens fetch. Verify by loading `/login`, signing in, and reaching `/dashboard`.
