'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

export type FormState = { error: string | null };

/**
 * Optional fields are omitted rather than sent empty.
 *
 * `POST /students` declares `additionalProperties: false` with `email: { format: 'email' }`, so an
 * untouched email box submitted as `""` is a 400 on a field the user never filled in. Trimming to
 * undefined is what keeps "leave it blank" working.
 */
function optional(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function required(form: FormData, key: string): string {
  return optional(form, key) ?? '';
}

/**
 * Money arrives from a `type="number"` input, which yields a string — including `""` when cleared.
 * Returning null for anything non-finite lets the caller reject it with a field name attached,
 * instead of posting `NaN` and getting a generic schema error back.
 */
function money(form: FormData, key: string): number | null {
  const raw = optional(form, key);
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function createStudent(_prev: FormState, form: FormData): Promise<FormState> {
  const name = required(form, 'name');
  const phone = required(form, 'phone');
  const roomId = required(form, 'room_id');
  const bedId = required(form, 'bed_id');
  const joinDate = required(form, 'join_date');
  const monthlyFee = money(form, 'monthly_fee');
  const admissionFee = money(form, 'admission_fee');

  // Checked here as well as in the browser because `required` on an input is a convenience, not a
  // guarantee — the form still posts without JavaScript, and the action is a public endpoint.
  if (!name) return { error: 'Student name is required.' };
  if (!phone) return { error: 'Phone number is required.' };
  if (!roomId || !bedId) return { error: 'Choose a room and a bed.' };
  if (!joinDate) return { error: 'Join date is required.' };
  if (monthlyFee === null) return { error: 'Monthly rent must be a number, zero or more.' };
  if (admissionFee === null && optional(form, 'admission_fee') !== undefined) {
    return { error: 'Admission fee must be a number, zero or more.' };
  }

  /*
   * Mess fee — blank, 0 and a figure are three different admissions.
   *
   * Blank means no mess arrangement and is sent as null; 0 means included and
   * zero-rated (migration 014). `money()` cannot tell blank from "not a number",
   * so the raw box is re-read: without that a typo would be admitted as "no mess"
   * and the student under-billed every month until somebody noticed.
   */
  const messRaw = form.get('mess_fee');
  const messBlank = typeof messRaw !== 'string' || messRaw.trim() === '';
  const messFee = messBlank ? null : money(form, 'mess_fee');
  if (!messBlank && messFee === null) {
    return { error: 'Mess fee must be a number, zero or more — or blank if mess is not included.' };
  }

  let studentId: string;
  try {
    const created = await api<{ student_id: string }>('/students', {
      method: 'POST',
      body: {
        name,
        phone,
        room_id: roomId,
        bed_id: bedId,
        monthly_fee: monthlyFee,
        join_date: joinDate,
        ...(admissionFee === null ? {} : { admission_fee: admissionFee }),
        mess_fee: messFee,
        father_name: optional(form, 'father_name'),
        cnic: optional(form, 'cnic'),
        emergency_contact: optional(form, 'emergency_contact'),
        email: optional(form, 'email'),
        address: optional(form, 'address'),
        nationality: optional(form, 'nationality'),
        course: optional(form, 'course'),
      },
    });
    studentId = created.student_id;
  } catch (error) {
    if (!(error instanceof ApiError)) {
      return { error: 'Could not reach the Hostyllo service. Please try again.' };
    }
    if (error.status === 401) redirect('/login');
    if (error.code === 'STU_BED_OCCUPIED') {
      // Two wardens admitting to the same bed at once. The bed list this form was rendered from is
      // now stale, so say what to do rather than just what failed.
      return { error: 'That bed was taken while you were filling this in. Go back and pick another.' };
    }
    if (error.status === 403) {
      return { error: 'Your role cannot add students.' };
    }
    return { error: error.message };
  }

  // The student list, the rooms grid and the dashboard occupancy KPI all change on an admission.
  revalidatePath('/students');
  revalidatePath('/rooms');
  revalidatePath('/dashboard');

  // Outside the catch on purpose: `redirect` signals by throwing, and catching it here would turn
  // a successful admission into "could not reach the service".
  redirect(`/students?added=${encodeURIComponent(studentId)}`);
}
