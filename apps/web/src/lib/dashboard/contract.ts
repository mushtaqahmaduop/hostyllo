/**
 * The dashboard's data contract.
 *
 * Every widget on the screen reads from `DashboardView` and nothing else. A figure that appears
 * in two places must be *the same figure*, not two independent reads that can drift — the KPI
 * strip's "Outstanding Dues" and the Pending Payments footer are the same field here.
 *
 * ── What changed, and why it matters ─────────────────────────────────────────────────────────
 * This file used to carry a third provenance, `sample`, described as "representative values so
 * the widget can be judged as a design". In practice that shipped: a hardcoded room-type split
 * reading "2 Seater: 40 rooms" against a database holding two rooms, and an invented 101–408
 * seat map. Once rendered, an invented figure is indistinguishable from a real one, and the
 * banner that was supposed to warn about it sat above eleven widgets without saying which.
 *
 * So `sample` is gone, and it is gone from the type rather than merely unused, because a union
 * member that exists will eventually be constructed. The rule is now:
 *
 *   live     — came from the API, is a real tenant figure.
 *   derived  — computed from live figures (a ratio, a percentage). Exact, not approximated.
 *   empty    — the tenant genuinely has none of this. The widget renders an empty state.
 *
 * There is no fourth case. If an endpoint cannot answer, the section is `empty` and the widget
 * says so; it does not draw a plausible number. See docs/00_RECONSTRUCTION_MANDATE_v2.md.
 */

/**
 * The only colours a widget may ask for — see styles/tokens.css §2.
 *
 * Five, not seven, and `neutral` is the default rather than a fallback. Pills default to grey,
 * semantic colour appears only when the state is one a person must act on, and stat-card icons
 * are all one neutral. Narrowing the union is how that stops being a convention somebody
 * remembers and starts being a thing the compiler refuses.
 */
export type Tone = 'neutral' | 'brand' | 'attention' | 'negative' | 'info' | 'positive';

export type Provenance = 'live' | 'derived' | 'empty';

/** Wraps a section with where its numbers came from. */
export type Sourced<T> = { data: T; from: Provenance };

// ─────────────────────────────── KPI strip ───────────────────────────────

export type Kpi = {
  id: string;
  label: string;
  /** Pre-formatted for display — the presenter owns formatting so widgets stay dumb. */
  value: string;
  tone: Tone;
  /** Supporting line under the figure, e.g. "12 this month" or "14.8% vs Jun 2026". */
  note: string;
  /**
   * How the note should read. `up`/`down` draw an arrow; the tone is decided by `noteTone`, not
   * by the direction — expenses rising is not a success, so arrow and colour stay separate.
   */
  direction: 'up' | 'down' | 'none';
  noteTone: Tone;
  /**
   * Real monthly history for this metric, oldest first, in the metric's own units. Empty when
   * the tenant has no history — the card then draws no sparkline rather than a flat invented
   * line. Previously this was a fourteen-point curve synthesised from a single month's total.
   */
  spark: number[];
};

// ──────────────────────────── Monthly overview ───────────────────────────

/**
 * One month of the twelve-month series, straight from `GET /dashboard/trend`.
 *
 * Every money field is nullable and null means "nothing to show" — a future month nobody has
 * billed yet. It does NOT mean zero: a zero would draw the line to the floor as though nothing
 * had been collected, which is the distinction `dashboard.js:1269` exists to preserve.
 */
export type MonthPoint = {
  key: string;
  label: string;
  full: string;
  /** The month has already happened. */
  isPast: boolean;
  /**
   * A future month that has nevertheless been billed — `rent-generate` bills ahead, so this is
   * real money with a date in the future. The chart should style it as projected-but-real
   * rather than hide it or present it as settled.
   */
  isFutureBilled: boolean;
  revenuePkr: number | null;
  expensesPkr: number | null;
  transfersPkr: number | null;
  pendingPkr: number | null;
};

export type MonthlySeries = { year: number; months: MonthPoint[] };

export type RangeKey = 'this-year' | 'last-6' | 'last-12';

// ──────────────────────────── Seat availability ──────────────────────────

/**
 * One real room. There is no synthesised floor plan: the previous shape described "four floors
 * of eight rooms, numbered 101…408" and rendered 32 tiles for a hostel with two rooms.
 */
export type SeatRoom = {
  id: string;
  /** The room's own number, as the operator knows it. Text, not an index. */
  no: string;
  floor: string | null;
  capacity: number;
  occupied: number;
  free: number;
  fillPct: number;
  isFull: boolean;
};

export type SeatMap = {
  rooms: SeatRoom[];
  totals: { rooms: number; seats: number; filled: number; free: number };
};

// ─────────────────────────── Today at a glance ───────────────────────────

export type GlanceItem = {
  id: string;
  label: string;
  value: string;
  tone: Tone;
  /** Money reads positive; counts read as plain text. */
  emphasis: 'money' | 'plain';
};

// ────────────────────────────── Donut cards ──────────────────────────────

/** One room type. Rooms and seats are both carried because the two differ and both are asked for. */
export type RoomTypeSlice = {
  label: string;
  color: string | null;
  rooms: number;
  roomsOccupied: number;
  roomsVacant: number;
  seats: number;
  seatsFilled: number;
  seatsFree: number;
  /** Percentage of this type's SEATS that are filled. */
  fullPct: number;
  /** Percentage of this type's ROOMS that have at least one occupant. */
  occupiedPct: number;
  defaultRentPkr: number | null;
};

/**
 * No `tone`. The method donut walks the violet ramp ordered by share, because payment methods
 * are slices of one collection total, not kinds of thing. A per-method colour would be a value
 * nobody could act on. Methods with no collections in the month are absent, not zero slices.
 */
export type MethodSlice = { label: string; amount: number; count: number };

export type BedSegment = { label: string; value: number; tone: Tone };

// ───────────────────────── Pending payments card ─────────────────────────

/**
 * No `tone`. The initials disc is neutral on every row — it identifies a person, and a colour
 * that cycles per row is decoration pretending to be data. Status is the only colourable thing.
 */
export type PendingPayment = {
  id: string;
  name: string;
  room: string;
  dueDate: string;
  amount: number;
  status: 'Partial' | 'Unpaid' | 'Overdue';
};

// ──────────────────────── Needs attention (was Reminders) ────────────────

/**
 * Replaces the old `Reminder` type, which had no data source and was filled with invented
 * entries. These are real obligations the tenant actually has: cancellations awaiting a
 * decision (which free beds when confirmed) and notices that have not expired.
 */
export type AttentionIcon = 'cancellation' | 'notice' | 'maintenance' | 'complaint';

export type AttentionItem = {
  id: string;
  title: string;
  when: string;
  icon: AttentionIcon;
  tone: Tone;
  href: string | null;
};

// ──────────────────────────────── The view ───────────────────────────────

export type DashboardView = {
  /** Header chrome. */
  today: string;
  greetingName: string;
  branchName: string;
  sessionLabel: string;
  /** Badge on the bell — unresolved complaints. */
  alertCount: number;
  /** Nav badges, keyed by nav item href. */
  navBadges: Record<string, number>;

  kpis: Sourced<Kpi[]>;
  series: Sourced<MonthlySeries>;
  seatMap: Sourced<SeatMap>;
  glance: Sourced<GlanceItem[]>;
  roomTypes: Sourced<RoomTypeSlice[]>;
  methods: Sourced<MethodSlice[]>;
  beds: Sourced<BedSegment[]>;
  pending: Sourced<PendingPayment[]>;
  attention: Sourced<AttentionItem[]>;

  /** Totals every widget shares, so no two cards can disagree. */
  totals: {
    collection: number;
    expenses: number;
    transfers: number;
    profit: number;
    dues: number;
    dueStudents: number;
  };
};
