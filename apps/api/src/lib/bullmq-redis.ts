// BullMQ connection, derived from REDIS_URL (Railway Redis). Was pointed at Upstash via
// BULLMQ_REDIS_* — that per-command billing is what blew the 500k free-tier cap. Passing plain
// options (not a shared instance) lets BullMQ open its own connection per worker.
const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');

export const bullmqRedis = {
  host: url.hostname,
  port: Number(url.port || 6379),
  username: url.username || undefined,
  password: url.password ? decodeURIComponent(url.password) : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
};
