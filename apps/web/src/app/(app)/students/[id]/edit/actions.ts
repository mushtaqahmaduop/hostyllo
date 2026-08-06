'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

export type EditState = { error: string | null };

function optional(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Editable text, where clearing the box means clearing the field.
 *
 * Different from `optional()` on the Add form, and the difference matters. On Add,
 * an untouched empty box means "no value" and is omitted. On Edit, an emptied box
 * means "remove what was there" — omitting it would make deleting a stale email
 * address impossible, because PATCH only writes the keys it receives. An empty
 * string is what the column takes.
 *
 * `email` is the exception and is handled at the call site: its JSON Schema
 * carries `format: 'email'`, which rejects `""` outright, so a cleared email is
 * omitted and stays as it was. Clearing an email needs an API change, not a
 * client-side workaround that posts a value the server will refuse.
 */
function editable(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : undefined;
}

function money(form: FormData, key: string): number | null {
  const raw = optional(form, key);
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function updateStudent(_prev: EditState, form: FormData): Promise<EditState> {
  const id = optional(form, 'id');
  if (!id) return { error: 'Missing student id.' };

  const name = optional(form, 'name');
  const phone = optional(form, 'phone');
  const monthlyFee = money(form, 'monthly_fee');

  // Re-checked here because `required` on an input is a convenience, not a guarantee: the form
  // still posts without JavaScript, and a Server Action is a public endpoint.
  if (!name) return { error: 'Student name is required.' };
  if (!phone) return { error: 'Phone number is required.' };
  if (monthlyFee === null) return { error: 'Monthly rent must be a number, zero or more.' };

  /*
   * The mess fee's three states, preserved end to end.
   *
   *   blank  → null  — no mess arrangement; rent-generate bills no mess line
   *   "0"    → 0     — included and zero-rated; it bills a zero line
   *   "4500" → 4500  — included at that rate
   *
   * `money()` returns null for both "blank" and "not a number", so the raw box is
   * re-read to tell them apart. Collapsing them would silently turn a typo into
   * "this student has no mess", which is a billing change nobody asked for.
   */
  const messRaw = form.get('mess_fee');
  const messBlank = typeof messRaw !== 'string' || messRaw.trim() === '';
  const messFee = messBlank ? null : money(form, 'mess_fee');
  if (!messBlank && messFee === null) {
    return { error: 'Mess fee must be a number, zero or more — or blank if mess is not included.' };
  }

  const email = optional(form, 'email');

  try {
    await api(`/students/${id}`, {
      method: 'PATCH',
      body: {
        name,
        phone,
        monthly_fee: monthlyFee,
        mess_fee: messFee,
        father_name: editable(form, 'father_name'),
        emergency_contact: editable(form, 'emergency_contact'),
        address: editable(form, 'address'),
        nationality: editable(form, 'nationality'),
        course: editable(form, 'course'),
        // See `editable` — a cleared email is left alone rather than posted as "".
        ...(email === undefined ? {} : { email }),
      },
    });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      return { error: 'Could not reach the Hostyllo service. Please try again.' };
    }
    if (error.status === 401) redirect('/login');
    if (error.status === 403) return { error: 'Your role cannot edit students.' };
    if (error.status === 404) return { error: 'This student no longer exists.' };
    return { error: error.message };
  }

  // The rent shows on the roster and feeds the dashboard's expected-revenue figure, so both are
  // stale the moment this succeeds.
  revalidatePath(`/students/${id}`);
  revalidatePath('/students');
  revalidatePath('/dashboard');

  // Outside the catch on purpose: `redirect` signals by throwing, and catching it here would turn
  // a successful save into "could not reach the service".
  redirect(`/students/${id}?saved=1`);
}
