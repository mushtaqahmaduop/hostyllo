import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The API base is read at RUNTIME on the server (see lib/api.ts) and is never inlined into the
  // client bundle: the browser talks only to this app's own route handlers, so the API origin is
  // not a public value and can differ per environment without a rebuild.
  //
  // Note: Next 16 removed the `eslint` config key — linting is its own CI step (`pnpm run lint`)
  // and is not part of `next build`.
};

export default config;
