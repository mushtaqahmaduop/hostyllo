'use client';

import { useActionState, useState } from 'react';
import { Field, FieldGrid, FieldSet, FormError, Select, SubmitButton } from '@/components/form';
import { createStudent, type FormState } from './actions';

export type BedOption = { bedId: string; label: string };
export type RoomOption = {
  roomId: string;
  number: string;
  defaultRentPkr: number;
  freeBeds: BedOption[];
};

const INITIAL: FormState = { error: null };

/**
 * Admission form.
 *
 * The only genuinely interactive part is the room→bed pair: picking a room narrows the bed list,
 * and picking a room also fills in that room's default rent. Everything else is a plain input, so
 * the form is usable before hydration and the Server Action is the single place the data is
 * validated and sent.
 */
export function StudentForm({ rooms, today }: { rooms: RoomOption[]; today: string }) {
  const [state, formAction] = useActionState(createStudent, INITIAL);

  const [roomId, setRoomId] = useState('');
  // Tracked separately from the room so that changing rooms clears a bed that no longer exists in
  // the new room's list — leaving it set would submit a bed id belonging to the previous room.
  const [bedId, setBedId] = useState('');
  const [rent, setRent] = useState('');

  const room = rooms.find((r) => r.roomId === roomId);
  const beds = room?.freeBeds ?? [];

  function chooseRoom(next: string) {
    setRoomId(next);
    setBedId('');
    const chosen = rooms.find((r) => r.roomId === next);
    // Prefilled, not forced — a negotiated rent is normal, and the field stays editable.
    if (chosen) setRent(String(chosen.defaultRentPkr));
  }

  return (
    <form action={formAction}>
      <FormError message={state.error} />

      <FieldSet legend="Student">
        <FieldGrid>
          <Field label="Full name" name="name" required autoFocus />
          <Field label="Phone" name="phone" type="tel" inputMode="tel" required placeholder="03001234567" />
          <Field label="Father's name" name="father_name" />
          <Field label="CNIC" name="cnic" hint="Stored encrypted. Visible only on request." />
          <Field label="Emergency contact" name="emergency_contact" type="tel" inputMode="tel" />
          <Field label="Email" name="email" type="email" inputMode="email" />
        </FieldGrid>
        <Field label="Address" name="address" />
      </FieldSet>

      <FieldSet legend="Bed">
        <FieldGrid>
          <Select
            label="Room"
            name="room_id"
            required
            value={roomId}
            onChange={chooseRoom}
            hint={rooms.length === 0 ? 'No room has a free bed right now.' : undefined}
          >
            <option value="">Select a room…</option>
            {rooms.map((r) => (
              <option key={r.roomId} value={r.roomId}>
                Room {r.number} — {r.freeBeds.length} free
              </option>
            ))}
          </Select>

          <Select
            label="Bed"
            name="bed_id"
            required
            value={bedId}
            onChange={setBedId}
            disabled={!roomId}
            hint={roomId ? undefined : 'Pick a room first.'}
          >
            <option value="">{roomId ? 'Select a bed…' : '—'}</option>
            {beds.map((b) => (
              <option key={b.bedId} value={b.bedId}>
                {b.label}
              </option>
            ))}
          </Select>
        </FieldGrid>
      </FieldSet>

      <FieldSet legend="Money">
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
            defaultValue={rent}
            // Remounts the input when the room changes, so the prefilled rent actually updates.
            // A plain defaultValue is read once; keying it is the cheapest correct way to keep the
            // field editable while still letting the room selection seed it.
            key={`rent-${roomId}`}
            hint="Zero is allowed — use it for a free or scholarship bed."
          />
          <Field
            label="Admission fee"
            name="admission_fee"
            type="number"
            inputMode="numeric"
            min={0}
            step="1"
            numeric
            defaultValue="0"
          />
          <Field label="Join date" name="join_date" type="date" required defaultValue={today} />
        </FieldGrid>
      </FieldSet>

      <SubmitButton>Add student</SubmitButton>
    </form>
  );
}
