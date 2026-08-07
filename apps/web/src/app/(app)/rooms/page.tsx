import { redirect } from 'next/navigation';
import { Building2, BedDouble, Users, DoorOpen, Gauge, type LucideIcon } from 'lucide-react';

import { ApiError } from '@/lib/api';
import { getRoomsView } from '@/lib/rooms/presenter';
import { KpiStrip } from '@/components/patterns/kpi-strip';
import { EmptyState, FilteredEmptyState, ErrorState } from '@/components/patterns/states';
import { FloorPanel } from '@/components/rooms/floor-panel';
import { RoomCard } from '@/components/rooms/room-card';
import { RoomsToolbar } from '@/components/rooms/rooms-toolbar';
import { Alert, AlertDescription } from '@/components/ui-kit/alert';

export const metadata = { title: 'Rooms' };

const KPI_ICONS: Record<string, LucideIcon> = {
  rooms: Building2,
  beds: BedDouble,
  occupied: Users,
  free: DoorOpen,
  occupancy: Gauge,
};

/**
 * The Rooms board — the owner's redesign, `docs/design/handoff/designs/Rooms.dc.html`.
 *
 * KPI strip, toolbar, a card per room, and a rail saying where the space is. The
 * page it replaces used PageHeader / HeroPanel / StatStrip, none of which appear
 * in the handoff bundle.
 *
 * The screen answers one question — where can I put someone — and every part of
 * it is arranged around that: the toolbar states the free-bed count before any
 * card is read, vacant rooms take the accent pill (the inverse of the ledger,
 * where the empty cell is the problem), and the rail lists the rooms with a bed
 * left, fewest first.
 *
 * ── Beds, not capacity ───────────────────────────────────────────────────────
 * Every figure counts bed rows. A student is assigned to a bed row, so the beds
 * that exist are the people who can be placed; `rooms.capacity` is the intent and
 * the two genuinely disagree in live data. Where they do, the card says so
 * instead of silently choosing.
 *
 * ── No pagination ────────────────────────────────────────────────────────────
 * `GET /rooms` returns every room in one call and has no offset. The board
 * renders all of them, which is also what makes the tab counts and the floor
 * breakdown exact rather than approximations of a page. Recorded in tasks/todo:
 * a hostel large enough for this to hurt needs the endpoint paginated first, and
 * then the counts move server-side like the roster's.
 */
export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const query = await searchParams;

  let view;
  try {
    view = await getRoomsView(query);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 403) {
      return (
        <Alert tone="attention">
          <AlertDescription>
            Your role does not have access to rooms. Ask the hostel owner to change it.
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <ErrorState
        title="Couldn't load rooms"
        body="Check your connection and try again."
        detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
        retryHref="/rooms"
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex shrink-0 flex-wrap items-baseline justify-between gap-[8px]">
        <h1 className="text-[15px] font-semibold text-fg">Rooms</h1>
        {/*
         * No "Add room" button. Rooms are created by POST /rooms, which exists,
         * but there is no form on the web app to reach it — and a filled primary
         * button that leads nowhere is worse on this screen than on any other,
         * because "no space" is exactly when somebody would press it.
         */}
      </div>

      <KpiStrip kpis={view.kpis} icons={KPI_ICONS} />

      <div className="mt-3 flex min-h-0 flex-1 gap-[13px]">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <RoomsToolbar view={view} />

          {view.rooms.length === 0 ? (
            view.narrowed ? (
              <FilteredEmptyState what="rooms" clearHref="/rooms" />
            ) : (
              <EmptyState
                title="No rooms yet"
                body="Add rooms and beds before admitting students — a student cannot be admitted without a bed to put them in."
              />
            )
          ) : (
            <div className="hs-scroll min-h-0 flex-1 overflow-y-auto pb-[14px] pe-[2px]">
              <div className="grid gap-[11px] [grid-template-columns:repeat(auto-fill,minmax(272px,1fr))]">
                {view.rooms.map((room) => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </div>
            </div>
          )}
        </div>

        <FloorPanel view={view} />
      </div>
    </div>
  );
}
