/**
 * The Rooms board — what the screen is allowed to render.
 *
 * The question this screen answers is spatial: *where can I put someone*. Every
 * figure on it is therefore about beds, and every bed figure comes from bed rows
 * rather than from `rooms.capacity` — a student is assigned to a bed row, so the
 * beds that exist are the people who can be placed. Capacity is the intent, and
 * the two disagree in real data (staging's room 102 has capacity 2 and one bed).
 * Both travel to the screen so it can say so instead of quietly picking one.
 */

/**
 * A room's state, derived — nothing stores it.
 *
 * The design draws six tabs: All, Vacant, Occupied, Maintenance, Reserved,
 * Cleaning. `beds.status` is a three-value CHECK (vacant / occupied /
 * maintenance) and rooms carry `is_active`; there is no reservation and no
 * cleaning anywhere in the schema, and inventing either would put a state on
 * screen that nothing can ever set or clear.
 *
 * So two of the design's six are replaced by two that are real and that a warden
 * acts on: **full** (a room with no free bed — the answer to "not here") and
 * **inactive** (`is_active = false`, which the API already filters on and which
 * otherwise hides in plain sight among the vacant rooms).
 */
export type RoomStatus = 'vacant' | 'occupied' | 'full' | 'maintenance' | 'inactive';

export type TabKey = 'all' | RoomStatus;

export type Occupant = {
  studentId: string;
  name: string;
  initials: string;
  /** `BSCS - 2nd Year`, or null — free text on the student, often not collected. */
  course: string | null;
  /** What this student owes across every non-void payment. 0 is a real answer. */
  unpaid: number;
};

export type Bed = {
  id: string;
  label: string;
  status: 'vacant' | 'occupied' | 'maintenance';
  occupant: Occupant | null;
};

export type RoomCard = {
  id: string;
  number: string;
  floor: string | null;
  /** `standard` | `ac` | `deluxe` | `dormitory` — migration 002's CHECK. */
  roomType: string | null;
  roomTypeLabel: string | null;
  rent: number;
  /** Bed rows that exist. The denominator for everything on the card. */
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
  maintenanceBeds: number;
  /** `rooms.capacity` — the intent. Only surfaced when it disagrees with `totalBeds`. */
  capacity: number;
  /** Set when capacity and bed rows disagree: the card says which number it is using. */
  capacityNote: string | null;
  /** 0–100, of bed rows. Null when the room has no beds at all — not 0%. */
  occupancyPct: number | null;
  status: RoomStatus;
  statusLabel: string;
  beds: Bed[];
  occupants: Occupant[];
  /** Open or in-progress maintenance requests against this room. */
  openMaintenance: number;
  /** The highest-priority open request's title, for the card's note. */
  maintenanceTitle: string | null;
  maintenancePriority: string | null;
};

export type FloorSummary = {
  /** `Ground`, or "No floor recorded" — `rooms.floor` is free text and often blank. */
  label: string;
  rooms: number;
  totalBeds: number;
  freeBeds: number;
};

export type RoomsTab = {
  key: TabKey;
  label: string;
  count: number;
  current: boolean;
  href: string;
};

export type Kpi = {
  id: string;
  label: string;
  value: string;
  currency: boolean;
  note: string;
  noteTone: 'positive' | 'negative' | 'neutral';
};

export type RoomsView = {
  rooms: RoomCard[];
  tabs: RoomsTab[];
  kpis: Kpi[];
  floors: FloorSummary[];
  /** Rooms with at least one free bed, fewest free first — the placement shortlist. */
  vacancies: { id: string; number: string; floor: string | null; freeBeds: number }[];
  /** `8 of 24 rooms` — built where the numbers are. */
  resultLabel: string;
  q: string;
  tab: TabKey;
  /** True when a tab or a search is narrowing the board — drives the empty state. */
  narrowed: boolean;
  /** Total free beds across the hostel. The headline answer to the screen's question. */
  freeBeds: number;
};

export const STATUS_LABEL: Record<RoomStatus, string> = {
  vacant: 'Vacant',
  occupied: 'Occupied',
  full: 'Full',
  maintenance: 'Maintenance',
  inactive: 'Inactive',
};

export const TAB_ORDER: TabKey[] = ['all', 'vacant', 'occupied', 'full', 'maintenance', 'inactive'];

export const TAB_LABEL: Record<TabKey, string> = {
  all: 'All',
  ...STATUS_LABEL,
};

/** `rooms.type` → the operator's word. Passed through when it is something else. */
export const ROOM_TYPE_LABEL: Record<string, string> = {
  standard: 'Standard',
  ac: 'AC',
  deluxe: 'Deluxe',
  dormitory: 'Dormitory',
};
