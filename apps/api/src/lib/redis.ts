import Redis from 'ioredis';

// TCP Redis via ioredis (Railway Redis / any redis://). Replaced the Upstash REST client — the
// per-command billing on Upstash's free tier was exhausted by the BullMQ workers. `lazyConnect`
// so importing this module never opens a socket (keeps `buildApp()` usable without a live Redis);
// the connection opens on the first command.
const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
const client = new Redis(url, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  family: 0, // dual-stack DNS — Railway's private network (redis.railway.internal) is IPv6-only
});
// Don't let a connection blip crash the process with an unhandled 'error' event.
client.on('error', (err) => { console.error('[redis] connection error:', err.message); });

export const redis = {
  async set(key: string, value: string, exSeconds?: number) {
    return exSeconds ? client.set(key, value, 'EX', exSeconds) : client.set(key, value);
  },
  async get(key: string): Promise<string | null> {
    return client.get(key);
  },
  async del(key: string) {
    return client.del(key);
  },
  async exists(key: string): Promise<number> {
    return client.exists(key);
  },
  /** Increment a counter; sets expiry on first increment only */
  async incr(key: string, exSeconds?: number): Promise<number> {
    const count = await client.incr(key);
    if (count === 1 && exSeconds) {
      await client.expire(key, exSeconds);
    }
    return count;
  },
  async expire(key: string, seconds: number) {
    return client.expire(key, seconds);
  },
  async ping(): Promise<string> {
    return client.ping();
  },
};
