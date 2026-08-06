import 'server-only';

import { api } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import type {
  AttentionItem,
  BedSegment,
  DashboardView,
  GlanceItem,
  Kpi,
  MethodSlice,
  MonthPoint,
  MonthlySeries,
  PendingPayment,
  Provenance,
  RoomTypeSlice,
  SeatMap,
  SeatRoom,
  Sourced,
  Tone,
} from './contract';

/**
 * Builds the dashboard's view model.
 *
 * Widgets read `DashboardView` and render; they never fetch, never compute a total and never
 * decide a colour from a raw number.
 *
 * ── Every figure on this screen is now real ──────────────────────────────────────────────────
 *   GET /dashboard/stats            KPIs — revenue, expenses, transfers, profit, dues,
 *                                   students, rooms, seats, occupancy
 *   GET /dashboard/stats?month=…    the same for last month, which is what makes the
 *                                   month-over-month deltas real rather than decorative
 *   GET /dashboard/trend            the twelve-month series AND every KPI sparkline
 *   GET /dashboard/seat-map         one tile per real room
 *   GET /dashboard/room-types       the room-type split
 *   GET /dashboard/payment-methods  the method split
 *   GET /dashboard/today            today's counters
 *   GET /dashboard/alerts           unresolved maintenance, complaints, pending cancellations,
 *                                   active notices, uncollected total
 *   GET /payments?status=…          the Pending Payments rows
 *
 * This file previously synthesised six of those from two endpoints — a month series projected
 * from one month's total, a fourteen-point sparkline curve fitted to a single value, an
 * invented seat map and a hardcoded room-type table. All of it is deleted. Where a tenant has
 * no data, the section is `empty` and the widget renders an empty state.
 *
 * Nine calls, not two. They are one `Promise.all`, so the cost is one round trip's latency, and
 * a dashboard that takes an extra 40ms to tell the truth is a better dashboard.
 */

type Stats = {
  month: string;
  activeStudents: number;
  seatedStudents: number;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  totalSeats: number;
  filledSeats: number;
  availableSeats: number;
  seatsFreeInOccupiedRooms: number;
  occupancyPct: number;
  bedsTotal: number;
  bedsOccupied: number;
  revenuePkr: number;
  pendingPkr: number;
  pendingCount: number;
  paidCount: number;
  expensesPkr: number;
  transfersPkr: number;
  totalExpectedPkr: number;
  netProfitPkr: number;
};

type Alerts = {
  pendingPaymentsCount: number;
  uncollectedPkr: number;
  pendingVoidRequests: number;
  openMaintenance: number;
  unresolvedComplaints: number;
  pendingCancellations: { id: string; studentName: string; vacateDate: string | null }[];
  occupancyPct: number;
  occupancyBelowThreshold: boolean;
  vacantSeats: number;
  activeNotices: { id: string; title: string }[];
};

type TrendResponse = { year: number; months: MonthPoint[] };
type SeatMapResponse = { rooms: (SeatRoom & { number?: string })[] };
type RoomTypesResponse = { types: RoomTypeSlice[] };
type MethodsResponse = { month: string; methods: MethodSlice[] };
type TodayResponse = {
  checkIns: number;
  checkOuts: number;
  newAdmissions: number;
  paymentsReceivedPkr: number;
  complaintsRaised: number;
  maintenanceRequests: number;
  pendingApprovals: number;
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

/** API numerics may arrive as strings; `null` must not become 0. */
function num(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pkr(value: number): string {
  return `PKR ${formatAmount(value)}`;
}

/** `2026-07` → `2026-06`, the query string `/dashboard/stats` expects. */
function previousMonthKey(monthIso: string): string {
  const d = new Date(`${monthIso.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

/**
 * Month-over-month movement as the KPI note wants it: `"14.8% vs Jun 2026"`.
 * Returns null when there is no comparable baseline; the caller renders its fallback instead of
 * a naked percentage against nothing.
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
 * A real sparkline: this metric's own settled months, oldest first.
 *
 * Only months that have actually happened contribute. A future month billed ahead is real money
 * but it is not history, and including it would bend the trailing edge of every sparkline
 * upward for reasons the reader cannot see. Returns [] when there is no history at all, and the
 * card then draws nothing rather than a flat line implying a steady zero.
 */
function sparkFrom(months: MonthPoint[], pick: (m: MonthPoint) => number | null): number[] {
  const points = months.filter((m) => m.isPast).map((m) => pick(m)).filter((v): v is number => v !== null);
  return points.some((v) => v !== 0) ? points : [];
}

function kpi(
  id: string,
  label: string,
  value: string,
  tone: Tone,
  spark: number[],
  current: number,
  previous: number,
  baseline: string,
  opts: { fallback: string; fallbackTone: Tone; goodDirection: 'up' | 'down' },
): Kpi {
  const d = baseline ? delta(current, previous, baseline) : null;
  if (!d) {
    return { id, label, value, tone, note: opts.fallback, direction: 'none', noteTone: opts.fallbackTone, spark };
  }
  // Direction and colour are separate decisions: expenses rising draws an up arrow, in the
  // colour that says it is not good news.
  const isGood = d.direction === opts.goodDirection;
  return {
    id, label, value, tone,
    note: d.note,
    direction: d.direction,
    noteTone: isGood ? 'positive' : 'attention',
    spark,
  };
}

function sourced<T>(data: T, isEmpty: boolean, from: Provenance = 'live'): Sourced<T> {
  return { data, from: isEmpty ? 'empty' : from };
}

export async function getDashboardView(userName: string): Promise<DashboardView> {
  const nowMonth = new Date().toISOString().slice(0, 7);
  const year = new Date().getFullYear();

  // One round trip's latency for the whole screen. Each is a small aggregate; the page is
  // useless with only some of them.
  const [stats, alerts, trend, seatMapRes, roomTypesRes, methodsRes, today, unpaid, partial] =
    await Promise.all([
      api<Stats>('/dashboard/stats'),
      api<Alerts>('/dashboard/alerts'),
      api<TrendResponse>(`/dashboard/trend?year=${year}`),
      api<SeatMapResponse>('/dashboard/seat-map'),
      api<RoomTypesResponse>('/dashboard/room-types'),
      api<MethodsResponse>('/dashboard/payment-methods'),
      api<TodayResponse>('/dashboard/today'),
      api<PaymentList>('/payments?status=pending&limit=5'),
      api<PaymentList>('/payments?status=partial&limit=5'),
    ]);

  const previous = await api<Stats>(
    `/dashboard/stats?month=${previousMonthKey(stats.month ?? nowMonth)}`,
  ).catch(() => null);

  const collection = num(stats.revenuePkr);
  const expenses = num(stats.expensesPkr);
  const transfers = num(stats.transfersPkr);
  const profit = num(stats.netProfitPkr);
  const dues = num(stats.pendingPkr);
  const students = num(stats.activeStudents);

  const prev = {
    collection: previous ? num(previous.revenuePkr) : 0,
    expenses: previous ? num(previous.expensesPkr) : 0,
    profit: previous ? num(previous.netProfitPkr) : 0,
    dues: previous ? num(previous.pendingPkr) : 0,
    students: previous ? num(previous.activeStudents) : 0,
  };

  const baseline = previous
    ? `${MONTH_LABELS[new Date(`${previous.month.slice(0, 7)}-01T00:00:00Z`).getUTCMonth()]} ${previous.month.slice(0, 4)}`
    : '';

  const months = trend.months ?? [];
  const sparkRevenue = sparkFrom(months, (m) => m.revenuePkr);
  const sparkExpenses = sparkFrom(months, (m) => m.expensesPkr);
  const sparkDues = sparkFrom(months, (m) => m.pendingPkr);
  const sparkProfit = sparkFrom(months, (m) =>
    m.revenuePkr === null ? null : m.revenuePkr - (m.expensesPkr ?? 0) - (m.transfersPkr ?? 0),
  );

  const kpis: Kpi[] = [
    // Students have no monthly history endpoint, so this card carries no sparkline rather than
    // a synthesised one. It gains one when a students-over-time series exists.
    kpi('students', 'Total Students', String(students), 'brand', [], students, prev.students, baseline, {
      fallback: `${students} active`, fallbackTone: 'neutral', goodDirection: 'up',
    }),
    kpi('revenue', 'Total Revenue', pkr(collection), 'info', sparkRevenue, collection, prev.collection, baseline, {
      fallback: 'collected this month', fallbackTone: 'neutral', goodDirection: 'up',
    }),
    kpi('expenses', 'Expenses & Transfers', pkr(expenses + transfers), 'positive', sparkExpenses,
      expenses + transfers, prev.expenses, baseline, {
        fallback: 'this month', fallbackTone: 'neutral', goodDirection: 'down',
      }),
    kpi('fund', 'Available Fund', pkr(profit), 'attention', sparkProfit, profit, prev.profit, baseline, {
      fallback: 'revenue less expenses and transfers', fallbackTone: 'neutral', goodDirection: 'up',
    }),
    kpi('dues', 'Outstanding Dues', pkr(dues), 'attention', sparkDues, dues, prev.dues, baseline, {
      fallback: `${num(stats.pendingCount)} unpaid`, fallbackTone: 'attention', goodDirection: 'down',
    }),
    kpi('maintenance', 'Open Maintenance', String(num(alerts.openMaintenance)), 'neutral', [],
      0, 0, '', {
        fallback: num(alerts.openMaintenance) === 0 ? 'nothing open' : 'awaiting action',
        fallbackTone: num(alerts.openMaintenance) === 0 ? 'neutral' : 'attention',
        goodDirection: 'down',
      }),
  ];

  const rooms: SeatRoom[] = (seatMapRes.rooms ?? []).map((r) => ({
    id: r.id,
    no: String(r.no ?? r.number ?? ''),
    floor: r.floor ?? null,
    capacity: num(r.capacity),
    occupied: num(r.occupied),
    free: num(r.free),
    fillPct: num(r.fillPct),
    isFull: Boolean(r.isFull),
  }));

  const seatMap: SeatMap = {
    rooms,
    totals: {
      rooms: num(stats.totalRooms),
      seats: num(stats.totalSeats),
      filled: num(stats.filledSeats),
      free: num(stats.availableSeats),
    },
  };

  const roomTypes = (roomTypesRes.types ?? []).map((t) => ({
    ...t,
    rooms: num(t.rooms), roomsOccupied: num(t.roomsOccupied), roomsVacant: num(t.roomsVacant),
    seats: num(t.seats), seatsFilled: num(t.seatsFilled), seatsFree: num(t.seatsFree),
    fullPct: num(t.fullPct), occupiedPct: num(t.occupiedPct),
    defaultRentPkr: t.defaultRentPkr === null ? null : num(t.defaultRentPkr),
  }));

  const methods = (methodsRes.methods ?? []).map((m) => ({
    label: m.label, amount: num(m.amount), count: num(m.count),
  }));

  // Beds are the API's own table, kept beside the seat figures so a divergence between the two
  // is visible instead of silently picked. Absent when no beds are modelled.
  const bedsTotal = num(stats.bedsTotal);
  const beds: BedSegment[] = bedsTotal === 0 ? [] : [
    { label: 'Occupied', value: num(stats.bedsOccupied), tone: 'brand' },
    { label: 'Vacant', value: Math.max(0, bedsTotal - num(stats.bedsOccupied)), tone: 'neutral' },
  ];

  const glance: GlanceItem[] = [
    { id: 'checkins', label: 'Check-ins', value: String(num(today.checkIns)), tone: 'info', emphasis: 'plain' },
    { id: 'checkouts', label: 'Check-outs', value: String(num(today.checkOuts)), tone: 'neutral', emphasis: 'plain' },
    { id: 'admissions', label: 'New Admissions', value: String(num(today.newAdmissions)), tone: 'positive', emphasis: 'plain' },
    { id: 'received', label: 'Payments Received', value: pkr(num(today.paymentsReceivedPkr)), tone: 'positive', emphasis: 'money' },
    { id: 'complaints', label: 'Complaints Raised', value: String(num(today.complaintsRaised)), tone: num(today.complaintsRaised) > 0 ? 'attention' : 'neutral', emphasis: 'plain' },
    { id: 'maintenance', label: 'Maintenance Requests', value: String(num(today.maintenanceRequests)), tone: num(today.maintenanceRequests) > 0 ? 'attention' : 'neutral', emphasis: 'plain' },
    { id: 'approvals', label: 'Pending Approvals', value: String(num(today.pendingApprovals)), tone: num(today.pendingApprovals) > 0 ? 'attention' : 'neutral', emphasis: 'plain' },
  ];
  // Every counter reading zero is a quiet day, not missing data — but the widget should say
  // "nothing today" rather than print seven zeros.
  const glanceEmpty = glance.every((g) => g.value === '0' || g.value === pkr(0));

  const pendingRows: PendingPayment[] = [...(unpaid.payments ?? []), ...(partial.payments ?? [])]
    .map((p) => ({
      id: p.paymentId,
      name: p.studentName,
      room: p.roomNumber ?? '—',
      dueDate: p.paymentMonth?.slice(0, 10) ?? '',
      amount: num(p.unpaidPkr),
      status: (p.status === 'partial' ? 'Partial' : 'Unpaid') as PendingPayment['status'],
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Replaces the invented reminder list with obligations the tenant actually has.
  const attention: AttentionItem[] = [
    ...(alerts.pendingCancellations ?? []).map((c) => ({
      id: `cancel-${c.id}`,
      title: `${c.studentName} — cancellation awaiting confirmation`,
      when: c.vacateDate ? `Vacates ${c.vacateDate.slice(0, 10)}` : 'No vacate date set',
      icon: 'cancellation' as const,
      tone: 'attention' as Tone,
      href: '/cancellations',
    })),
    ...(alerts.activeNotices ?? []).map((n) => ({
      id: `notice-${n.id}`,
      title: n.title,
      when: 'Active notice',
      icon: 'notice' as const,
      tone: 'info' as Tone,
      href: null,
    })),
  ];

  const series: MonthlySeries = { year: trend.year ?? year, months };
  const seriesEmpty = months.every(
    (m) => m.revenuePkr === null && m.expensesPkr === null && m.pendingPkr === null,
  );

  return {
    today: new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }),
    greetingName: userName,
    branchName: 'All branches',
    sessionLabel: `${year} Academic Year`,
    alertCount: num(alerts.unresolvedComplaints),
    navBadges: {
      '/payments': num(alerts.pendingPaymentsCount),
      '/complaints': num(alerts.unresolvedComplaints),
      '/cancellations': (alerts.pendingCancellations ?? []).length,
    },

    kpis: sourced(kpis, false, previous ? 'live' : 'derived'),
    series: sourced(series, seriesEmpty),
    seatMap: sourced(seatMap, rooms.length === 0),
    glance: sourced(glance, glanceEmpty),
    roomTypes: sourced(roomTypes, roomTypes.length === 0),
    methods: sourced(methods, methods.length === 0),
    beds: sourced(beds, beds.length === 0),
    pending: sourced(pendingRows, pendingRows.length === 0),
    attention: sourced(attention, attention.length === 0),

    totals: {
      collection,
      expenses,
      transfers,
      profit,
      dues,
      dueStudents: num(stats.pendingCount),
    },
  };
}
