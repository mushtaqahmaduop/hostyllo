import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth.js';
import { studentRoutes } from './routes/students.js';
import { roomsRoutes } from './routes/rooms.js';
import { paymentsRoutes } from './routes/payments.js';
import { expensesRoutes } from './routes/expenses.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { cancellationsRoutes } from './routes/cancellations.js';
import { maintenanceRoutes } from './routes/maintenance.js';
import { complaintsRoutes } from './routes/complaints.js';
import { checkinRoutes } from './routes/checkin.js';
import { noticesRoutes } from './routes/notices.js';
import { transfersRoutes } from './routes/transfers.js';
import { finesRoutes } from './routes/fines.js';
import { usersRoutes } from './routes/users.js';
import { settingsRoutes } from './routes/settings.js';
import { auditLogRoutes } from './routes/audit-log.js';
import { dbHealthCheck } from './lib/db.js';
import { redis } from './lib/redis.js';
import { validateEnv } from './lib/env.js';
import './workers/auto-cancel.js';
import './workers/pdf-receipts.js';
import './workers/rent-generate.js';
import './workers/billing-sync.js';
import './workers/email-send.js';

// Fail fast on missing/placeholder secrets (audit M4). Throws in production, warns in dev.
validateEnv();

const isProd = process.env.NODE_ENV === 'production';
const app = Fastify({ logger: true });

// Global error handler — never leak stack traces, always return the {success,code,message}
// envelope every route uses. Fastify schema-validation failures arrive here with
// `error.validation` set; everything else is treated as an unexpected 500.
app.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    return reply.code(400).send({
      success: false,
      code: 'VALIDATION_ERROR',
      message: error.message,
    });
  }

  const status = error.statusCode ?? 500;
  if (status >= 500) {
    request.log.error({ err: error }, 'unhandled error');
    return reply.code(status).send({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  }

  // Deliberate 4xx thrown by a handler (e.g. reply.code(x).send(...) escaping) — pass through.
  return reply.code(status).send({
    success: false,
    code: (error as { code?: string }).code ?? 'ERROR',
    message: error.message,
  });
});

await app.register(helmet);
await app.register(cors, {
  // Prod requires CORS_ORIGIN (validated above); dev falls back to localhost. No prod fail-open.
  origin: process.env.CORS_ORIGIN ?? (isProd ? false : 'http://localhost:3000'),
  credentials: true,
});
await app.register(cookie, {
  // Prod requires a real COOKIE_SECRET (validated above); the dev-only fallback is clearly named.
  secret: process.env.COOKIE_SECRET ?? 'dev-only-insecure-cookie-secret',
});
await app.register(multipart, {
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2MB cap for CSV imports
});
// Routes
app.register(authRoutes, { prefix: '/api/v1/auth' });
app.register(studentRoutes, { prefix: '/api/v1/students' });
app.register(roomsRoutes, { prefix: '/api/v1' });
app.register(paymentsRoutes, { prefix: '/api/v1' });
app.register(expensesRoutes, { prefix: '/api/v1' });
app.register(dashboardRoutes, { prefix: '/api/v1' });
app.register(cancellationsRoutes, { prefix: '/api/v1' });
app.register(maintenanceRoutes, { prefix: '/api/v1' });
app.register(complaintsRoutes, { prefix: '/api/v1' });
app.register(checkinRoutes, { prefix: '/api/v1' });
app.register(noticesRoutes, { prefix: '/api/v1' });
app.register(transfersRoutes, { prefix: '/api/v1' });
app.register(finesRoutes, { prefix: '/api/v1' });
app.register(usersRoutes, { prefix: '/api/v1' });
app.register(settingsRoutes, { prefix: '/api/v1' });
app.register(auditLogRoutes, { prefix: '/api/v1' });
// Health check — actually probes both backing services. Returns 503 if either is
// down so uptime monitors and the Phase 1 gate ("/health returns db: ok") mean something.
app.get('/api/v1/health', async (_request, reply) => {
  const [dbOk, redisOk] = await Promise.all([
    dbHealthCheck(),
    redis.ping().then((r) => r === 'PONG').catch(() => false),
  ]);

  const healthy = dbOk && redisOk;
  return reply.code(healthy ? 200 : 503).send({
    success: healthy,
    data: {
      db: dbOk ? 'ok' : 'down',
      redis: redisOk ? 'ok' : 'down',
      version: '1.0.0',
    },
  });
});
const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`API running on port ${port}`);
