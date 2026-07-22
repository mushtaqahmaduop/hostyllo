import { defineConfig } from 'vitest/config';

// Integration suite (audit M5). globalSetup migrates + seeds the test DB once; individual tests
// skip themselves when DATABASE_URL is unset, so a plain `vitest` run without a DB is a no-op
// rather than a failure.
export default defineConfig({
  test: {
    globalSetup: ['./src/__tests__/globalSetup.ts'],
    include: ['src/__tests__/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 40_000,
    fileParallelism: false, // shared DB/Redis state — run test files serially
  },
});
