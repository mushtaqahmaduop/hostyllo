import 'server-only';
import { cookies } from 'next/headers';

/**
 * The signed-in user's role, as a *presentation* hint.
 *
 * This is not an authorization check and must never be treated as one. The API verifies the RS256
 * access token on every request and applies the PRD §4.2 matrix itself (apps/api/src/lib/roles.ts);
 * this cookie only decides whether it is worth rendering a button that a `viewer` would receive a
 * 403 from. Showing a control that always fails is a worse experience than hiding it, but hiding
 * it is not what keeps the data safe.
 *
 * It lives in a cookie because the API has no `GET /auth/me` — the role is returned once, by
 * `POST /auth/login`, so the login route handler is the only place that can capture it.
 */

export const ROLE_COOKIE = 'hostyllo_role';
export const NAME_COOKIE = 'hostyllo_name';

export type Role = 'hostel_owner' | 'chain_manager' | 'warden' | 'viewer';

const ROLES: readonly string[] = ['hostel_owner', 'chain_manager', 'warden', 'viewer'];

/** The role of the current session, or null if it is a session that predates this cookie. */
export async function sessionRole(): Promise<Role | null> {
  const value = (await cookies()).get(ROLE_COOKIE)?.value;
  return value && ROLES.includes(value) ? (value as Role) : null;
}

/**
 * Whether to offer the day-to-day write actions — mirrors `CAN_OPERATE` in the API.
 *
 * An unknown role returns true, deliberately. Sessions created before this cookie existed have no
 * role, and the honest failure mode there is to show the action and let the API answer: a warden
 * wrongly denied their own job is a worse bug than a viewer meeting a 403 the screen already
 * handles.
 */
export async function canOperate(): Promise<boolean> {
  const role = await sessionRole();
  return role === null || role !== 'viewer';
}

/**
 * Whether to offer the CNIC reveal — mirrors `SENSITIVE_READ` (owner and chain manager only).
 *
 * Unlike `canOperate`, an unknown role returns **false**. The asymmetry is deliberate: revealing a
 * national identity number is an audited, privileged action, so the safe default when we cannot
 * tell who is asking is to not draw the button. The API enforces it regardless.
 */
export async function canRevealCnic(): Promise<boolean> {
  const role = await sessionRole();
  return role === 'hostel_owner' || role === 'chain_manager';
}

/** Display name and role for the header. Both are cosmetic; neither is trusted for a decision. */
export async function sessionUser(): Promise<{ name: string | null; role: Role | null }> {
  const jar = await cookies();
  const raw = jar.get(NAME_COOKIE)?.value ?? null;
  return {
    // Cookie values are URL-encoded on write; a name that fails to decode is dropped rather than
    // rendered as percent-escapes.
    name: raw ? safeDecode(raw) : null,
    role: await sessionRole(),
  };
}

function safeDecode(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded === '' ? null : decoded.slice(0, 80);
  } catch {
    return null;
  }
}
