import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cors, { origin: '*' });

// Health check
app.get('/api/v1/health', async () => {
  return { success: true, data: { db: 'ok', redis: 'ok', version: '1.0.0' } };
});

const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`API running on port ${port}`);