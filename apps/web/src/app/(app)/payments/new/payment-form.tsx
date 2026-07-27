'use client';

import { useActionState, useState } from 'react';
import { Field, FieldGrid, FieldSet, FormError, Select, SubmitButton } from '@/components/form';
import { formatPkr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { recordPayment, type FormState } from './actions';

const INITIAL: FormState = { error: null };

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];

/**
 * Payment entry.
 *
 * The running balance is the reason this is a client component. A warden taking a part payment
 * needs to see what is still owed *before* committing, not on the receipt afterwards — that number
 * is what they read back to the student. It mirrors `calculateUnpaid` in the API
 * (packages/db), and the API remains the authority: this is a preview, and the stored figures come
 * from the server's own calculation.
 */
export function PaymentForm({
  studentId,
  idempotencyKey,
  defaultRent,
  defaultMonth,
  today,
}: {
  studentId: string;
  idempotencyKey: string;
  defaultRent: number;
  defaultMonth: string;
  today: string;
}) {
  const [state, formAction] = useActionState(recordPayment, INITIAL);

  const [rent, setRent] = useState(String(defaultRent));
  const [admission, setAdmission] = useState('0');
  const [concession, setConcession] = useState('0');
  const [paid, setPaid] = useState('');

  const n = (v: string) => {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const totalDue = Math.max(0, n(rent) + n(admission) - n(concession));
  const balance = totalDue - n(paid);

  return (
    <form action={formAction}>
      <FormError message={state.error} />

      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <FieldSet legend="Charges">
        <FieldGrid>
          <Field
            label="Month"
            name="month"
            type="month"
            required
            defaultValue={defaultMonth}
            hint="Format: YYYY-MM"
          />
          <NumberField label="Rent (PKR)" name="rent" value={rent} onChange={setRent} required />
          <NumberField label="Admission fee (PKR)" name="admission_fee" value={admission} onChange={setAdmission} />
          <NumberField label="Concession (PKR)" name="concession" value={concession} onChange={setConcession} />
        </FieldGrid>
      </FieldSet>

      <FieldSet legend="Payment">
        <FieldGrid>
          <NumberField label="Amount paid (PKR)" name="paid" value={paid} onChange={setPaid} required />
          <Select label="Method" name="payment_method" defaultValue="cash">
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Field label="Payment date" name="payment_date" type="date" defaultValue={today} />
          {/*
            No Notes field, deliberately. `POST /payments` accepts `notes` in its JSON Schema but
            the `payments` table has no such column and the INSERT never references it — so anything
            typed here would be accepted, echoed by a 201, and silently discarded. Offering the box
            would be worse than not having it. Tracked in tasks/todo; add the field back with the
            migration that gives it somewhere to go.
          */}
        </FieldGrid>
      </FieldSet>

      {/* Sticks to the bottom of the viewport on a phone: the warden reads "still owed" back to the
          student while the amount field is still focused and the keyboard is covering the page. */}
      <div
        aria-live="polite"
        className="sticky bottom-2 z-10 mb-5 flex flex-wrap gap-5 rounded-lg border border-border bg-surface/95 p-4 shadow-lg backdrop-blur-sm"
      >
        <Summary label="Total due" value={formatPkr(totalDue)} />
        <Summary label="Paying now" value={formatPkr(n(paid))} />
        <Summary
          label={balance > 0 ? 'Still owed' : balance < 0 ? 'Overpaid' : 'Settled'}
          value={formatPkr(Math.abs(balance))}
          tone={balance > 0 ? 'red' : balance < 0 ? 'amber' : 'teal'}
        />
      </div>

      <SubmitButton>Record payment</SubmitButton>
    </form>
  );
}

/** A controlled number input — controlled because the balance above has to track every keystroke. */
function NumberField({
  label,
  name,
  value,
  onChange,
  required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-semibold text-text">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        step="1"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tabular min-h-11 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-base text-text transition-colors duration-150 hover:border-text-disabled"
      />
    </div>
  );
}

const SUMMARY_TONE = {
  red: 'text-red',
  amber: 'text-amber',
  teal: 'text-teal',
} as const;

function Summary({ label, value, tone }: { label: string; value: string; tone?: keyof typeof SUMMARY_TONE }) {
  return (
    <div>
      <div className="mb-1 text-[13px] text-text-muted">{label}</div>
      <div className={cn('tabular text-xl font-semibold', tone && SUMMARY_TONE[tone])}>{value}</div>
    </div>
  );
}
