import { redirect } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/patterns/page-header';
import { HeroPanel } from '@/components/patterns/hero-panel';
import { StatStrip, StatItem } from '@/components/patterns/stat-strip';
import { Money, Num } from '@/components/patterns/money';
import { EmptyState, ErrorState } from '@/components/patterns/states';
import { Alert, AlertDescription } from '@/components/ui-kit/alert';
import { StatusBadge } from '@/components/ui-kit/badge';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Rooms' };

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

/**
 * Rooms — the "where can I put someone" screen.
 *
 * The bed grid is the point. §8 is explicit that charts are subordinate to tables, and this is the
 * one place neither is right: a warden's question is spatial, and seeing which squares are empty
 * answers it faster than any list of counts. It is still a table's discipline — fixed cells, no
 * decoration, status carried by a word as well as a tint (§12).
 */
export default async function RoomsPage() {
  let data: RoomsResponse;
  try {
    data = await api<RoomsResponse>('/rooms');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 403) {
      return (
        <>
          <PageHeader title="Rooms" />
          <Alert tone="attention">
            <AlertDescription>
              Your role does not have access to rooms. Ask the hostel owner to change it.
            </AlertDescription>
          </Alert>
        </>
      );
    }
    return (
      <>
        <PageHeader title="Rooms" />
        <ErrorState
          title="Couldn't load rooms"
          body="Check your connection and try again."
          detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
          retryHref="/rooms"
        />
      </>
    );
  }

  const totalBeds = Number(data.summary?.totalBeds ?? 0);
  const occupied = Number(data.summary?.occupiedBeds ?? 0);
  const free = Number(data.summary?.freeBeds ?? 0);
  const occupancyPct = totalBeds > 0 ? (occupied / totalBeds) * 100 : 0;

  return (
    <>
      <PageHeader
        eyebrow={`${Number(data.summary?.totalRooms ?? 0)} rooms`}
        title="Rooms"
        description="Every bed in the hostel, and who is in it."
      />

      <div className="mb-8">
        <HeroPanel
          eyebrow="Occupancy"
          // The one screen whose hero is not money: here the question is beds. Zero renders
          // tertiary, never green — an empty hostel is not a success (§3.2).
          value={occupancyPct}
          format="percent"
          definition="Occupancy = occupied beds ÷ total beds. Beds under maintenance still count towards the total."
        >
          <StatStrip>
            <StatItem label="Total beds">
              <Num value={totalBeds} />
            </StatItem>
            <StatItem label="Occupied beds">
              <Num value={occupied} />
            </StatItem>
            <StatItem label="Free beds">
              <Num value={free} />
            </StatItem>
          </StatStrip>
        </HeroPanel>
      </div>

      {data.rooms.length === 0 ? (
        <EmptyState
          title="No rooms yet"
          body="Add rooms and beds before admitting students — a student cannot be admitted without a bed to put them in."
        />
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {data.rooms.map((room) => (
            <RoomCard key={room.roomId} room={room} />
          ))}
        </div>
      )}
    </>
  );
}

function RoomCard({ room }: { room: Room }) {
  // The API left-joins beds and aggregates with json_agg, which yields [{bedId: null, …}] rather
  // than [] for a room that has none — filtering on bedId is what distinguishes the two.
  const beds = (room.beds ?? []).filter((b) => b.bedId !== null);
  const free = Number(room.freeBeds ?? 0);

  return (
    <article
      className={cn(
        'rounded-lg border border-hairline bg-surface p-4',
        // No hover-lift: §16.6 names `translateY` plus a growing shadow as the single most
        // template-looking effect in existence. The border does the work instead.
        'transition-colors duration-fast ease-standard hover:border-hairline-strong',
        !room.isActive && 'opacity-60',
      )}
    >
      <header className="flex items-baseline gap-2">
        <h2 className="text-h3 font-semibold text-fg">Room {room.number}</h2>
        {!room.isActive && <StatusBadge status="inactive" />}
      </header>

      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-body-sm text-fg-secondary">
        {[room.floor && `Floor ${room.floor}`, room.roomType].filter(Boolean).join(' · ')}
        {(room.floor || room.roomType) && <span aria-hidden>·</span>}
        <Money value={room.defaultRentPkr} />
      </p>

      {beds.length === 0 ? (
        <p className="mt-4 text-body-sm text-fg-tertiary">No beds configured.</p>
      ) : (
        <>
          <ul className="mt-4 grid list-none gap-2 p-0 [grid-template-columns:repeat(auto-fill,minmax(110px,1fr))]">
            {beds.map((bed) => {
              const isOccupied = bed.status === 'occupied';
              const isMaintenance = bed.status === 'maintenance';
              return (
                <li
                  key={bed.bedId}
                  className={cn(
                    'rounded-md border p-2 text-body-sm',
                    // §7.6's vocabulary, applied literally: Occupied is indigo, Maintenance is
                    // amber, Vacant is neutral. Vacant is deliberately the quietest of the three —
                    // an empty bed is the normal state of a hostel with room in it.
                    isMaintenance
                      ? 'border-transparent bg-attention-tint'
                      : isOccupied
                        ? 'border-transparent bg-brand-tint'
                        : 'border-hairline bg-surface-sunken',
                  )}
                >
                  <div className="font-mono text-mono-sm text-fg-tertiary">{bed.label}</div>
                  {/* Occupancy is never signalled by colour alone — the name or the word carries
                      it for anyone who cannot distinguish the fills (§12). */}
                  <div className="mt-0.5 break-words text-fg">
                    {bed.studentName ?? (isMaintenance ? 'Maintenance' : 'Vacant')}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-body-sm text-fg-secondary">
            {free > 0 ? `${free} bed${free === 1 ? '' : 's'} free` : 'Full'}
          </p>
        </>
      )}
    </article>
  );
}
