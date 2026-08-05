/**
 * The Students roster — what the screen is allowed to render.
 *
 * The page reads this and nothing else. Every derived value (initials, the room
 * meta line, the rent + mess arithmetic, which tab is current) is computed once
 * in `presenter.ts`, for the same reason the dashboard does it: two places
 * deriving the same figure is two places to disagree, and on a roster the figure
 * that disagrees is somebody's rent.
 *
 * Field names here are the screen's, not the API's. `GET /students` speaks
 * snake_case (`rent_pkr`, `mess_fee_pkr`); the mapping happens in the presenter
 * so a change to either side is one file's problem.
 */

/** The four values `students.status` may hold — migration 014's CHECK, verbatim. */
export type StatusKey = 'active' | 'vacating' | 'vacated' | 'blacklisted';

/** The roster's tabs. `all` is a tab, not a status: it drops the filter. */
export type TabKey = StatusKey | 'all';

/** Columns the API will sort on. Mirrors its `sort` enum exactly. */
export type SortKey = 'name' | 'room' | 'rent' | 'status' | 'join_date';

export type SortDir = 'asc' | 'desc';

export type RosterRow = {
  id: string;
  name: string;
  fatherName: string | null;
  /** Up to two letters, for the avatar tile. */
  initials: string;
  /** `#12`, or null for a student with no room assigned yet. */
  room: string | null;
  /** `4-Seater · Ground`, assembled from capacity and floor. Null when neither is known. */
  roomMeta: string | null;
  bed: string | null;
  phone: string | null;
  emergency: string | null;
  /**
   * The masked CNIC, or null when none is on record. Null is a real distinction
   * the roster acts on — see the API's own note on the column.
   */
  cnic: string | null;
  nationality: string | null;
  address: string | null;
  course: string | null;
  /** monthly_fee + mess_fee. The headline figure in the Rent + Mess column. */
  rentTotal: number;
  /** monthly_fee alone. Only shown when mess is included, as the breakdown's first half. */
  rentOnly: number;
  /**
   * null means mess is not included — distinct from 0, which means included and
   * zero-rated (migration 014). The column renders those two differently.
   */
  messFee: number | null;
  status: StatusKey;
  /** The operator's word for `status`. See STATUS_LABEL. */
  statusLabel: string;
  outstanding: number;
};

export type RosterTab = {
  key: TabKey;
  label: string;
  count: number;
  current: boolean;
  href: string;
};

export type RosterView = {
  rows: RosterRow[];
  tabs: RosterTab[];
  /** `12 of 47 students` — the toolbar's own sentence, built where the numbers are. */
  resultLabel: string;
  total: number;
  offset: number;
  pageSize: number;
  sort: SortKey;
  dir: SortDir;
  q: string;
  tab: TabKey;
  /** True when a filter or a search is narrowing the list — drives the empty state. */
  narrowed: boolean;
};

/**
 * Status → the word an operator uses.
 *
 * `vacating` prints as "Cancelling" because that is what the state is: a student
 * with a pending cancellation, sitting in the Cancellations screen awaiting
 * confirmation. It is also the word the desktop app and every warden already
 * use. `vacated` prints as "Left" for the same reason. The schema keeps its own
 * vocabulary; this is the one place the two are joined.
 */
export const STATUS_LABEL: Record<StatusKey, string> = {
  active: 'Active',
  vacating: 'Cancelling',
  vacated: 'Left',
  blacklisted: 'Blacklisted',
};

/**
 * Tab order. `vacating` gets a tab of its own, which is the point of migration
 * 014's note: in the desktop app a cancelling student appears under no filter at
 * all, so the one cohort a manager must act on this week is the one cohort that
 * is hardest to find.
 */
export const TAB_ORDER: TabKey[] = ['all', 'active', 'vacating', 'vacated', 'blacklisted'];

export const TAB_LABEL: Record<TabKey, string> = {
  all: 'All',
  ...STATUS_LABEL,
};

/** Column names as the toolbar states them and the table's caption reads them. */
export const SORT_LABEL: Record<SortKey, string> = {
  name: 'Name',
  room: 'Room',
  rent: 'Rent',
  status: 'Status',
  join_date: 'Joined',
};
