import Fastify, { FastifyInstance } from 'fastify';
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
import * as Sentry from '@sentry/node';
import { dbHealthCheck } from './lib/db.js';
import { redis } from './lib/redis.js';

// Builds the Fastify app WITHOUT listening or starting workers — the unit under test for the
// integration suite (audit M5), and the app the production entrypoint (server.ts) starts.
export async function buildApp(): Promise<FastifyInstance> {
  const isProd = process.env.NODE_ENV === 'production';
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : { level: process.env.LOG_LEVEL ?? 'info' },
  });

  // Global error handler — never leak stack traces, always return the {success,code,message}
  // envelope. Fastify schema-validation failures arrive with `error.validation` set.
  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR', message: error.message });
    }
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      request.log.error({ err: error }, 'unhandled error');
      Sentry.captureException(error);
      return reply.code(status).send({ success: false, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
    }
    return reply.code(status).send({
      success: false,
      code: (error as { code?: string }).code ?? 'ERROR',
      message: error.message,
    });
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? (isProd ? false : 'http://localhost:3000'),
    credentials: true,
  });
  await app.register(cookie, {
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

  // Liveness check — 200 as long as the process is serving. It still probes db + redis and
  // reports their status in the body (for readiness/monitoring), but a transient backend blip
  // must NOT fail the platform deploy healthcheck and tear down a working process.
  app.get('/api/v1/health', async (_request, reply) => {
    const [dbOk, redisOk] = await Promise.all([
      dbHealthCheck().catch(() => false),
      redis.ping().then((r) => r === 'PONG').catch(() => false),
    ]);
    return reply.code(200).send({
      success: dbOk && redisOk,
      data: { db: dbOk ? 'ok' : 'down', redis: redisOk ? 'ok' : 'down', version: '1.0.0' },
    });
  });

  // Readiness check for EXTERNAL uptime monitors (UptimeRobot). Unlike /health (liveness — always
  // 200 so the platform deploy healthcheck never tears down a working process), this returns 503
  // when a backend is down, so a plain HTTP monitor detects "process up but DB/Redis down".
  app.get('/api/v1/ready', async (_request, reply) => {
    const [dbOk, redisOk] = await Promise.all([
      dbHealthCheck().catch(() => false),
      redis.ping().then((r) => r === 'PONG').catch(() => false),
    ]);
    const ready = dbOk && redisOk;
    return reply.code(ready ? 200 : 503).send({
      success: ready,
      data: { db: dbOk ? 'ok' : 'down', redis: redisOk ? 'ok' : 'down', version: '1.0.0' },
    });
  });

  return app;
}
