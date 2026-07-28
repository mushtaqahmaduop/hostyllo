'use server';

import { api, ApiError } from '@/lib/api';

export type RevealState = { cnic: string | null; error: string | null };

/**
 * Reveals a student's CNIC.
 *
 * A Server Action rather than a client fetch so the access token stays out of the browser, and so
 * the reveal cannot be triggered by anything other than a real form submission. The API writes an
 * `audit_log` row naming the acting user on every call (INVARIANT-5) — which is exactly why this is
 * a deliberate button press and not something the profile page loads on sight.
 */
export async function revealCnic(_prev: RevealState, form: FormData): Promise<RevealState> {
  const id = form.get('studentId');
  if (typeof id !== 'string' || id === '') {
    return { cnic: null, error: 'Missing student.' };
  }

  try {
    const result = await api<{ cnic: string | null }>(`/students/${id}/reveal-cnic`);
    if (!result.cnic) {
      return { cnic: null, error: 'No CNIC is on record for this student.' };
    }
    return { cnic: result.cnic, error: null };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      return { cnic: null, error: 'Could not reach the Hostyllo service.' };
    }
    if (error.status === 403) {
      return { cnic: null, error: 'Only an owner or chain manager can reveal a CNIC.' };
    }
    if (error.status === 404) return { cnic: null, error: 'That student no longer exists.' };
    return { cnic: null, error: error.message };
  }
}
