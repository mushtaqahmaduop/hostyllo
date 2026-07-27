import { api, ApiError } from '@/lib/api';
import { redirect } from 'next/navigation';
import { formatPkr } from '@/lib/format';
import { Notice, PageHeading, Stat, StatGrid, StatusBadge } from '@/components/ui';

export const metadata = { title: 'Rooms · Hostyllo' };

/** GET /rooms — API spec Module 3. Returns every room with its beds; there is no pagination. */
type Bed = {
  bedId: string | null;
  label: string | null;
  status: string | null;
  studentName: string | null;
  studentId: string | null;
};

type Room = {
  roomId: string;
  number: string;
  floor: string | null;
  roomType: string | null;
  colorHex: string | null;
  capacity: number | string;
  defaultRentPkr: number | string;
  isActive: boolean;
  occupiedBeds: number | string;
  freeBeds: number | string;
  beds: Bed[] | null;
};

type RoomsResponse = {
  rooms: Room[];
  summary: {
    totalRooms: number | string;
    totalBeds: number | string;
    occupiedBeds: number | string;
    freeBeds: number | string;
  };
};

export default async function RoomsPage() {
  let data: RoomsResponse;
  try {
    data = await api<RoomsResponse>('/rooms');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 403) {
      return <Notice tone="amber">Your role does not have access to rooms.</Notice>;
    }
    return <Notice tone="red">{error instanceof ApiError ? error.message : 'Could not load rooms.'}</Notice>;
  }

  const totalBeds = Number(data.summary?.totalBeds ?? 0);
  const occupied = Number(data.summary?.occupiedBeds ?? 0);
  const occupancyPct = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

  return (
    <>
      <PageHeading title="Rooms" meta={`${Number(data.summary?.totalRooms ?? 0)} rooms`} />

      <StatGrid label="Occupancy summary">
        <Stat label="Occupancy" value={`${occupancyPct}%`} hint={`${occupied} of ${totalBeds} beds`} />
        <Stat label="Occupied beds" value={String(occupied)} tone="teal" />
        <Stat
          label="Free beds"
          value={String(Number(data.summary?.freeBeds ?? 0))}
          tone={Number(data.summary?.freeBeds ?? 0) === 0 ? 'amber' : undefined}
        />
      </StatGrid>

      {data.rooms.length === 0 ? (
        <Notice tone="muted">No rooms yet.</Notice>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 'var(--space-4)',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {data.rooms.map((room) => (
            <RoomCard key={room.roomId} room={room} />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * A room and its beds. The bed grid is the point of this screen — a warden's first question is
 * "where can I put someone", and a list of numbers answers that far more slowly than seeing which
 * squares are empty.
 */
function RoomCard({ room }: { room: Room }) {
  // The API left-joins beds and aggregates with json_agg, which yields [{bedId: null, …}] rather
  // than [] for a room that has none — filtering on bedId is what distinguishes the two.
  const beds = (room.beds ?? []).filter((b) => b.bedId !== null);
  const free = Number(room.freeBeds ?? 0);

  return (
    <article
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        opacity: room.isActive ? 1 : 0.6,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Room {room.number}</h2>
        {!room.isActive && <StatusBadge status="inactive" />}
      </header>

      <p style={{ margin: '0 0 var(--space-3)', color: 'var(--text-muted)', fontSize: 14 }}>
        {[room.floor && `Floor ${room.floor}`, room.roomType, formatPkr(room.defaultRentPkr)]
          .filter(Boolean)
          .join(' · ')}
      </p>

      {beds.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>No beds configured.</p>
      ) : (
        <>
          <ul
            style={{
              listStyle: 'none',
              margin: '0 0 var(--space-3)',
              padding: 0,
              display: 'grid',
              gap: 'var(--space-2)',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            }}
          >
            {beds.map((bed) => {
              const occupied = bed.status === 'occupied';
              const maintenance = bed.status === 'maintenance';
              return (
                <li
                  key={bed.bedId}
                  style={{
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-md)',
                    background: maintenance
                      ? 'var(--amber-subtle)'
                      : occupied
                        ? 'var(--teal-subtle)'
                        : 'var(--surface-2)',
                    border: `1px solid ${maintenance ? 'var(--amber)' : occupied ? 'var(--teal)' : 'var(--border-2)'}`,
                    fontSize: 13,
                  }}
                >
                  <div style={{ color: 'var(--text-muted)' }}>{bed.label}</div>
                  {/* Occupancy is never signalled by colour alone — the name or the word "Free"
                      carries it for anyone who cannot distinguish the fills. */}
                  <div style={{ color: 'var(--text)', marginTop: 2, wordBreak: 'break-word' }}>
                    {bed.studentName ?? (maintenance ? 'Maintenance' : 'Free')}
                  </div>
                </li>
              );
            })}
          </ul>

          <p style={{ margin: 0, fontSize: 13, color: free > 0 ? 'var(--teal)' : 'var(--text-muted)' }}>
            {free > 0 ? `${free} bed${free === 1 ? '' : 's'} free` : 'Full'}
          </p>
        </>
      )}
    </article>
  );
}
