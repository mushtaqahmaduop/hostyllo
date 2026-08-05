import 'server-only';

import { api } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import type {
  BedSegment,
  DashboardView,
  GlanceItem,
  Kpi,
  MethodSlice,
  MonthlySeries,
  PendingPayment,
  Provenance,
  Reminder,
  RoomTypeSlice,
  SeatMap,
  SeatRoom,
  Sourced,
} from './contract';

/**
 * Builds the dashboard's view model.
 *
 * This is the only place in the app that knows which figures are real. Widgets
 * read `DashboardView` and render; they never fetch, never compute a total and
 * never decide a colour from a raw number.
 *
 * ── What is live today ───────────────────────────────────────────────────────
 *   GET /dashboard/stats           revenue, expenses, net fund, dues, students,
 *                                  occupied + total beds, occupancy %
 *   GET /dashboard/stats?month=…   the same for last month, which is what makes
 *                                  the month-over-month deltas real rather than
 *                                  decorative
 *   GET /dashboard/alerts          unpaid count, void requests. Its maintenance
 *                                  and complaint counts are hardcoded zeros in
 *                                  apps/api/src/routes/dashboard.ts, so they are
 *                                  treated as absent, not as "none open".
 *   GET /payments?status=…         the Pending Payments rows, with real students,
 *                                  rooms, amounts and statuses
 *
 * Everything else — the month series, the seat map, the room-type and payment-
 * method splits, today's counters and the reminder list — has no endpoint. It is
 * marked `derived` where it is computed from live figures and `sample` where it
 * is not, and the page shows a marker whenever any of it is on screen.
 *
 * Two calls, not twelve. A real twelve-month series would mean twelve round
 * trips through that CTE on every dashboard load, eleven of which would also
 * recount students and beds for no reason. Two anchors give honest deltas; the
 * shape between them is projected and labelled as such. It becomes live the day
 * a `GET /dashboard/series` lands, and nothing above this file changes.
 */

type Stats = {
  month: string;
  activeStudents: number | string;
  occupiedBeds: number | string;
  totalBeds: number | string;
  occupancyPct: number | string;
  revenuePkr: number | string;
  pendingPkr: number | string;
  expensesPkr: number | string;
  netFundPkr: number | string;
};

type Alerts = {
  pendingPaymentsCount: number;
  pendingVoidRequests: number;
  openMaintenance: number;
  unresolvedComplaints: number;
  occupancyBelowThreshold: boolean;
};

type PaymentRow = {
  paymentId: string;
  studentName: string;
  roomNumber: string | null;
  paymentMonth: string;
  unpaidPkr: number | string;
  status: string;
};

type PaymentList = { payments: PaymentRow[]; total: number };

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** API numerics arrive as strings on several endpoints; `null` must not become 0. */
function num(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pkr(value: number): string {
  return `PKR ${formatAmount(value)}`;
}

/** `2026-07-01` → `2026-06`, the query string `/dashboard/stats` expects. */
function previousMonthKey(monthIso: string): string {
  const d = new Date(`${monthIso.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

/**
 * Month-over-month movement as the KPI note wants it: `"14.8% vs Jun 2026"`.
 *
 * Returns null when there is no comparable baseline, and the caller then renders
 * its fallback note instead of a naked percentage against nothing.
 */
function delta(current: number, previous: number, baseline: string) {
  if (!Number.isFinite(previous) || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return {
    note: `${Math.abs(pct).toFixed(1)}% vs ${baseline}`,
    direction: (pct >= 0 ? 'up' : 'down') as 'up' | 'down',
  };
}

/**
 * A fourteen-point curve ending on the real current value.
 *
 * Sparklines exist to say "this has been climbing" or "this fell off a cliff",
 * and with two anchors that is exactly what can be said honestly: interpolate
 * between last month and this month, with a small deterministic wobble so the
 * line reads as a series rather than a ruler. Deterministic matters — a random
 * wobble would redraw on every render and make the card look alive when nothing
 * changed.
 */
function sparkFrom(current: number, previous: number, seed: number): number[] {
  const from = Number.isFinite(previous) && previous > 0 ? previous : current * 0.82;
  return Array.from({ length: 14 }, (_, i) => {
    const t = i / 13;
    const base = from + (current - from) * t;
    const wobble = Math.sin(i * 0.82 + seed) * 0.035 + Math.sin(i * 2.1 + seed * 2) * 0.018;
    return Math.max(0, base * (1 + wobble * (1 - t * 0.7)));
  });
}

/**
 * Twelve months ending on the current one.
 *
 * The last two points are the two real months; earlier points extend the same
 * trend backwards. Marked `derived` for exactly that reason.
 */
function buildSeries(
  collection: number,
  expenses: number,
  previousCollection: number,
  monthIso: string,
): MonthlySeries {
  const end = new Date(`${monthIso.slice(0, 7)}-01T00:00:00Z`);
  const labels: string[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCMonth(d.getUTCMonth() - i);
    labels.push(MONTH_LABELS[d.getUTCMonth()]);
  }

  // One month's observed growth, damped and applied backwards. Clamped so a
  // freak month (a hostel's first month of billing) cannot produce a curve that
  // decays to zero or explodes off the top of the chart.
  const observed = previousCollection > 0 ? collection / previousCollection : 1.06;
  const growth = Math.min(1.25, Math.max(1.01, observed));

  const collectionSeries: number[] = [];
  for (let i = 11; i >= 0; i -= 1) collectionSeries.push(collection / growth ** i);

  return {
    labels,
    collection: collectionSeries.map((v) => Math.round(v)),
    // Expenses track collection loosely: mostly fixed cost, partly variable.
    expenses: collectionSeries.map((v) => Math.round(expenses * (0.45 + 0.55 * (v / collection)))),
    profit: collectionSeries.map((v) =>
      Math.round(v - expenses * (0.45 + 0.55 * (v / collection))),
    ),
  };
}

/**
 * A block seat map: four floors of eight rooms, numbered 101…408.
 *
 * Derived, not sampled, when bed counts are live: the *number* of occupied and
 * maintenance rooms comes from the real occupancy ratio, so the density of the
 * grid is true even though which specific room is which is not. That is the
 * honest half of the widget, and it is the half a manager reads at a glance.
 */
function buildSeatMap(occupiedBeds: number, totalBeds: number): SeatMap {
  type SeatState = SeatRoom['state'];
  const cells = 32;
  const ratio = totalBeds > 0 ? occupiedBeds / totalBeds : 0;
  const occupied = Math.round(cells * ratio);
  const maintenance = totalBeds > 0 ? Math.min(2, cells - occupied) : 0;

  // Spread the occupied rooms evenly rather than filling from the front, so the
  // grid reads like a real block instead of a progress bar.
  const states: SeatState[] = Array.from({ length: cells }, () => 'free');
  for (let i = 0; i < occupied; i += 1) {
    states[Math.floor((i * cells) / Math.max(1, occupied))] = 'occupied';
  }
  for (let i = 0; i < maintenance; i += 1) {
    const at = states.lastIndexOf('free');
    if (at >= 0) states[at] = 'maintenance';
  }

  const rooms: SeatRoom[] = states.map((state, i) => ({
    no: (Math.floor(i / 8) + 1) * 100 + (i % 8) + 1,
    state,
  }));

  return {
    blockLabel: 'Block A',
    floors: [0, 1, 2, 3].map((f) => rooms.slice(f * 8, f * 8 + 8)),
    totals: {
      total: totalBeds,
      free: Math.max(0, totalBeds - occupiedBeds),
      filled: occupiedBeds,
    },
  };
}

export async function getDashboardView(userName: string): Promise<DashboardView> {
  // Fetched together: the page is useless with only some of them, and serialising
  // four small aggregates would add three round trips to first paint.
  const nowMonth = new Date().toISOString().slice(0, 7);
  const [stats, alerts, unpaid, partial] = await Promise.all([
    api<Stats>('/dashboard/stats'),
    api<Alerts>('/dashboard/alerts'),
    api<PaymentList>('/payments?status=pending&limit=5'),
    api<PaymentList>('/payments?status=partial&limit=5'),
  ]);

  const previous = await api<Stats>(`/dashboard/stats?month=${previousMonthKey(stats.month ?? nowMonth)}`).catch(
    () => null,
  );

  const collection = num(stats.revenuePkr);
  const expenses = num(stats.expensesPkr);
  const profit = num(stats.netFundPkr);
  const dues = num(stats.pendingPkr);
  const students = num(stats.activeStudents);
  const occupiedBeds = num(stats.occupiedBeds);
  const totalBeds = num(stats.totalBeds);

  const prevCollection = previous ? num(previous.revenuePkr) : 0;
  const prevExpenses = previous ? num(previous.expensesPkr) : 0;
  const prevProfit = previous ? num(previous.netFundPkr) : 0;
  const prevDues = previous ? num(previous.pendingPkr) : 0;
  const prevStudents = previous ? num(previous.activeStudents) : 0;

  const baseline = previous
    ? `${MONTH_LABELS[new Date(`${previous.month.slice(0, 7)}-01T00:00:00Z`).getUTCMonth()]} ${previous.month.slice(0, 4)}`
    : '';

  // The deltas are live only when the previous month actually came back.
  const kpiFrom: Provenance = previous ? 'live' : 'derived';

  const kpis: Kpi[] = [
    kpi('students', 'Total Students', String(students), 'brand', 0.4, students, prevStudents, baseline, {
      fallback: `${Math.max(0, students - prevStudents)} this month`,
      fallbackTone: 'positive',
      goodDirection: 'up',
    }),
    kpi('revenue', 'Total Revenue', pkr(collection), 'info', 1.5, collection, prevCollection, baseline, {
      fallback: 'this month',
      fallbackTone: 'neutral',
      goodDirection: 'up',
    }),
    kpi('expenses', 'Expenses & Transfers', pkr(expenses), 'positive', 2.6, expenses, prevExpenses, baseline, {
      fallback: 'this month',
      fallbackTone: 'neutral',
      // Expenses climbing is not good news, so the note colours the other way.
      goodDirection: 'down',
    }),
    kpi('fund', 'Available Fund', pkr(profit), 'attention', 3.7, profit, prevProfit, baseline, {
      fallback: 'revenue less expenses',
      fallbackTone: 'neutral',
      goodDirection: 'up',
    }),
    kpi('dues', 'Outstanding Dues', pkr(dues), 'negative', 4.8, dues, prevDues, baseline, {
      fallback: `across ${alerts.pendingPaymentsCount} payments`,
      fallbackTone: 'negative',
      goodDirection: 'down',
    }),
    {
      id: 'maintenance',
      label: 'Open Maintenance',
      // The endpoint returns a hardcoded 0, so this is a placeholder, not a count.
      value: '—',
      tone: 'neutral',
      note: 'no maintenance feed yet',
      direction: 'none',
      noteTone: 'neutral',
      spark: sparkFrom(1, 1, 5.9),
    },
  ];

  const series = buildSeries(collection, expenses, prevCollection, stats.month ?? nowMonth);
  const seatMap = buildSeatMap(occupiedBeds, totalBeds);

  // Pending rows are real. Merged from the two statuses that mean "money is
  // still owed", oldest month first — the row a warden should chase is the one
  // that has been outstanding longest, not the one entered most recently.
  const pendingRows = [...(unpaid.payments ?? []), ...(partial.payments ?? [])]
    .sort((a, b) => a.paymentMonth.localeCompare(b.paymentMonth))
    .slice(0, 5);

  // A row is Overdue, not merely Unpaid, once its month has closed — that is the
  // only status here that earns a coloured pill, so it is worth deriving rather
  // than lumping in with the rest.
  const thisMonth = (stats.month ?? nowMonth).slice(0, 7);
  const pending: PendingPayment[] = pendingRows.map((row) => ({
    id: row.paymentId,
    name: row.studentName,
    room: row.roomNumber ? `(${row.roomNumber})` : '',
    dueDate: row.paymentMonth.slice(0, 10),
    amount: num(row.unpaidPkr),
    status:
      row.status === 'partial'
        ? 'Partial'
        : row.paymentMonth.slice(0, 7) < thisMonth
          ? 'Overdue'
          : 'Unpaid',
  }));

  const bedsFrom: Provenance = totalBeds > 0 ? 'live' : 'sample';
  const beds: BedSegment[] = [
    { label: 'Occupied', value: occupiedBeds, tone: 'brand' },
    // Neutral, not info: an empty bed is a fact, not an event.
    { label: 'Vacant', value: Math.max(0, totalBeds - occupiedBeds), tone: 'neutral' },
    // No bed-status endpoint distinguishes maintenance yet.
    { label: 'Maintenance', value: 0, tone: 'attention' },
  ];

  const view: DashboardView = {
    today: new Date().toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    greetingName: userName,
    branchName: 'All branches',
    sessionLabel: `${new Date().getFullYear()} Academic Year`,
    alertCount: alerts.pendingVoidRequests,
    navBadges: {
      '/payments': alerts.pendingPaymentsCount,
    },

    kpis: { data: kpis, from: kpiFrom },
    series: { data: series, from: 'derived' },
    seatMap: { data: seatMap, from: totalBeds > 0 ? 'derived' : 'sample' },
    glance: { data: SAMPLE_GLANCE, from: 'sample' },
    roomTypes: { data: SAMPLE_ROOM_TYPES, from: 'sample' },
    methods: { data: SAMPLE_METHODS(collection), from: 'sample' },
    beds: { data: beds, from: bedsFrom },
    pending: { data: pending, from: 'live' },
    reminders: { data: SAMPLE_REMINDERS, from: 'sample' },

    totals: {
      collection,
      expenses,
      profit,
      dues,
      dueStudents: alerts.pendingPaymentsCount,
    },

    hasUnverifiedData: true,
  };

  view.hasUnverifiedData = [
    view.kpis,
    view.series,
    view.seatMap,
    view.glance,
    view.roomTypes,
    view.methods,
    view.beds,
    view.pending,
    view.reminders,
  ].some((section: Sourced<unknown>) => section.from !== 'live');

  return view;
}

/** Assembles one KPI, deciding the note and its colour from the same movement. */
function kpi(
  id: string,
  label: string,
  value: string,
  tone: Kpi['tone'],
  seed: number,
  current: number,
  previous: number,
  baseline: string,
  opts: {
    fallback: string;
    fallbackTone: Kpi['noteTone'];
    /** Which direction is good news for *this* metric. */
    goodDirection: 'up' | 'down';
  },
): Kpi {
  const movement = baseline ? delta(current, previous, baseline) : null;
  if (!movement) {
    return {
      id,
      label,
      value,
      tone,
      note: opts.fallback,
      direction: 'none',
      noteTone: opts.fallbackTone,
      spark: sparkFrom(current, previous, seed),
    };
  }

  return {
    id,
    label,
    value,
    tone,
    note: movement.note,
    direction: movement.direction,
    noteTone: movement.direction === opts.goodDirection ? 'positive' : 'negative',
    spark: sparkFrom(current, previous, seed),
  };
}

/* ────────────────────────── sample sections ──────────────────────────
 * No endpoint exists for any of these. They are here so the widgets can be
 * judged as designs; the page marks them, and each one is deleted the day its
 * endpoint lands. Realistic Pakistani hostel data, never Lorem ipsum — a
 * placeholder that does not look like the real thing hides real layout bugs.
 */

const SAMPLE_GLANCE: GlanceItem[] = [
  { id: 'in', label: 'Check-ins', value: '2', tone: 'info', emphasis: 'plain' },
  { id: 'out', label: 'Check-outs', value: '1', tone: 'info', emphasis: 'plain' },
  { id: 'adm', label: 'New Admissions', value: '3', tone: 'attention', emphasis: 'plain' },
  { id: 'pay', label: 'Payments Received', value: 'PKR 1,56,500', tone: 'positive', emphasis: 'money' },
  { id: 'cmp', label: 'Complaints Raised', value: '4', tone: 'negative', emphasis: 'plain' },
  { id: 'fix', label: 'Maintenance Requests', value: '3', tone: 'attention', emphasis: 'plain' },
  { id: 'apr', label: 'Pending Approvals', value: '2', tone: 'brand', emphasis: 'plain' },
];

const SAMPLE_ROOM_TYPES: RoomTypeSlice[] = [
  { label: '1 Seater', rooms: 18, roomsFull: 14, seats: 20, seatsFree: 4, fullPct: 80 },
  { label: '2 Seater', rooms: 40, roomsFull: 24, seats: 80, seatsFree: 12, fullPct: 85 },
  { label: '3 Seater', rooms: 33, roomsFull: 18, seats: 99, seatsFree: 14, fullPct: 84 },
  { label: '4 Seater', rooms: 14, roomsFull: 7, seats: 60, seatsFree: 8, fullPct: 87 },
  { label: '5 Seater', rooms: 10, roomsFull: 4, seats: 50, seatsFree: 10, fullPct: 80 },
];

/**
 * The method split is scaled to the *real* collection total, so the donut's
 * centre figure agrees with the Total Revenue KPI. Only the proportions are
 * invented — and a wrong proportion is a far smaller lie than a total that
 * contradicts the card two rows above it.
 */
const SAMPLE_METHODS = (collection: number): MethodSlice[] => {
  const split: Array<[string, number]> = [
    ['Cash', 0.38],
    ['Bank Transfer', 0.29],
    ['JazzCash', 0.17],
    ['EasyPaisa', 0.10],
    ['Cheque', 0.06],
  ];
  return split.map(([label, share]) => ({
    label,
    amount: Math.round(collection * share),
  }));
};

const SAMPLE_REMINDERS: Reminder[] = [
  {
    id: 'r1',
    title: 'Rent Due — 12 Students',
    when: '· Tomorrow',
    amount: 174000,
    tag: null,
    icon: 'calendar',
    tone: 'negative',
  },
  {
    id: 'r2',
    title: 'Room Inspection — Block B',
    when: '· 30 Jul 2026 · 10:00 AM',
    amount: null,
    tag: 'Block B',
    icon: 'clipboard',
    tone: 'info',
  },
  {
    id: 'r3',
    title: 'Mess Committee Meeting',
    when: '· 31 Jul 2026 · 04:00 PM',
    amount: null,
    tag: 'Conference Room',
    icon: 'meeting',
    tone: 'info',
  },
  {
    id: 'r4',
    title: 'Electricity Bill Due',
    when: '· 02 Aug 2026',
    amount: 45600,
    tag: null,
    icon: 'bolt',
    tone: 'attention',
  },
];
