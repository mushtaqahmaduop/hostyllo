import Link from 'next/link';
import { redirect } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { canOperate } from '@/lib/session';
import { PageHeader } from '@/components/patterns/page-header';
import { ErrorState } from '@/components/patterns/states';
import { Alert, AlertDescription } from '@/components/ui-kit/alert';
import { Button } from '@/components/ui-kit/button';
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
    return (
      <>
        <PageHeader title="Add student" />
        <Alert tone="attention">
          <AlertDescription>
            Your role cannot add students. Ask the hostel owner to change it.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  let data: { rooms: Room[] };
  try {
    data = await api<{ rooms: Room[] }>('/rooms');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    return (
      <>
        <PageHeader title="Add student" />
        <ErrorState
          title="Couldn't load rooms"
          body="A student needs a bed, and the room list didn't load. Check your connection and try again."
          detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
          retryHref="/students/new"
        />
      </>
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
      <PageHeader
        title="Add student"
        actions={
          <Button asChild variant="ghost">
            <Link href="/students">Cancel</Link>
          </Button>
        }
      />

      {rooms.length === 0 && (
        <Alert tone="attention" className="mb-6">
          <AlertDescription>
            Every bed is occupied. Free one up, or add a room, before admitting a student.
          </AlertDescription>
        </Alert>
      )}

      <StudentForm rooms={rooms} today={today} />
    </>
  );
}
