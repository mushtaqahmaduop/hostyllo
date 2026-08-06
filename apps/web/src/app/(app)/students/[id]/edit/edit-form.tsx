'use client';

import { useActionState } from 'react';

import { FieldSet, FormError, SubmitButton } from '@/components/form';
import { ContactFields, IdentityFields, MoneyFields } from '@/components/students/student-fields';
import type { StudentEditValues } from '@/lib/students/detail-contract';
import { updateStudent, type EditState } from './actions';

const INITIAL: EditState = { error: null };

/**
 * Edit an existing student.
 *
 * Every control is a real input inside a real form, so the page works before the
 * JavaScript arrives and the Server Action is the one place the data is validated
 * and sent — the same constraint the Add form and `components/form.tsx` hold to.
 *
 * There is no status control here. Moving a student to Cancelling is a
 * cancellation with a vacate date and a bed to free, and moving them to Left is
 * the confirmation of one; both belong to the Cancellations flow, which writes
 * the dates and releases the bed. A `<select>` that sets the column and none of
 * the rest would leave a student marked as gone while still holding a bed —
 * which is the state the occupancy KPI counts.
 */
export function EditStudentForm({ values }: { values: StudentEditValues }) {
  const [state, formAction] = useActionState(updateStudent, INITIAL);

  return (
    <form action={formAction}>
      <FormError message={state.error} />

      <input type="hidden" name="id" value={values.id} />

      <IdentityFields values={values} />
      <ContactFields values={values} />

      <FieldSet legend="Charges">
        <MoneyFields values={values} rentDefault={values.monthlyFee} />
      </FieldSet>

      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
