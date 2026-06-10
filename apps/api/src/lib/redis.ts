// Upstash Redis via HTTP REST API — no TCP connection needed
const baseUrl = process.env.UPSTASH_REDIS_REST_URL!;
const token   = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisCommand(command: string[]) {
  const res = await fetch(`${baseUrl}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const data = await res.json() as { result: unknown; error?: string };
  if (data.error) throw new Error(`Redis error: ${data.error}`);
  return data.result;
}

export const redis = {
  async set(key: string, value: string, exSeconds?: number) {
    if (exSeconds) {
      return redisCommand(['SET', key, value, 'EX', String(exSeconds)]);
    }
    return redisCommand(['SET', key, value]);
  },
  async get(key: string) {
    return redisCommand(['GET', key]) as Promise<string | null>;
  },
  async del(key: string) {
    return redisCommand(['DEL', key]);
  },
  async exists(key: string) {
    return redisCommand(['EXISTS', key]) as Promise<number>;
  },
  /** Increment a counter; sets expiry on first increment only */
  async incr(key: string, exSeconds?: number): Promise<number> {
    const count = await redisCommand(['INCR', key]) as number;
    if (count === 1 && exSeconds) {
      await redisCommand(['EXPIRE', key, String(exSeconds)]);
    }
    return count;
  },
  async ping(): Promise<string> {
    return redisCommand(['PING']) as Promise<string>;
  },
};
