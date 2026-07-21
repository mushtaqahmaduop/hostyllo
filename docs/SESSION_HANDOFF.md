# HOSTYLLO — Session Handoff
## For next Claude session — read this first

### What was built in Session 1
- ✅ Monorepo (pnpm + Turborepo)
- ✅ ESLint plugin (require-with-tenant + no-hostel-id-from-request)
- ✅ packages/db: withTenant.ts + paymentService.ts + formatters.ts
- ✅ 14 payment unit tests — ALL PASSING
- ✅ Fastify API server running on port 3001
- ✅ /api/v1/health endpoint working
- ✅ All 28 database tables in Supabase with RLS = true
- ✅ apps/api/src/lib/db.ts + redis.ts + jwt.ts created
- ✅ apps/api/src/routes/auth.ts created
- ✅ @fastify/cookie + pg + bcrypt + jose installed

### What to do NEXT session (start here)
1. Run `pnpm dev` and confirm server starts
2. Test login endpoint — it was 404 last session because pg was missing
   - pg is now installed, should work
3. Run this test:
```powershell
   Invoke-WebRequest -Uri "http://127.0.0.1:3001/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"zeerak@hostyllo.app","password":"Test@1234"}'
```
4. If login works → build JWT middleware (src/middleware/auth.ts)
5. Then build students endpoints (7 endpoints)
6. Then build rooms endpoints (6 endpoints)
7. Then build payments endpoints (8 endpoints)
8. Then deploy to Railway + Vercel

### Test credentials in Supabase
- Email: zeerak@hostyllo.app
- Password: Test@1234
- Role: hostel_owner
- Hostel: Test Hostel Peshawar

### Key file locations
- API server: apps/api/src/server.ts
- Auth routes: apps/api/src/routes/auth.ts
- DB connection: apps/api/src/lib/db.ts
- Redis client: apps/api/src/lib/redis.ts
- JWT utils: apps/api/src/lib/jwt.ts
- Migrations: packages/db/migrations/

### Environment variables (in apps/api/.env)
- SUPABASE_URL — set ✅
- JWT_PRIVATE_KEY — set ✅
- JWT_PUBLIC_KEY — set ✅
- UPSTASH_REDIS_REST_URL — set ✅
- UPSTASH_REDIS_REST_TOKEN — set ✅
- NODE_ENV=development
- PORT=3001

### CRITICAL INVARIANTS — never violate
1. RS256 only in JWT — never HS256
2. withTenant() wraps every DB query
3. hostel_id from JWT only — never from req.body/params
4. Payment amounts: NUMERIC(10,2) only
5. audit_log: INSERT only
6. Supabase PITR before real client data

### Repo
- GitHub: https://github.com/mushtaqahmaduop/hostyllo
- Branch: Develop (all work here, merge to main only when phase complete)
- Local: C:\hostyllo