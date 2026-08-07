import 'server-only';

import { api } from '@/lib/api';
import { formatAmount, formatDelta } from '@/lib/format';
import { initials, num } from '@/lib/students/derive';
import {
  METHOD_LABEL,
  STATUS_LABEL,
  TAB_LABEL,
  TAB_ORDER,
  type DeltaTone,
  type DerivedKey,
  type Kpi,
  type LedgerRow,
  type LedgerTab,
  type LedgerView,
  type SortDir,
  type SortKey,
  type StatusKey,
  type TabKey,
  type TopDueRow,
} from './contract';

/**
 * Builds the Payments ledger from `GET /payments`.
 *
 * One request owns the rows, the tab counts and the KPI strip, for the reason the
 * roster does: counts fetched separately disagree with the table the moment a
 * payment is recorded between the two requests, and on this screen the two
 * numbers in question are "how many are overdue" and "which ones".
 *
 * The one extra call is the defaulters worklist for the rail, which is a
 * different question (who owes most across the month, not what is on this page)
 * and therefore genuinely a different query. It is allowed to fail on its own:
 * the rail disappearing is better than the ledger 500ing because a side panel
 * could not load.
 */

const PAGE_SIZE = 25;

/** The API's row shape, verbatim. Renamed on the way out, never on the way in. */
type ApiPayment = {
  paymentId: string;
  studentId: string;
  studentName: string;
  roomNumber: string | null;
  roomCapacity: number | null;
  monthKey: string;
  rentPkr: number | string;
  messPkr: number | string | null;
  rentTotalPkr: number | string;
  concessionPkr: number | string;
  extraChargesPkr: number | string;
  extraChargesLabel: string | null;
  amountPaidPkr: number | string;
  unpaidPkr: number | string;
  status: string;
  derivedStatus: string;
  paymentMethod: string | null;
  receiptId: string | null;
};

type ApiSummary = {
  month: string;
  collectedPkr: number | string;
  outstandingPkr: number | string;
  pendingPkr: number | string;
  transactions: number;
  daysElapsed: number;
  avgPerDayPkr: number | string;
  previous: {
    month: string;
    collectedPkr: number | string;
    outstandingPkr: number | string;
    pendingPkr: number | string;
    transactions: number;
    avgPerDayPkr: number | string;
  };
};

type ApiList = {
  payments: ApiPayment[];
  total: number;
  counts: Record<string, number>;
  summary: ApiSummary | null;
  limit: number;
  offset: number;
};

type ApiDefaulters = {
  defaulters: {
    studentId: string;
    studentName: string;
    roomNumber: string | null;
    unpaidPkr: number | string;
  }[];
};

export type LedgerQuery = {
  month?: string;
  q?: string;
  tab?: string;
  sort?: string;
  dir?: string;
  offset?: string;
};

const SORT_KEYS: SortKey[] = [
  'student', 'room', 'month', 'rent', 'conc', 'extra', 'paid', 'unpaid', 'method', 'status',
];

/** How many defaulters the rail shows. Four, as the design draws it. */
const TOP_DUE = 4;

export async function getLedgerView(query: LedgerQuery): Promise<LedgerView> {
  const month = isMonth(query.month) ? query.month : currentMonth();
  const tab = isTab(query.tab) ? query.tab : 'all';
  const sort = isSort(query.sort) ? query.sort : 'room';
  const dir: SortDir = query.dir === 'desc' ? 'desc' : 'asc';
  const q = query.q?.trim() ?? '';
  const offset = Math.max(0, Number(query.offset ?? 0) || 0);

  const params = new URLSearchParams({
    month,
    tab,
    sort,
    dir,
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  if (q) params.set('q', q);

  const [list, defaulters] = await Promise.all([
    api<ApiList>(`/payments?${params.toString()}`),
    api<ApiDefaulters>(`/payments/defaulters?month=${month}`).catch(() => null),
  ]);

  const rows = list.payments.map(toRow);

  return {
    rows,
    tabs: buildTabs(list.counts, { month, tab, q, sort, dir }),
    kpis: buildKpis(list.summary),
    topDue: (defaulters?.defaulters ?? []).slice(0, TOP_DUE).map(toTopDue),
    resultLabel: resultLabel(rows.length, list.total, list.counts?.all ?? list.total),
    month,
    monthLabel: monthName(month),
    total: list.total,
    offset,
    pageSize: PAGE_SIZE,
    sort,
    dir,
    q,
    tab,
    narrowed: q !== '' || tab !== 'all',
  };
}

function toRow(p: ApiPayment): LedgerRow {
  const status = isStoredStatus(p.status) ? p.status : 'pending';
  const derived = isDerived(p.derivedStatus) ? p.derivedStatus : status;
  const rentOnly = num(p.rentPkr) ?? 0;
  // Absent and zero are different facts about mess, so this coerces to null
  // rather than to 0 — the Rent / Mo column renders each differently.
  const messFee = num(p.messPkr);

  return {
    id: p.paymentId,
    studentId: p.studentId,
    studentName: p.studentName,
    initials: initials(p.studentName),
    room: p.roomNumber ? `#${p.roomNumber}` : null,
    roomMeta: p.roomCapacity && p.roomCapacity > 0 ? `${p.roomCapacity}-Seater` : null,
    monthLabel: monthShort(p.monthKey),
    rentOnly,
    messFee,
    rentTotal: num(p.rentTotalPkr) ?? rentOnly + (messFee ?? 0),
    concession: num(p.concessionPkr) ?? 0,
    extraCharges: num(p.extraChargesPkr) ?? 0,
    extraLabel: p.extraChargesLabel?.trim() || null,
    paid: num(p.amountPaidPkr) ?? 0,
    unpaid: num(p.unpaidPkr) ?? 0,
    method: p.paymentMethod ? (METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod) : null,
    status,
    derived,
    derivedLabel: STATUS_LABEL[derived],
    voided: status === 'void',
    receiptId: p.receiptId?.trim() || null,
  };
}

function toTopDue(d: ApiDefaulters['defaulters'][number]): TopDueRow {
  return {
    studentId: d.studentId,
    studentName: d.studentName,
    room: d.roomNumber ? `#${d.roomNumber}` : null,
    unpaid: num(d.unpaidPkr) ?? 0,
  };
}

/**
 * The KPI strip.
 *
 * Five figures, each with a delta against the month before — read from the
 * database, not modelled from this month. The design derives its own baselines by
 * multiplying the current figure by a hardcoded factor per month, which produces
 * a delta that is arithmetic performed on itself; `formatDelta` returns null when
 * there is genuinely nothing to compare, and the card then carries a plain
 * description instead of a fabricated percentage.
 *
 * ── No sparklines ────────────────────────────────────────────────────────────
 * The design's cards each carry one, generated by `Math.sin(i * .8 + seed)`. A
 * sine wave is not this hostel's collection history, and there is no per-metric
 * monthly series behind these five figures to draw a real one from. The
 * dashboard's KPI cards do carry sparklines because `/dashboard/trend` returns
 * the actual months. Here the delta says the same thing in words, truthfully.
 */
function buildKpis(summary: ApiSummary | null): Kpi[] {
  if (!summary) return [];

  const baseline = monthShort(summary.previous.month);
  const days = summary.daysElapsed;

  return [
    kpi('collected', 'Total Collected', summary.collectedPkr, summary.previous.collectedPkr, baseline, {
      currency: true,
      good: 'up',
      fallback: 'collected this month',
    }),
    kpi('outstanding', 'Outstanding Dues', summary.outstandingPkr, summary.previous.outstandingPkr, baseline, {
      currency: true,
      // Dues climbing is not an achievement, so the arrow that means "more" is
      // the arrow that means "worse" on this card and only on this card.
      good: 'down',
      fallback: 'across partial and overdue rows',
    }),
    kpi('pending', 'Awaiting Payment', summary.pendingPkr, summary.previous.pendingPkr, baseline, {
      currency: true,
      good: 'down',
      fallback: 'billed this month, unpaid',
    }),
    kpi('transactions', 'Transactions', summary.transactions, summary.previous.transactions, baseline, {
      currency: false,
      // More rows is neither good nor bad — it tracks how many students were
      // billed, which is a fact about the size of the hostel.
      good: 'neither',
      fallback: 'rows, excluding voided',
    }),
    kpi('average', 'Average / Day', summary.avgPerDayPkr, summary.previous.avgPerDayPkr, baseline, {
      currency: true,
      good: 'up',
      fallback: `collected per day across ${days} day${days === 1 ? '' : 's'}`,
    }),
  ];
}

function kpi(
  id: string,
  label: string,
  current: number | string,
  previous: number | string,
  baseline: string,
  opts: { currency: boolean; good: 'up' | 'down' | 'neither'; fallback: string },
): Kpi {
  const delta = formatDelta(current, previous, baseline);

  if (!delta) {
    return {
      id,
      label,
      value: formatAmount(current),
      currency: opts.currency,
      note: opts.fallback,
      noteTone: 'neutral',
    };
  }

  const tone: DeltaTone =
    opts.good === 'neither' || delta.direction === 'flat'
      ? 'neutral'
      : (delta.direction === 'up') === (opts.good === 'up')
        ? 'positive'
        : 'negative';

  return {
    id,
    label,
    value: formatAmount(current),
    currency: opts.currency,
    note: delta.label,
    noteTone: tone,
  };
}

function buildTabs(
  counts: Record<string, number> | undefined,
  current: { month: string; tab: TabKey; q: string; sort: SortKey; dir: SortDir },
): LedgerTab[] {
  return TAB_ORDER.map((key) => {
    const params = new URLSearchParams({ month: current.month });
    if (key !== 'all') params.set('tab', key);
    if (current.q) params.set('q', current.q);
    if (current.sort !== 'room') params.set('sort', current.sort);
    if (current.dir !== 'asc') params.set('dir', current.dir);

    return {
      key,
      label: TAB_LABEL[key],
      count: counts?.[key] ?? 0,
      current: key === current.tab,
      // Back to page 1 on every tab switch: offset 50 inside a tab holding three
      // rows is an empty page, and an empty page after a click reads as "there
      // are none" rather than "you are past the end".
      href: `/payments?${params.toString()}`,
    };
  });
}

/**
 * `10 of 34 payments`, plus the month's own total when a tab or a search is
 * narrowing it — without the second figure a filtered count reads as the size of
 * the month, which is exactly the number an owner is trying to reconcile.
 */
function resultLabel(shown: number, matched: number, everyone: number): string {
  const base = `${shown} of ${matched} payment${matched === 1 ? '' : 's'}`;
  return matched === everyone ? base : `${base} · ${everyone} this month`;
}

/**
 * The current month in Asia/Karachi, not the container's UTC clock.
 *
 * On Railway (UTC) the first five hours of the 1st are still the previous day
 * locally, so a UTC `toISOString().slice(0, 7)` would open the ledger on last
 * month for anyone working late on the 1st — the one morning the month's billing
 * has just run and the screen is being watched.
 */
function currentMonth(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date()).slice(0, 7);
}

/** `2026-07` → `July 2026`. */
function monthName(month: string): string {
  return formatMonth(month, 'long');
}

/** `2026-07` → `Jul 2026`, for cells and delta baselines. */
function monthShort(month: string): string {
  return formatMonth(month, 'short');
}

function formatMonth(month: string, style: 'long' | 'short'): string {
  const d = new Date(`${month.slice(0, 7)}-01T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return month;
  // UTC on both ends: the string is parsed as UTC midnight and formatted in UTC,
  // so the 1st cannot slip back into the previous month on a machine east of it.
  return new Intl.DateTimeFormat('en-GB', { month: style, year: 'numeric', timeZone: 'UTC' }).format(d);
}

function isMonth(value: string | undefined): value is string {
  return value !== undefined && /^\d{4}-\d{2}$/.test(value);
}

function isTab(value: string | undefined): value is TabKey {
  return value !== undefined && (TAB_ORDER as string[]).includes(value);
}

function isSort(value: string | undefined): value is SortKey {
  return value !== undefined && (SORT_KEYS as string[]).includes(value);
}

function isStoredStatus(value: string): value is StatusKey {
  return value === 'paid' || value === 'partial' || value === 'pending' || value === 'void';
}

function isDerived(value: string): value is DerivedKey {
  return value === 'overdue' || isStoredStatus(value);
}
