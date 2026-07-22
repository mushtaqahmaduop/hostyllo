// Sentry initialisation. Imported FIRST in server.ts (before the app/routes) so the SDK can
// instrument the runtime. No-op when SENTRY_DSN is unset — dev, test and CI run untouched.
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Errors always report. Perf tracing off by default (opt in via env) to avoid overhead/cost.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
  });
}

export const sentryEnabled = Boolean(dsn);
export { Sentry };
