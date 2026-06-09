import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { authRoutes } from './routes/auth.js';
import { studentRoutes } from './routes/students.js';
import { roomsRoutes } from './routes/rooms.js';
import { paymentsRoutes } from './routes/payments.js';
import { expensesRoutes } from './routes/expenses.js';
import { dashboardRoutes } from './routes/dashboard.js';
import './workers/auto-cancel.js';
import './workers/pdf-receipts.js';
import './workers/rent-generate.js';

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
});
await app.register(cookie, {
  secret: process.env.COOKIE_SECRET ?? 'hostyllo-cookie-secret',
});
// Routes
app.register(authRoutes, { prefix: '/api/v1/auth' });
app.register(studentRoutes, { prefix: '/api/v1/students' });

app.register(roomsRoutes, { prefix: '/api/v1' });
app.register(paymentsRoutes, { prefix: '/api/v1' });
app.register(expensesRoutes, { prefix: '/api/v1' });
app.register(dashboardRoutes, { prefix: '/api/v1' });
// Health check
app.get('/api/v1/health', async () => {
  return { success: true, data: { db: 'ok', redis: 'ok', version: '1.0.0' } };
});

const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`API running on port ${port}`);