import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, API_BASE } from '@/lib/api';
import { NAME_COOKIE, ROLE_COOKIE } from '@/lib/session';
import { cookies } from 'next/headers';

/**
 * Logout. Clears this app's cookies and tells the API to revoke the tokens, so a stolen access
 * token cannot outlive the sign-out — the API blocklists its jti.
 */
export async function POST() {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_COOKIE)?.value;
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;

  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(refreshToken ? { cookie: `refreshToken=${refreshToken}` } : {}),
      },
      cache: 'no-store',
    });
  } catch {
    // Never block sign-out on the API being reachable. Clearing the cookies below is what the
    // user asked for; revocation is best-effort and the tokens expire on their own.
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  // Cleared with the rest: a stale role left behind would draw the previous user's buttons on the
  // next sign-in until their own login overwrote it.
  res.cookies.delete(ROLE_COOKIE);
  res.cookies.delete(NAME_COOKIE);
  return res;
}
