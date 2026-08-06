'use client';

import { Field, FieldGrid, FieldSet, Select } from '@/components/form';
import { NATIONALITIES } from '@/lib/students/detail-contract';

/**
 * The fields Add and Edit have in common.
 *
 * Shared rather than written twice, because the two forms drifting is how a
 * hostel ends up able to set a mess fee on admission and unable to correct it
 * afterwards — which is exactly the state this app was in before this component
 * existed: `POST /students` accepted `mess_fee`, `nationality` and `course` from
 * migration 014, and the only form that could send them didn't offer any of the
 * three.
 *
 * What is deliberately *not* here:
 *
 * - **CNIC** is create-only. `PATCH /students/:id` excludes it from its allowed
 *   keys, so an Edit box for it would silently discard what was typed. Correcting
 *   a wrong CNIC is a real need and needs its own audited path, not a text input
 *   that appears to work.
 * - **Room** is create-only for the same reason, and a better one:
 *   `POST /rooms/shift` moves the student *and* reassigns the bed *and* rewrites
 *   their pending payments. HOSTIX let Edit change the room and left the rent at
 *   the old room's rate (students.js:967-980) — the API's own comment calls that
 *   "a bug worth not reproducing".
 */

export function IdentityFields({
  values,
  /** Add collects the CNIC; Edit cannot write it. */
  withCnic,
}: {
  values?: { name?: string; fatherName?: string; nationality?: string; course?: string };
  withCnic?: boolean;
}) {
  return (
    <FieldSet legend="Student">
      <FieldGrid>
        <Field label="Full name" name="name" required autoFocus defaultValue={values?.name} />
        <Field label="Father's name" name="father_name" defaultValue={values?.fatherName} />
        {withCnic && (
          <Field label="CNIC" name="cnic" numeric hint="Stored encrypted. Visible only on request." />
        )}
        <NationalitySelect current={values?.nationality} />
        <Field
          label="Course / study field"
          name="course"
          defaultValue={values?.course}
          placeholder="e.g. BS Computer Science"
        />
      </FieldGrid>
    </FieldSet>
  );
}

export function ContactFields({
  values,
}: {
  values?: { phone?: string; emergencyContact?: string; email?: string; address?: string };
}) {
  return (
    <FieldSet legend="Contact">
      <FieldGrid>
        <Field
          label="Phone"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          numeric
          defaultValue={values?.phone}
          placeholder="03001234567"
        />
        <Field
          label="Emergency contact"
          name="emergency_contact"
          type="tel"
          inputMode="tel"
          numeric
          defaultValue={values?.emergencyContact}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          defaultValue={values?.email}
        />
      </FieldGrid>
      <Field label="Address" name="address" defaultValue={values?.address} />
    </FieldSet>
  );
}

/**
 * Rent and mess.
 *
 * The mess box being empty is load-bearing: blank means the student has no mess
 * arrangement, and `0` means they have one that costs nothing this month. The
 * hint says so, because the two look identical in an empty text box and the
 * difference decides whether rent-generate bills them a mess line at all
 * (migration 014, and the `rent-generate` fix that bills it as an extra charge).
 */
export function MoneyFields({
  values,
  /** Add seeds this from the chosen room and re-keys it; Edit just shows what is stored. */
  rentKey,
  rentDefault,
}: {
  values?: { messFee?: string };
  rentKey?: string;
  rentDefault?: string;
}) {
  return (
    <FieldGrid>
      <Field
        label="Monthly rent"
        name="monthly_fee"
        type="number"
        inputMode="numeric"
        min={0}
        step="1"
        required
        numeric
        key={rentKey}
        defaultValue={rentDefault}
        hint="Zero is allowed — use it for a free or scholarship bed."
      />
      <Field
        label="Mess fee"
        name="mess_fee"
        type="number"
        inputMode="numeric"
        min={0}
        step="1"
        numeric
        defaultValue={values?.messFee}
        hint="Leave blank if mess is not included. Zero means included at no charge."
      />
    </FieldGrid>
  );
}

/**
 * Free text in the schema, a select in the form — with one addition: whatever the
 * student already has is added to the list when it is not one of the five. A plain
 * select over a fixed list would show "Pakistani" for a student stored as
 * "Uzbek" and save that over the top the first time anyone edited their phone
 * number.
 */
function NationalitySelect({ current }: { current?: string }) {
  const options = current && !NATIONALITIES.includes(current)
    ? [current, ...NATIONALITIES]
    : NATIONALITIES;

  return (
    <Select label="Nationality" name="nationality" defaultValue={current ?? ''}>
      <option value="">Not recorded</option>
      {options.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </Select>
  );
}
