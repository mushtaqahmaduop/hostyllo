import 'server-only';
import { cookies } from 'next/headers';

/**
 * Server-side client for the Hostyllo API.
 *
 * Nothing here ever runs in the browser. The browser talks only to this app's own route handlers,
 * which means the API origin is not a public value and, more importantly, the access token never
 * reaches client JavaScript — it lives in an httpOnly cookie this app owns.
 *
 * That indirection is not decoration. The API issues its refresh cookie with `sameSite: 'strict'`
 * and `path: /api/v1/auth/refresh` (apps/api/src/routes/auth.ts). A browser will not send a
 * strict cookie on a cross-site request, and today the frontend (Vercel) and the API (Railway) are
 * different sites — so a direct browser→API refresh would silently never carry the cookie. Doing
 * the refresh server-side sidesteps that entirely, and keeps working unchanged once the planned
 * `app.hostyllo.app` / `api.hostyllo.app` domains make the two same-site.
 */

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';

export const ACCESS_COOKIE = 'hostyllo_at';
export const REFRESH_COOKIE = 'hostyllo_rt';

/** The envelope every endpoint returns — see docs/05_API_SPECIFICATION.md "Global standards". */
type Envelope<T> = {
  success: boolean;
  data: T | null;
  code?: string;
  message?: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readEnvelope<T>(res: Response): Promise<Envelope<T>> {
  try {
    return (await res.json()) as Envelope<T>;
  } catch {
    // A non-JSON body means something upstream of the app answered — a proxy error page, a 502
    // from the platform. Surfacing the status is more useful than a JSON parse error.
    return { success: false, data: null, code: 'UPSTREAM_ERROR', message: `Upstream returned ${res.status}` };
  }
}

/**
 * Exchanges the stored refresh token for a new access token. Returns the new access token, or
 * null if the session is genuinely over (which the caller turns into a redirect to /login).
 */
async function refresh(): Promise<string | null> {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  // The API reads the refresh token from its own cookie, so it is forwarded as one rather than as
  // a bearer header. This app's cookie name is deliberately different from the API's to keep the
  // two namespaces from colliding once both live under hostyllo.app.
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { cookie: `refreshToken=${refreshToken}` },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const body = await readEnvelope<{ accessToken: string }>(res);
  return body.data?.accessToken ?? null;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /**
   * Extra request headers. Needed for `x-idempotency-key`, which `POST /payments` requires — the
   * API keys the payment row on it, so replaying the same key returns the original payment rather
   * than creating a second one.
   */
  headers?: Record<string, string>;
};

/**
 * Calls the API with the current access token, transparently refreshing once on a 401.
 *
 * Throws ApiError on any non-2xx so callers deal in data, not status codes. A 401 that survives
 * the refresh is thrown as `SESSION_EXPIRED`, which the layout turns into a redirect.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return unwrap<T>(await apiRaw(path, options));
}

/**
 * The same authenticated call, handed back as a `Response`.
 *
 * `api()` assumes an envelope and parses JSON, which is right for every endpoint
 * that returns one — and wrong for `GET /payments/:id/receipt`, which streams a
 * PDF. A route handler proxying that PDF needs the bytes and the content headers,
 * not a parsed body, but it needs exactly the same token handling: the browser
 * cannot call the API itself, and an access token expires every fifteen minutes,
 * so a receipt click on a page left open over lunch must refresh rather than
 * bounce the operator to the login screen.
 *
 * Sharing this with `api()` is the point. When the refresh-and-retry lived in one
 * function, any second caller either duplicated it or quietly did without it.
 */
export async function apiRaw(path: string, options: RequestOptions = {}): Promise<Response> {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_COOKIE)?.value;

  // Built once and reused by the retry below. When the two calls were spelled out separately, the
  // retry was one edit away from silently dropping a header the first call sent — and for
  // `x-idempotency-key` that would turn a refresh-during-submit into a duplicate payment.
  const send = (token: string | undefined) =>
    fetch(`${API_BASE}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      // Every response is tenant-scoped and frequently mutated; a cached page would leak one
      // hostel's data into another's request.
      cache: 'no-store',
    });

  const res = await send(accessToken);

  if (res.status === 401) {
    const fresh = await refresh();
    if (fresh) {
      // Retried inline rather than by recursing, so there is exactly one refresh attempt per
      // request and no path back into this branch. Server Components cannot set cookies, so the
      // rotated token is used for this request only; the next request refreshes again until a
      // route handler (which can write cookies) persists a new one.
      return send(fresh);
    }
    throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
  }

  return res;
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = await readEnvelope<T>(res);
  if (!res.ok || !body.success) {
    throw new ApiError(res.status, body.code ?? 'ERROR', body.message ?? 'Request failed');
  }
  return body.data as T;
}

export type SessionUser = {
  userId: string;
  email: string;
  role: 'hostel_owner' | 'chain_manager' | 'warden' | 'viewer';
  hostelId: string;
  displayName: string | null;
  theme: string;
  language: string;
};

/**
 * Raw login call — used only by the login route handler, which owns the cookie writes.
 *
 * The API returns the refresh token as a Set-Cookie header rather than in the body, so it is
 * parsed out here and re-issued as this app's own first-party cookie. That re-issue is the whole
 * point of the proxy: the API's cookie is scoped to the API's domain and path and would never be
 * sent by a browser talking to this app.
 */
export async function loginRequest(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });
  const body = await readEnvelope<{ accessToken: string; user: SessionUser }>(res);

  const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const refreshToken = extractCookie(setCookie, 'refreshToken');

  return { ok: res.ok && body.success, status: res.status, body, refreshToken };
}

/**
 * Pulls one cookie's value out of a Set-Cookie header list.
 *
 * Parsed by hand rather than with a built regex: the name is interpolated, and a template literal
 * silently drops the backslash in `\s`, which would have produced a pattern that matched the
 * wrong thing without failing loudly.
 */
function extractCookie(setCookieHeaders: string[], name: string): string | null {
  const prefix = `${name}=`;
  for (const header of setCookieHeaders) {
    const first = header.split(';', 1)[0].trim();
    if (first.startsWith(prefix)) return decodeURIComponent(first.slice(prefix.length));
  }
  return null;
}

export { API_BASE };
