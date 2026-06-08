const Fastify = require('fastify')
const { createClient } = require('@supabase/supabase-js')
const Redis = require('ioredis')

const app = Fastify({ logger: true })

// ─── CORS ────────────────────────────────────────────────────────────────────
app.register(require('@fastify/cors'), {
  orign: '*', // tighten this in production
})

// ─── Clients ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const redis = new Redis(process.env.REDIS_URL, {
  tls: {}, // required for rediss:// (Upstash)
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  lazyConnect: true,
})

// ─── Routes ──────────────────────────────────────────────────────────────────

// Root
app.get('/', async () => {
  return {
    app: 'HOSTYLLO API',
    version: '0.1.0-prototype',
    status: 'running',
    message: 'Pakistan\'s #1 Hostel Management SaaS 🇵🇰',
  }
})

// Health check — used by Railway + Uptime Robot
app.get('/health', async () => {
  const checks = {
    api: 'ok',
    db: 'checking',
    redis: 'checking',
    timestamp: new Date().toISOString(),
    region: process.env.RAILWAY_REGION || 'unknown',
    environment: process.env.NODE_ENV || 'development',
  }

  // Check Supabase
  try {
    const { error } = await supabase.from('_health_check').select('*').limit(1)
    // Table won't exist yet — but a connection error vs table-not-found tells us DB is reachable
    if (error && error.code === '42P01') {
      checks.db = 'ok' // connected, table just doesn't exist yet
    } else if (error) {
      checks.db = `error: ${error.message}`
    } else {
      checks.db = 'ok'
    }
  } catch (err) {
    checks.db = `error: ${err.message}`
  }

  // Check Redis
  try {
    await redis.connect().catch(() => {}) // ignore if already connected
    const pong = await redis.ping()
    checks.redis = pong === 'PONG' ? 'ok' : 'unexpected response'
    await redis.disconnect()
  } catch (err) {
    checks.redis = `error: ${err.message}`
  }

  const allOk = checks.db === 'ok' && checks.redis === 'ok'
  return checks
})

// Detailed connection test — for your own debugging
app.get('/test', async (req, reply) => {
  const results = {
    supabase: { status: 'untested', detail: null },
    redis: { status: 'untested', detail: null },
  }

  // ── Supabase test ──
  try {
    const start = Date.now()
    const { error } = await supabase.from('_connection_test').select('*').limit(1)
    const latency = Date.now() - start

    if (error && error.code === '42P01') {
      results.supabase = {
        status: '✅ Connected',
        detail: `Supabase reachable in ${latency}ms. (Table doesn't exist yet — that's fine)`,
      }
    } else if (error) {
      results.supabase = {
        status: '❌ Error',
        detail: error.message,
      }
    } else {
      results.supabase = {
        status: '✅ Connected',
        detail: `Latency: ${latency}ms`,
      }
    }
  } catch (err) {
    results.supabase = { status: '❌ Failed', detail: err.message }
  }

  // ── Redis test ──
  try {
    const redisClient = new Redis(process.env.REDIS_URL, {
      tls: {},
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    })
    const start = Date.now()
    await redisClient.set('hostyllo:test', 'hello', 'EX', 60)
    const value = await redisClient.get('hostyllo:test')
    const latency = Date.now() - start
    await redisClient.quit()

    results.redis = {
      status: value === 'hello' ? '✅ Connected' : '⚠️ Unexpected value',
      detail: `SET + GET succeeded in ${latency}ms`,
    }
  } catch (err) {
    results.redis = { status: '❌ Failed', detail: err.message }
  }

  return {
    message: 'HOSTYLLO Connection Test',
    timestamp: new Date().toISOString(),
    results,
  }
})

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log(`
  ╔══════════════════════════════════════╗
  ║      HOSTYLLO API — PROTOTYPE        ║
  ║  Pakistan's #1 Hostel SaaS 🇵🇰        ║
  ╠══════════════════════════════════════╣
  ║  Port    : ${PORT}                      ║
  ║  Health  : /health                   ║
  ║  Test    : /test                     ║
  ╚══════════════════════════════════════╝
  `)
})
