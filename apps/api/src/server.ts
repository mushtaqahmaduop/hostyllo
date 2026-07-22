import 'dotenv/config';
import { buildApp } from './app.js';
import { validateEnv } from './lib/env.js';
import './workers/auto-cancel.js';
import './workers/pdf-receipts.js';
import './workers/rent-generate.js';
import './workers/billing-sync.js';
import './workers/email-send.js';

// Fail fast on missing/placeholder secrets (audit M4). Throws in production, warns in dev.
validateEnv();

const app = await buildApp();
const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`API running on port ${port}`);
