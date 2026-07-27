import { NextResponse, type NextRequest } from 'next/server';

/**
 * Route protection.
 *
 * This is a redirect for unauthenticated *navigation*, not an authorization check — it only looks
 * for the presence of a cookie, never at its contents. Every actual permission decision is made
 * by the API, which verifies the RS256 signature and applies the PRD §4.2 role matrix. Treating a
 * cookie's existence as proof of anything would be exactly the kind of client-side "security" that
 * is trivially bypassed.
 */
const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('hostyllo_at') || request.cookies.has('hostyllo_rt');

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    // Already signed in and heading for the login page — send them where they meant to go.
    if (hasSession) return NextResponse.redirect(new URL('/dashboard', request.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL('/login', request.url);
    // Preserve the destination so sign-in returns the user to the page they asked for.
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the auth route handlers (which must be reachable while
  // signed out), and static assets.
  matcher: ['/((?!_next/static|_next/image|api/auth|favicon.ico|manifest.json).*)'],
};
