// BullMQ connection config — passed as plain object, not ioredis instance
// This avoids ioredis version mismatch between BullMQ's bundled version and ours
export const bullmqRedis = {
  host: process.env.BULLMQ_REDIS_HOST!,
  port: Number(process.env.BULLMQ_REDIS_PORT ?? 6379),
  password: process.env.BULLMQ_REDIS_PASSWORD!,
  tls: {},
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};