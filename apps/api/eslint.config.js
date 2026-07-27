import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import hostyllo from '@hostyllo/config';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
    },
  },
  // INVARIANT-2 & INVARIANT-3 — the tenant boundary, enforced only where it has teeth.
  //
  // Route handlers serve one authenticated tenant, so every DB call there must go through
  // withTenant() (which connects as the RLS-bound `hostyllo_app` role). Workers and the auth
  // bootstrap are deliberately cross-tenant and use the privileged pool — see migration 010 and
  // the header of packages/config/eslint-plugin-hostyllo/index.js. Legitimate privileged calls
  // inside src/routes carry a line-level eslint-disable with a justification.
  {
    files: ['src/routes/**/*.ts'],
    plugins: {
      hostyllo,
    },
    // An exception that stops being needed must not linger: a stale disable is how the boundary
    // quietly widens again.
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      'hostyllo/require-with-tenant': 'error',
      'hostyllo/no-hostel-id-from-request': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];