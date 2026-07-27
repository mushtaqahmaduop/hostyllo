import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { canOperate } from '@/lib/session';
import { Notice, PageHeading } from '@/components/ui';
import { StudentForm, type RoomOption } from './student-form';

export const metadata = { title: 'Add student' };

/** Shape of GET /rooms, narrowed to what the picker needs. */
type Bed = { bedId: string | null; label: string | null; status: string | null };
type Room = {
  roomId: string;
  number: string;
  defaultRentPkr: number | string;
  isActive: boolean;
  beds: Bed[] | null;
};

export default async function NewStudentPage() {
  if (!(await canOperate())) {
    return <Notice tone="amber">Your role cannot add students.</Notice>;
  }

  let data: { rooms: Room[] };
  try {
    data = await api<{ rooms: Room[] }>('/rooms');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    return (
      <Notice tone="red">
        {error instanceof ApiError ? error.message : 'Could not load rooms, so there is nothing to admit into.'}
      </Notice>
    );
  }

  // Only rooms that can actually take someone. An inactive room or a full one in the dropdown is a
  // selection the API would reject after the warden had filled in the whole form.
  const rooms: RoomOption[] = data.rooms
    .filter((room) => room.isActive)
    .map((room) => ({
      roomId: room.roomId,
      number: room.number,
      defaultRentPkr: Number(room.defaultRentPkr ?? 0),
      freeBeds: (room.beds ?? [])
        // json_agg over a room with no beds yields [{bedId: null, …}], not [] — see the rooms grid.
        .filter((bed): bed is Bed & { bedId: string } => bed.bedId !== null && bed.status === 'vacant')
        .map((bed) => ({ bedId: bed.bedId, label: bed.label ?? 'Bed' })),
    }))
    .filter((room) => room.freeBeds.length > 0)
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

  // Local date, not `toISOString()` — that converts to UTC first, which in Pakistan (UTC+5) makes
  // any admission before 5am default to yesterday.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());

  return (
    <>
      <PageHeading title="Add student" />
      <Link href="/students" className="text-sm text-text-muted">
        ← Back to students
      </Link>

      <div className="mt-5">
        {rooms.length === 0 && (
          <div className="mb-5">
            <Notice tone="amber">
              Every bed is occupied. Free one up, or add a room, before admitting a student.
            </Notice>
          </div>
        )}
        <StudentForm rooms={rooms} today={today} />
      </div>
    </>
  );
}
