import 'dotenv/config';
import './instrument.js'; // Sentry.init — must run before the app/routes are imported
import { Sentry } from './instrument.js';
import { buildApp } from './app.js';
import { validateEnv } from './lib/env.js';

/*
 * Background processing is opt-in per environment (WORKERS_ENABLED), default OFF.
 *
 * Until 2026-07-30 the workers were imported unconditionally and no producer existed, so they idled
 * against empty queues — inert, but also invisible. Now that `lib/queues.ts` and `workers/dispatch.ts`
 * actually enqueue work, enabling this flag changes live behaviour: rent is generated, pending
 * cancellations are confirmed (freeing beds) and trials expire. Prove it on staging before prod.
 *
 * Imports are dynamic because the worker modules construct their `Worker` at module scope — a
 * static import would start them regardless of the flag.
 */
const workersEnabled = process.env.WORKERS_ENABLED === 'true';

// Report crashes that escape the request lifecycle (worker rejections, etc.) to Sentry instead
// of dying silently. Don't exit on unhandledRejection — a single bad job must not kill the API.
process.on('unhandledRejection', (reason) => { console.error('[unhandledRejection]', reason); Sentry.captureException(reason); });
process.on('uncaughtException', (err) => { console.error('[uncaughtException]', err); Sentry.captureException(err); });

// Fail fast on missing/placeholder secrets (audit M4). Throws in production, warns in dev.
validateEnv();

if (workersEnabled) {
  // The pdf-receipts worker is gone: receipts are rendered on demand by GET /payments/:id/receipt.
  // See docs/05_API_SPECIFICATION.md Module 4 for why a stored file was the wrong shape here.
  await import('./workers/auto-cancel.js');
  await import('./workers/rent-generate.js');
  await import('./workers/billing-sync.js');
  await import('./workers/email-send.js');
  const { registerSchedulers } = await import('./workers/dispatch.js');
  await registerSchedulers();
  console.log('[server] workers ENABLED (4 workers + dispatch)');
} else {
  console.log('[server] workers DISABLED (set WORKERS_ENABLED=true to run background jobs)');
}

const app = await buildApp();
const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`API running on port ${port}`);
