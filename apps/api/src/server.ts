import 'dotenv/config';
import * as Sentry from '@sentry/node';
import Fastify from 'fastify';

// ── Sentry — init before anything else ───────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.2,
  });
}
// ─────────────────────────────────────────────────────────────────────────────
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth.js';
import { studentRoutes } from './routes/students.js';
import { roomsRoutes } from './routes/rooms.js';
import { paymentsRoutes } from './routes/payments.js';
import { expensesRoutes } from './routes/expenses.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { pool, dbHealthCheck } from './lib/db.js';
import { redis } from './lib/redis.js';

// ── Fail-fast: required env vars ────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) throw new Error('❌ CORS_ORIGIN is required (e.g. https://app.hostyllo.vercel.app)');

const cookieSecret = process.env.COOKIE_SECRET;
if (!cookieSecret) throw new Error('❌ COOKIE_SECRET is required (openssl rand -hex 32)');

if (!process.env.JWT_PRIVATE_KEY) throw new Error('❌ JWT_PRIVATE_KEY is required');
if (!process.env.JWT_PUBLIC_KEY)  throw new Error('❌ JWT_PUBLIC_KEY is required');
if (!process.env.DATABASE_URL)    throw new Error('❌ DATABASE_URL is required');
if (!process.env.UPSTASH_REDIS_REST_URL)   throw new Error('❌ UPSTASH_REDIS_REST_URL is required');
if (!process.env.UPSTASH_REDIS_REST_TOKEN) throw new Error('❌ UPSTASH_REDIS_REST_TOKEN is required');

const encryptionKeyHex = process.env.ENCRYPTION_KEY;
if (!encryptionKeyHex) throw new Error('❌ ENCRYPTION_KEY is required (openssl rand -hex 32)');
if (encryptionKeyHex.length !== 64) throw new Error('❌ ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)');
// ─────────────────────────────────────────────────────────────────────────────

const app = Fastify({
  logger: true,
  bodyLimit: 1024 * 100, // 100 KB
  requestTimeout: 30000,
});

// ── Global error handler ─────────────────────────────────────────────────────
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  const isProd = process.env.NODE_ENV === 'production';

  // Capture unhandled 5xx in Sentry
  if (!error.statusCode || error.statusCode >= 500) {
    Sentry.captureException(error, {
      extra: {
        url: request.url,
        method: request.method,
        hostelId: (request as any).hostelId,
        userId: (request as any).userId,
      },
    });
  }

  return reply.code(error.statusCode ?? 500).send({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: isProd ? 'An unexpected error occurred' : error.message,
    ...(isProd ? {} : { stack: error.stack }),
  });
});

process.on('unhandledRejection', (reason) => {
  app.log.error({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});
// ─────────────────────────────────────────────────────────────────────────────

await app.register(helmet);
await app.register(cors, { origin: corsOrigin, credentials: true });
await app.register(cookie, { secret: cookieSecret });

// ── Rate limiting ─────────────────────────────────────────────────────────────
await app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
  cache: 10000,
  keyGenerator: (request) => request.ip,
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Workers (with error handling) ────────────────────────────────────────────
async function initializeWorkers() {
  const workers = [
    { name: 'auto-cancel',   path: './workers/auto-cancel.js'   },
    { name: 'pdf-receipts',  path: './workers/pdf-receipts.js'  },
    { name: 'rent-generate', path: './workers/rent-generate.js' },
  ];

  for (const w of workers) {
    try {
      await import(w.path);
      app.log.info(`✅ Worker initialized: ${w.name}`);
    } catch (err) {
      app.log.error({ err }, `❌ Failed to initialize worker: ${w.name}`);
      throw err;
    }
  }
}

await initializeWorkers();
// ─────────────────────────────────────────────────────────────────────────────

// ── Routes ────────────────────────────────────────────────────────────────────
app.register(authRoutes,      { prefix: '/api/v1/auth' });
app.register(studentRoutes,   { prefix: '/api/v1/students' });
app.register(roomsRoutes,     { prefix: '/api/v1' });
app.register(paymentsRoutes,  { prefix: '/api/v1' });
app.register(expensesRoutes,  { prefix: '/api/v1' });
app.register(dashboardRoutes, { prefix: '/api/v1' });
// ─────────────────────────────────────────────────────────────────────────────

// ── Real health check ─────────────────────────────────────────────────────────
app.get('/api/v1/health', async (_request, reply) => {
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DB timeout')), 5000)
      ),
    ]);

    const redisPong = await redis.ping();
    if (redisPong !== 'PONG') throw new Error('Redis ping failed');

    return reply.send({
      success: true,
      data: { db: 'ok', redis: 'ok', version: '1.0.0', uptime: process.uptime() },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    app.log.error({ message }, 'Health check failed');
    return reply.code(503).send({
      success: false,
      data: { db: 'error', redis: 'error' },
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Startup connection validation ─────────────────────────────────────────────
app.log.info('🔗 Validating database connection...');
const dbOk = await dbHealthCheck();
if (!dbOk) throw new Error('❌ Failed to connect to database on startup');
app.log.info('✅ Database connected');
// ─────────────────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
app.log.info(`🚀 API running on port ${port}`);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Shutdown signal received — draining...');
  try {
    await app.close();
    await pool.end();
    await Sentry.close(2000);
    app.log.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
