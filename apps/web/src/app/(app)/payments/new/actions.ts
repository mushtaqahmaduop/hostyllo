'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

export type FormState = { error: string | null };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function money(form: FormData, key: string): number | null {
  const raw = text(form, key);
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function recordPayment(_prev: FormState, form: FormData): Promise<FormState> {
  const studentId = text(form, 'studentId');
  const month = text(form, 'month');
  const rent = money(form, 'rent');
  const paid = money(form, 'paid');
  const admissionFee = money(form, 'admission_fee') ?? 0;
  const concession = money(form, 'concession') ?? 0;
  const method = text(form, 'payment_method');
  const paymentDate = text(form, 'payment_date');

  /**
   * Minted when the form was rendered, carried through as a hidden field.
   *
   * Generating it here instead would defeat the point: a warden who taps Save twice, or who
   * refreshes after a timeout, would mint a second key and get a second payment against the same
   * month. Tied to the rendered form, the replay reaches the API with the same key and comes back
   * as the original payment — which is exactly what the API's idempotency branch is for.
   */
  const idempotencyKey = text(form, 'idempotencyKey');

  if (!studentId) return { error: 'No student selected.' };
  if (!idempotencyKey) return { error: 'This form is stale. Reload the page and try again.' };
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: 'Choose the month this payment is for.' };
  if (rent === null) return { error: 'Rent must be a number, zero or more.' };
  if (paid === null) return { error: 'Amount paid must be a number, zero or more.' };

  // A concession larger than the bill is almost always a typo for a discount on one line. The API
  // would accept it and compute a negative balance, which then reads as credit the hostel does not
  // owe — cheaper to catch here, while the warden is still looking at the numbers.
  if (concession > rent + admissionFee) {
    return { error: 'Concession is larger than the total charges. Check the amounts.' };
  }

  let receipt: { receiptId: string; unpaidPkr: number | string; paymentId: string };
  try {
    receipt = await api<{ receiptId: string; unpaidPkr: number | string; paymentId: string }>('/payments', {
      method: 'POST',
      headers: { 'x-idempotency-key': idempotencyKey },
      body: {
        studentId,
        month,
        rent,
        paid,
        admission_fee: admissionFee,
        concession,
        ...(method ? { payment_method: method } : {}),
        ...(paymentDate ? { payment_date: paymentDate } : {}),
        // `notes` is intentionally not sent — the API accepts it and drops it on the floor. See the
        // note in payment-form.tsx.
      },
    });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      return { error: 'Could not reach the Hostyllo service. Please try again.' };
    }
    if (error.status === 401) redirect('/login');
    if (error.code === 'PAY_DUPLICATE_MONTH') {
      return { error: 'This student already has a payment recorded for that month. Edit that one instead.' };
    }
    if (error.code === 'PAY_STUDENT_VACATED') {
      return { error: 'This student has vacated, so no new payment can be recorded against them.' };
    }
    if (error.status === 404) return { error: 'That student no longer exists.' };
    if (error.status === 403) return { error: 'Your role cannot record payments.' };
    return { error: error.message };
  }

  revalidatePath('/payments');
  revalidatePath('/students');
  revalidatePath('/dashboard');

  redirect(`/payments?receipt=${encodeURIComponent(receipt.receiptId)}`);
}
