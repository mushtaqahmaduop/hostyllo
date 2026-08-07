import 'server-only';

import { api } from '@/lib/api';
import { formatAmount, formatPct } from '@/lib/format';
import { blankToNull, initials, num } from '@/lib/students/derive';
import {
  ROOM_TYPE_LABEL,
  STATUS_LABEL,
  TAB_LABEL,
  TAB_ORDER,
  type Bed,
  type FloorSummary,
  type Kpi,
  type Occupant,
  type RoomCard,
  type RoomStatus,
  type RoomsTab,
  type RoomsView,
  type TabKey,
} from './contract';

/**
 * Builds the Rooms board from `GET /rooms`.
 *
 * That endpoint has no pagination and no filters beyond active/inactive — it
 * returns every room with every bed, in one call. So the tab counts, the search,
 * the floor breakdown and the vacancy shortlist are all computed here, from the
 * one list, rather than by asking the API a question per panel. That is not a
 * shortcut: with the whole set in hand, the counts are exact by construction and
 * cannot drift from the cards the way five separate requests would.
 *
 * If a hostel ever grows past a few hundred rooms this becomes a paginated
 * endpoint and the counts move server-side, the way the roster and the ledger
 * already work. It is written down in tasks/todo rather than pre-built.
 */

type ApiBed = {
  bedId: string | null;
  label: string | null;
  status: string | null;
  studentName: string | null;
  studentId: string | null;
  studentCourse: string | null;
  studentUnpaidPkr: number | string | null;
};

type ApiRoom = {
  roomId: string;
  number: string;
  floor: string | null;
  roomType: string | null;
  capacity: number | string;
  defaultRentPkr: number | string;
  isActive: boolean;
  totalBeds: number | string;
  occupiedBeds: number | string;
  freeBeds: number | string;
  maintenanceBeds: number | string;
  openMaintenance: number;
  maintenanceTitle: string | null;
  maintenancePriority: string | null;
  beds: ApiBed[] | null;
};

type ApiRooms = {
  rooms: ApiRoom[];
  summary: {
    totalRooms: number | string;
    totalBeds: number | string;
    occupiedBeds: number | string;
    freeBeds: number | string;
  };
};

export type RoomsQuery = { q?: string; tab?: string };

export async function getRoomsView(query: RoomsQuery): Promise<RoomsView> {
  const tab = isTab(query.tab) ? query.tab : 'all';
  const q = query.q?.trim() ?? '';

  const data = await api<ApiRooms>('/rooms');
  const all = data.rooms.map(toCard);

  const searched = q ? all.filter((room) => matches(room, q.toLowerCase())) : all;
  const rooms = tab === 'all' ? searched : searched.filter((room) => room.status === tab);

  const counts = { all: searched.length } as Record<TabKey, number>;
  for (const key of TAB_ORDER) if (key !== 'all') counts[key] = 0;
  for (const room of searched) counts[room.status] += 1;

  const totalBeds = num(data.summary?.totalBeds) ?? 0;
  const occupiedBeds = num(data.summary?.occupiedBeds) ?? 0;
  const freeBeds = num(data.summary?.freeBeds) ?? 0;

  return {
    rooms,
    tabs: buildTabs(counts, { tab, q }),
    kpis: buildKpis({
      totalRooms: num(data.summary?.totalRooms) ?? 0,
      totalBeds,
      occupiedBeds,
      freeBeds,
      floors: countFloors(all),
      maintenanceBeds: all.reduce((sum, room) => sum + room.maintenanceBeds, 0),
    }),
    floors: buildFloors(all),
    vacancies: all
      .filter((room) => room.freeBeds > 0 && room.status !== 'inactive')
      // Fewest free beds first: filling a room that has one bed left empties the
      // shortlist faster than scattering students across half-empty rooms, and it
      // is the room a warden most wants to hear about.
      .sort((a, b) => a.freeBeds - b.freeBeds)
      .slice(0, 6)
      .map((room) => ({ id: room.id, number: room.number, floor: room.floor, freeBeds: room.freeBeds })),
    resultLabel: resultLabel(rooms.length, all.length),
    q,
    tab,
    narrowed: q !== '' || tab !== 'all',
    freeBeds,
  };
}

function toCard(r: ApiRoom): RoomCard {
  // The API left-joins beds and aggregates with json_agg, which yields
  // [{bedId: null, …}] rather than [] for a room with no beds. Filtering on
  // bedId is what tells the two apart.
  const beds: Bed[] = (r.beds ?? [])
    .filter((b): b is ApiBed & { bedId: string } => b.bedId !== null)
    .map((b) => ({
      id: b.bedId,
      label: b.label ?? '—',
      status: isBedStatus(b.status) ? b.status : 'vacant',
      occupant: b.studentId && b.studentName
        ? {
            studentId: b.studentId,
            name: b.studentName,
            initials: initials(b.studentName),
            course: blankToNull(b.studentCourse),
            unpaid: num(b.studentUnpaidPkr) ?? 0,
          }
        : null,
    }));

  const totalBeds = num(r.totalBeds) ?? 0;
  const occupiedBeds = num(r.occupiedBeds) ?? 0;
  const freeBeds = num(r.freeBeds) ?? 0;
  const maintenanceBeds = num(r.maintenanceBeds) ?? 0;
  const capacity = num(r.capacity) ?? 0;
  const roomType = blankToNull(r.roomType);

  return {
    id: r.roomId,
    number: r.number,
    floor: blankToNull(r.floor),
    roomType,
    roomTypeLabel: roomType ? (ROOM_TYPE_LABEL[roomType] ?? roomType) : null,
    rent: num(r.defaultRentPkr) ?? 0,
    totalBeds,
    occupiedBeds,
    freeBeds,
    maintenanceBeds,
    capacity,
    capacityNote: capacityNote(capacity, totalBeds),
    // Null, not 0%, for a room with no beds: 0% occupancy says "empty and
    // available", and a room with no bed rows is neither.
    occupancyPct: totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : null,
    status: derive(r.isActive, totalBeds, occupiedBeds, freeBeds, maintenanceBeds),
    statusLabel: STATUS_LABEL[derive(r.isActive, totalBeds, occupiedBeds, freeBeds, maintenanceBeds)],
    beds,
    occupants: beds.map((b) => b.occupant).filter((o): o is Occupant => o !== null),
    openMaintenance: r.openMaintenance ?? 0,
    maintenanceTitle: blankToNull(r.maintenanceTitle),
    maintenancePriority: blankToNull(r.maintenancePriority),
  };
}

/**
 * Room status, in precedence order — exclusive, so the tabs sum to the board.
 *
 * Inactive wins over everything: a room taken out of service is not "vacant"
 * however many empty beds it holds, and reading it as available is how somebody
 * gets placed in a room the owner closed. Maintenance comes next for the same
 * reason. Then it is arithmetic: nobody in it is vacant, no free bed is full,
 * and anything between the two is occupied.
 *
 * A room with no bed rows at all reports `vacant`, which is honest — it holds
 * nobody — and the card says "No beds configured" rather than implying space.
 */
function derive(
  isActive: boolean,
  totalBeds: number,
  occupied: number,
  free: number,
  maintenance: number,
): RoomStatus {
  if (!isActive) return 'inactive';
  if (maintenance > 0) return 'maintenance';
  if (occupied === 0) return 'vacant';
  if (free === 0) return 'full';
  return 'occupied';
}

/**
 * `rooms.capacity` says one thing and the bed rows say another.
 *
 * Real on staging today: room 102 is capacity 2 with one bed. Nothing keeps the
 * two in step — beds are created individually and capacity is typed on the room
 * form — so the card states which number it is using rather than silently
 * preferring one. Beds win everywhere on this screen, because a student is
 * assigned to a bed row and a capacity cannot be slept in.
 */
function capacityNote(capacity: number, totalBeds: number): string | null {
  if (capacity <= 0 || capacity === totalBeds) return null;
  if (totalBeds < capacity) {
    return `Capacity says ${capacity} — ${capacity - totalBeds} bed${capacity - totalBeds === 1 ? '' : 's'} not created yet`;
  }
  return `Capacity says ${capacity}, but ${totalBeds} beds exist`;
}

function buildKpis(t: {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
  floors: number;
  maintenanceBeds: number;
}): Kpi[] {
  const pct = t.totalBeds > 0 ? (t.occupiedBeds / t.totalBeds) * 100 : null;

  /*
   * No deltas and no sparklines on this screen.
   *
   * The design gives every card one of each — "5 this month", "12 this month",
   * "18.6% vs last month" — and there is no room history anywhere: no endpoint
   * returns rooms or beds over time, and nothing records when a bed was added.
   * `formatDelta` returns null without a baseline by design, so rather than fake
   * one, each note states what the figure is counted from. That is the same
   * decision the dashboard made for its students card.
   *
   * "Monthly Revenue" is dropped outright. The design computes it as the sum of
   * `rooms.monthly_fee` for every room with an occupant — which is neither money
   * collected nor money billed. Both of those exist, on the dashboard and the
   * payments ledger, from real rows; a third number under the same word would
   * contradict them on a screen that cannot show its working.
   */
  return [
    {
      id: 'rooms',
      label: 'Total Rooms',
      value: formatAmount(t.totalRooms),
      currency: false,
      note: t.floors === 1 ? 'on one floor' : `across ${t.floors} floors`,
      noteTone: 'neutral',
    },
    {
      id: 'beds',
      label: 'Total Beds',
      value: formatAmount(t.totalBeds),
      currency: false,
      note: 'bed rows, not room capacity',
      noteTone: 'neutral',
    },
    {
      id: 'occupied',
      label: 'Occupied Beds',
      value: formatAmount(t.occupiedBeds),
      currency: false,
      note: 'students currently placed',
      noteTone: 'neutral',
    },
    {
      id: 'free',
      label: 'Vacant Beds',
      value: formatAmount(t.freeBeds),
      currency: false,
      note:
        t.maintenanceBeds > 0
          ? `${t.maintenanceBeds} more under maintenance`
          : 'ready to be filled',
      // Empty beds are lost rent, but an empty bed is also the normal state of a
      // hostel with room in it — so this is stated, not scored.
      noteTone: 'neutral',
    },
    {
      id: 'occupancy',
      label: 'Occupancy Rate',
      value: pct === null ? '—' : formatPct(pct),
      currency: false,
      note: pct === null ? 'no beds configured' : `${t.occupiedBeds} of ${t.totalBeds} beds`,
      noteTone: 'neutral',
    },
  ];
}

/** Rooms, beds and vacancies per floor. `rooms.floor` is free text, so it groups on the text. */
function buildFloors(rooms: RoomCard[]): FloorSummary[] {
  const byFloor = new Map<string, FloorSummary>();

  for (const room of rooms) {
    // Rooms with no floor recorded are a group of their own rather than being
    // dropped: they are still rooms somebody has to find, and folding them into
    // another floor's total would make that total wrong.
    const label = room.floor ?? 'No floor recorded';
    const entry = byFloor.get(label) ?? { label, rooms: 0, totalBeds: 0, freeBeds: 0 };
    entry.rooms += 1;
    entry.totalBeds += room.totalBeds;
    entry.freeBeds += room.freeBeds;
    byFloor.set(label, entry);
  }

  return [...byFloor.values()].sort((a, b) => a.label.localeCompare(b.label, 'en'));
}

function countFloors(rooms: RoomCard[]): number {
  return new Set(rooms.map((room) => room.floor ?? '')).size;
}

function matches(room: RoomCard, q: string): boolean {
  return (
    room.number.toLowerCase().includes(q) ||
    (room.floor?.toLowerCase().includes(q) ?? false) ||
    (room.roomTypeLabel?.toLowerCase().includes(q) ?? false) ||
    // An occupant's name, because "which room is Bilal in" is the other question
    // this board gets asked, and the roster cannot answer it the other way round.
    room.occupants.some((o) => o.name.toLowerCase().includes(q))
  );
}

function buildTabs(counts: Record<TabKey, number>, current: { tab: TabKey; q: string }): RoomsTab[] {
  return TAB_ORDER.map((key) => {
    const params = new URLSearchParams();
    if (key !== 'all') params.set('tab', key);
    if (current.q) params.set('q', current.q);
    const search = params.toString();

    return {
      key,
      label: TAB_LABEL[key],
      count: counts[key] ?? 0,
      current: key === current.tab,
      href: search ? `/rooms?${search}` : '/rooms',
    };
  });
}

function resultLabel(shown: number, everyone: number): string {
  const base = `${shown} of ${everyone} room${everyone === 1 ? '' : 's'}`;
  return shown === everyone ? `${everyone} room${everyone === 1 ? '' : 's'}` : base;
}

function isTab(value: string | undefined): value is TabKey {
  return value !== undefined && (TAB_ORDER as string[]).includes(value);
}

function isBedStatus(value: string | null): value is 'vacant' | 'occupied' | 'maintenance' {
  return value === 'vacant' || value === 'occupied' || value === 'maintenance';
}
