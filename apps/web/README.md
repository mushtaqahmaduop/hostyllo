# @hostyllo/web

Next.js 16 (App Router) frontend for Hostyllo. Deploys to Vercel.

## Why the browser never talks to the API directly

Every request goes through this app's own server: pages fetch server-side via `src/lib/api.ts`, and
sign-in/out go through route handlers under `src/app/api/auth/`. Two reasons, both concrete:

1. **Tokens stay out of client JavaScript.** The access and refresh tokens live in httpOnly cookies
   this app owns. Nothing in the browser can read them.
2. **The API's refresh cookie is `sameSite: 'strict'`** (`apps/api/src/routes/auth.ts`), scoped to
   `path=/api/v1/auth/refresh`. A browser will not send a strict cookie on a cross-site request, and
   today the frontend (Vercel) and the API (Railway) are different sites — so a direct browser→API
   refresh would silently never carry the cookie and every session would die at the access token's
   expiry. Refreshing server-side avoids that, and keeps working unchanged once `app.hostyllo.app`
   and `api.hostyllo.app` make the two same-site.

## Vercel settings

| Setting | Value |
|---|---|
| Root Directory | `apps/web` |
| Framework preset | Next.js |
| Install command | `pnpm install --frozen-lockfile` (run from the repo root) |
| Production branch | `main` |
| Environment variable | `API_BASE_URL` — per-environment, see `.env.example` |

Preview deployments from `Develop` should point `API_BASE_URL` at the staging API so a preview never
writes to production data.

## Local development

```bash
# From the repo root, with the API running on :3001
API_BASE_URL=http://localhost:3001 pnpm --filter @hostyllo/web dev
```

Or against staging, which needs no local database:

```bash
API_BASE_URL=https://hostyllo-staging.up.railway.app pnpm --filter @hostyllo/web dev
```

## Design tokens

`src/app/tokens.css` is transcribed verbatim from `docs/04_UX_DESIGN_SYSTEM.md` §2, which states the
tokens are the single source of truth and that colours must never be hardcoded. Treat the CSS file as
generated: change the doc first.
