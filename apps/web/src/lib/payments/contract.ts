/**
 * The Payments ledger — what the screen is allowed to render.
 *
 * Same rule as the roster: the page reads this and nothing else, and every
 * derived figure is computed once in `presenter.ts`. On a ledger the figure that
 * disagrees is somebody's money, and it is the figure a hostel owner reconciles
 * against a cash box.
 *
 * Field names here are the screen's. `GET /payments` speaks its own dialect
 * (`amountPaidPkr`, `derivedStatus`); the mapping happens in the presenter so a
 * change to either side is one file's problem.
 */

/** The four values `payments.status` may hold — migration 003's CHECK, verbatim. */
export type StatusKey = 'paid' | 'partial' | 'pending' | 'void';

/**
 * What the screen shows in the Status column.
 *
 * `overdue` is not in that CHECK and never will be from this direction: the API
 * derives it (still owes money, billed month behind the current one, in the
 * hostel's timezone). The row keeps its stored status alongside — see
 * `LedgerRow.status` — because the two answer different questions and the ledger
 * should not be the place they get conflated.
 */
export type DerivedKey = StatusKey | 'overdue';

/**
 * The tabs.
 *
 * The design draws five — All, Paid, Partial, Pending, Overdue — and has no Void
 * tab because its sample ledger contains no voided rows. Real ones do: a void is
 * kept forever for the audit trail (INVARIANT-5's neighbourhood), so without a
 * sixth tab the one cohort an owner goes looking for during a dispute is the one
 * cohort with no way to reach it. Added deliberately, not by accident.
 */
export type TabKey = 'all' | 'paid' | 'partial' | 'pending' | 'overdue' | 'void';

/** Columns the API will sort on. Mirrors its `sort` enum. */
export type SortKey =
  | 'student'
  | 'room'
  | 'month'
  | 'rent'
  | 'conc'
  | 'extra'
  | 'paid'
  | 'unpaid'
  | 'method'
  | 'status';

export type SortDir = 'asc' | 'desc';

/** How a KPI's movement should be read. Up is not good on a dues figure. */
export type DeltaTone = 'positive' | 'negative' | 'neutral';

export type LedgerRow = {
  id: string;
  studentId: string;
  studentName: string;
  /** Up to two letters, for the avatar tile. */
  initials: string;
  /** `#101`, or null for a payment with no room on it. */
  room: string | null;
  /** `2-Seater`, from the room's capacity. Null when the room is unknown. */
  roomMeta: string | null;
  /** `Jul 2026` — the billed month, formatted from the API's text `monthKey`. */
  monthLabel: string;
  /** rent + mess. The headline figure in the Rent / Mo column. */
  rentTotal: number;
  /** rent alone — the first half of the `8,000 + 1,500 mess` breakdown. */
  rentOnly: number;
  /**
   * null means no mess line on this payment; 0 means a mess line billed at zero
   * ("included, zero-rated", migration 014). The column renders them
   * differently, which is the whole reason the API keeps them apart.
   */
  messFee: number | null;
  concession: number;
  /** Extra charges *excluding* mess — mess is already inside rentTotal. */
  extraCharges: number;
  /** `Laundry, Bedding`, or null when there are no non-mess extras. */
  extraLabel: string | null;
  paid: number;
  unpaid: number;
  /** `JazzCash`, or null when no method was recorded. */
  method: string | null;
  /** The stored column. Kept for the void treatment and for honesty. */
  status: StatusKey;
  /** What the Status pill says: the stored value, or `overdue`. */
  derived: DerivedKey;
  derivedLabel: string;
  /** A voided row stays in the ledger, dimmed — it must not read as live money. */
  voided: boolean;
  receiptId: string | null;
};

export type LedgerTab = {
  key: TabKey;
  label: string;
  count: number;
  current: boolean;
  href: string;
};

export type Kpi = {
  id: string;
  label: string;
  /** Pre-formatted digits. The `PKR` prefix is the component's business (§4.3). */
  value: string;
  currency: boolean;
  /**
   * `▲ 12.4% vs Jun 2026`, or the fallback when there is no baseline to compare.
   *
   * The arrow is inside the string, because `formatDelta` puts it there — §4.3's
   * "arrow + colour + baseline, or nothing" is one sentence and one helper owns
   * all three parts of it. The card therefore draws no icon of its own; the
   * dashboard's cards do, because they use a second, local delta implementation
   * that omits the glyph. Those two should converge on `formatDelta`.
   */
  note: string;
  noteTone: DeltaTone;
};

export type TopDueRow = {
  studentId: string;
  studentName: string;
  room: string | null;
  unpaid: number;
};

export type LedgerView = {
  rows: LedgerRow[];
  tabs: LedgerTab[];
  kpis: Kpi[];
  topDue: TopDueRow[];
  /** `10 of 34 payments` — the toolbar's own sentence, built where the numbers are. */
  resultLabel: string;
  /** `2026-07`, always set: every figure on this screen is scoped to one month. */
  month: string;
  /** `July 2026`, for the month field's label and the empty state's copy. */
  monthLabel: string;
  total: number;
  offset: number;
  pageSize: number;
  sort: SortKey;
  dir: SortDir;
  q: string;
  tab: TabKey;
  /** True when a tab or a search is narrowing the month — drives the empty state. */
  narrowed: boolean;
};

export const STATUS_LABEL: Record<DerivedKey, string> = {
  paid: 'Paid',
  partial: 'Partial',
  pending: 'Pending',
  overdue: 'Overdue',
  void: 'Void',
};

export const TAB_ORDER: TabKey[] = ['all', 'paid', 'partial', 'pending', 'overdue', 'void'];

export const TAB_LABEL: Record<TabKey, string> = {
  all: 'All',
  ...STATUS_LABEL,
};

/** Column names as the toolbar states them and the table's caption reads them. */
export const SORT_LABEL: Record<SortKey, string> = {
  student: 'Student',
  room: 'Room',
  month: 'Month',
  rent: 'Rent',
  conc: 'Concession',
  extra: 'Extra',
  paid: 'Paid',
  unpaid: 'Unpaid',
  method: 'Method',
  status: 'Status',
};

/**
 * `payment_method` → the operator's word for it.
 *
 * The column is a CHECK of five lowercase values; these are how Pakistani
 * operators write the two wallet brands, which is what a warden scanning the
 * column expects to see. Anything unrecognised is passed through rather than
 * mapped to "Other" — a value the schema does not permit is a fact worth seeing,
 * not one worth hiding.
 */
export const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank: 'Bank',
  other: 'Other',
};
