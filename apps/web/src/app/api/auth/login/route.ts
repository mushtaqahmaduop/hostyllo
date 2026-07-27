import { NextResponse } from 'next/server';
import { loginRequest, ACCESS_COOKIE, REFRESH_COOKIE, API_BASE } from '@/lib/api';

/**
 * Login proxy. The browser posts here, never to the API directly.
 *
 * This handler is the only place tokens are written. It converts the API's response — an access
 * token in the body and a refresh token in a Set-Cookie scoped to the API's own domain and path —
 * into two first-party httpOnly cookies this app can actually read on later requests.
 */
export async function POST(request: Request) {
  let email: string;
  let password: string;
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Email and password are required.' }, { status: 400 });
    }
    email = body.email;
    password = body.password;
  } catch {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid request body.' }, { status: 400 });
  }

  let result;
  try {
    result = await loginRequest(email, password);
  } catch {
    // The API being unreachable is an operational failure, not a credentials failure — saying
    // "invalid email or password" here would send the user hunting for a typo that isn't there.
    return NextResponse.json(
      { code: 'UPSTREAM_UNAVAILABLE', message: 'Cannot reach the Hostyllo service. Please try again shortly.' },
      { status: 503 },
    );
  }

  if (!result.ok) {
    // The API deliberately returns the same message for a wrong password and an unknown email, so
    // it is passed through verbatim rather than reworded — rewording risks reintroducing the user
    // enumeration the API takes care to avoid. 429 (rate limit) also passes through as-is.
    const status = result.status === 429 ? 429 : 401;
    return NextResponse.json(
      { code: result.body.code ?? 'UNAUTHORIZED', message: result.body.message ?? 'Sign in failed.' },
      { status },
    );
  }

  const accessToken = result.body.data?.accessToken;
  if (!accessToken) {
    return NextResponse.json({ code: 'UPSTREAM_ERROR', message: 'Sign in failed.' }, { status: 502 });
  }

  const res = NextResponse.json({ user: result.body.data?.user ?? null });
  const secure = process.env.NODE_ENV === 'production';

  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    // Matches the API's access-token lifetime. Expiry is not the security boundary — the API
    // verifies the signature on every call — but letting it linger only produces failed requests.
    maxAge: 60 * 15,
  });

  if (result.refreshToken) {
    res.cookies.set(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  } else {
    // Worth failing loudly in logs: without it every session dies after 15 minutes with no
    // obvious cause, which is exactly the kind of bug that gets misdiagnosed as "flaky login".
    console.error(`[auth] login succeeded but no refreshToken cookie came back from ${API_BASE}`);
  }

  return res;
}
