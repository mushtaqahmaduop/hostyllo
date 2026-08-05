/**
 * The dashboard's data contract.
 *
 * Every widget on the screen reads from `DashboardView` and nothing else. The
 * point is the same one the design file makes with its single `book()` object:
 * a figure that appears in two places must be *the same figure*, not two
 * independent reads that can drift. The KPI strip's "Outstanding Dues" and the
 * Pending Payments card's footer are the same number here because they are the
 * same field.
 *
 * ── Why a contract before the endpoints exist ────────────────────────────────
 * Eight of the eleven widgets have no API behind them yet (`/dashboard/stats`
 * covers four of the six KPIs; `/dashboard/alerts` returns hardcoded zeros for
 * maintenance and complaints). Rather than shape the UI around what happens to
 * be fetchable today, the shape is declared here first and the presenter fills
 * it from whatever is available. Each section carries its own `Provenance`, so
 * "this number is real" is a fact the type system tracks rather than a comment
 * that rots.
 *
 * `live`    — came from the API, is a real tenant figure.
 * `derived` — computed from live figures (a ratio, a split, a month series
 *             projected from one month's total). Directionally true, not exact.
 * `sample`  — no input exists at all; representative values so the widget can
 *             be judged as a design. Never let one of these reach a decision.
 */

/**
 * The only colours a widget may ask for — see styles/tokens.css §2.
 *
 * Five, not seven, and `neutral` is the default rather than a fallback. The
 * design rules are explicit: pills default to grey, semantic colour appears only
 * when the state is one a person must act on, and stat-card icons are all one
 * neutral. Narrowing the union is how that stops being a convention somebody
 * remembers and starts being a thing the compiler refuses.
 *
 *   neutral    the default — nothing to act on
 *   brand      the one accent; one filled action per screen, plus chart series
 *   attention  a human must act — overdue, pending review, out of service
 *   negative   failed or destructive
 *   info       neutral scheduled activity
 *   positive   confirmed — used for state, never for a money figure
 */
export type Tone = 'neutral' | 'brand' | 'attention' | 'negative' | 'info' | 'positive';

export type Provenance = 'live' | 'derived' | 'sample';

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
   * How the note should read. `up`/`down` draw an arrow; the tone is decided by
   * `noteTone`, not by the direction — expenses rising is not a success, so the
   * arrow and the colour are deliberately separate decisions.
   */
  direction: 'up' | 'down' | 'none';
  noteTone: Tone;
  /** 14 points, oldest first, in the metric's own units. The card scales them. */
  spark: number[];
};

// ──────────────────────────── Monthly overview ───────────────────────────

export type MonthlySeries = {
  /** Month labels, oldest first: `["Feb","Mar",…]`. */
  labels: string[];
  collection: number[];
  expenses: number[];
  profit: number[];
};

export type RangeKey = 'this-year' | 'last-6' | 'last-12';

// ──────────────────────────── Seat availability ──────────────────────────

export type SeatState = 'free' | 'occupied' | 'maintenance';

export type SeatRoom = { no: number; state: SeatState };

export type SeatMap = {
  /** The block this map is showing — the design shows one block, not the whole hostel. */
  blockLabel: string;
  /** Rows of rooms, one array per floor. */
  floors: SeatRoom[][];
  totals: { total: number; free: number; filled: number };
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

/** One slice of the room-type donut. Rooms, not beds — the two differ. */
export type RoomTypeSlice = {
  label: string;
  rooms: number;
  roomsFull: number;
  seats: number;
  seatsFree: number;
  /** Percentage of this type's rooms that are full. */
  fullPct: number;
};

/**
 * No `tone`. The method donut walks the violet ramp ordered by share, because
 * five payment methods are five slices of one collection total, not five kinds
 * of thing. A per-method colour would be a value nobody could act on.
 */
export type MethodSlice = { label: string; amount: number };

export type BedSegment = { label: string; value: number; tone: Tone };

// ───────────────────────── Pending payments card ─────────────────────────

/**
 * No `tone`. The initials disc is neutral on every row — it identifies a person,
 * and a colour that cycles per row is decoration pretending to be data. The
 * status is the only thing here that can be coloured, and only when it is
 * `Overdue`.
 */
export type PendingPayment = {
  id: string;
  name: string;
  room: string;
  dueDate: string;
  amount: number;
  status: 'Partial' | 'Unpaid' | 'Overdue';
};

// ──────────────────────────── Reminders card ─────────────────────────────

export type ReminderIcon = 'calendar' | 'clipboard' | 'meeting' | 'bolt';

export type Reminder = {
  id: string;
  title: string;
  when: string;
  /** A reminder carries an amount or a tag, never both. */
  amount: number | null;
  tag: string | null;
  icon: ReminderIcon;
  /**
   * Reserved. Rendered neutral today — an upcoming obligation is a reminder, not
   * an alarm. It becomes visible the day a reminder can be genuinely overdue.
   */
  tone: Tone;
};

// ──────────────────────────────── The view ───────────────────────────────

export type DashboardView = {
  /** Header chrome. */
  today: string;
  greetingName: string;
  branchName: string;
  sessionLabel: string;
  /** Badge on the bell — open complaints. */
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
  reminders: Sourced<Reminder[]>;

  /** Totals every widget shares, so no two cards can disagree. */
  totals: {
    collection: number;
    expenses: number;
    profit: number;
    dues: number;
    dueStudents: number;
  };

  /**
   * True when any section above is `derived` or `sample`. The page shows one
   * discreet marker when it is — an operator must never mistake a projected
   * month series for a reconciled one.
   */
  hasUnverifiedData: boolean;
};
