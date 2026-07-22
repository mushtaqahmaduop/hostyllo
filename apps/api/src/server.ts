import 'dotenv/config';
import './instrument.js'; // Sentry.init — must run before the app/routes are imported
import { Sentry } from './instrument.js';
import { buildApp } from './app.js';
import { validateEnv } from './lib/env.js';
import './workers/auto-cancel.js';
import './workers/pdf-receipts.js';
import './workers/rent-generate.js';
import './workers/billing-sync.js';
import './workers/email-send.js';

// Report crashes that escape the request lifecycle (worker rejections, etc.) to Sentry instead
// of dying silently. Don't exit on unhandledRejection — a single bad job must not kill the API.
process.on('unhandledRejection', (reason) => { console.error('[unhandledRejection]', reason); Sentry.captureException(reason); });
process.on('uncaughtException', (err) => { console.error('[uncaughtException]', err); Sentry.captureException(err); });

// Fail fast on missing/placeholder secrets (audit M4). Throws in production, warns in dev.
validateEnv();

const app = await buildApp();
const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`API running on port ${port}`);
