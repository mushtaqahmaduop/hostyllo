import 'server-only';

import { api } from '@/lib/api';
import { blankToNull, initials, isStatus, num, roomMeta } from './derive';
import {
  STATUS_LABEL,
  TAB_LABEL,
  TAB_ORDER,
  type RosterRow,
  type RosterTab,
  type RosterView,
  type SortDir,
  type SortKey,
  type TabKey,
} from './contract';

/**
 * Builds the Students roster from `GET /students`.
 *
 * One request, one owner of every figure on the screen. The tab counts come back
 * from the same call as the rows (the API computes them over the search and room
 * filters but *before* the status filter), so the tabs and the table can never
 * disagree about how many students are in scope — which five separate count
 * requests would guarantee the moment a student is admitted between them.
 */

const PAGE_SIZE = 25;

/** The API's row shape, verbatim. Renamed on the way out, never on the way in. */
type ApiStudent = {
  student_id: string;
  full_name: string;
  father_name: string | null;
  phone: string | null;
  emergency_contact: string | null;
  address: string | null;
  status: string;
  room_number: string | null;
  room_floor: string | null;
  room_capacity: number | null;
  bed_label: string | null;
  rent_pkr: number | string;
  mess_fee_pkr: number | string | null;
  nationality: string | null;
  course: string | null;
  join_date: string | null;
  unpaid_pkr: number | string;
  masked_cnic: string | null;
};

type ApiList = {
  students: ApiStudent[];
  total: number;
  counts: Record<TabKey, number>;
  limit: number;
  offset: number;
};

export type RosterQuery = {
  q?: string;
  tab?: string;
  sort?: string;
  dir?: string;
  offset?: string;
};

const SORT_KEYS: SortKey[] = ['name', 'room', 'rent', 'status', 'join_date'];

export async function getRosterView(query: RosterQuery): Promise<RosterView> {
  const tab = isTab(query.tab) ? query.tab : 'active';
  const sort = isSort(query.sort) ? query.sort : 'room';
  const dir: SortDir = query.dir === 'desc' ? 'desc' : 'asc';
  const q = query.q?.trim() ?? '';
  const offset = Math.max(0, Number(query.offset ?? 0) || 0);

  const params = new URLSearchParams({
    status: tab,
    sort,
    dir,
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  if (q) params.set('q', q);

  const list = await api<ApiList>(`/students?${params.toString()}`);

  const rows = list.students.map(toRow);
  const tabs = buildTabs(list.counts, { tab, q, sort, dir });

  return {
    rows,
    tabs,
    resultLabel: resultLabel(rows.length, list.total, list.counts?.all ?? list.total),
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

function toRow(s: ApiStudent): RosterRow {
  const rentOnly = num(s.rent_pkr) ?? 0;
  // Absent and zero are different facts about mess (migration 014), so this
  // coerces to null rather than to 0 — the column renders each differently.
  const messFee = num(s.mess_fee_pkr);
  const status = isStatus(s.status) ? s.status : 'active';

  return {
    id: s.student_id,
    name: s.full_name,
    fatherName: blankToNull(s.father_name),
    initials: initials(s.full_name),
    room: s.room_number ? `#${s.room_number}` : null,
    roomMeta: roomMeta(s.room_capacity, s.room_floor),
    bed: blankToNull(s.bed_label),
    phone: blankToNull(s.phone),
    emergency: blankToNull(s.emergency_contact),
    cnic: blankToNull(s.masked_cnic),
    nationality: blankToNull(s.nationality),
    address: blankToNull(s.address),
    course: blankToNull(s.course),
    rentOnly,
    messFee,
    rentTotal: rentOnly + (messFee ?? 0),
    status,
    statusLabel: STATUS_LABEL[status],
    outstanding: num(s.unpaid_pkr) ?? 0,
  };
}

function buildTabs(
  counts: Record<TabKey, number> | undefined,
  current: { tab: TabKey; q: string; sort: SortKey; dir: SortDir },
): RosterTab[] {
  return TAB_ORDER.map((key) => {
    const params = new URLSearchParams();
    if (key !== 'active') params.set('tab', key);
    if (current.q) params.set('q', current.q);
    if (current.sort !== 'room') params.set('sort', current.sort);
    if (current.dir !== 'asc') params.set('dir', current.dir);
    const search = params.toString();

    return {
      key,
      label: TAB_LABEL[key],
      count: counts?.[key] ?? 0,
      current: key === current.tab,
      // Switching tab returns to page 1 deliberately: offset 47 in a list of 6
      // blacklisted students is an empty page, and an empty page after a click
      // reads as "there are none" rather than "you are past the end".
      href: search ? `/students?${search}` : '/students',
    };
  });
}

/**
 * `12 of 47 students`, or `12 of 47 students · 138 in this hostel` when a filter
 * is narrowing the list — the second figure is what stops a manager reading a
 * filtered count as the size of their hostel.
 */
function resultLabel(shown: number, matched: number, everyone: number): string {
  const base = `${shown} of ${matched} student${matched === 1 ? '' : 's'}`;
  return matched === everyone ? base : `${base} · ${everyone} in this hostel`;
}

function isTab(value: string | undefined): value is TabKey {
  return value !== undefined && (TAB_ORDER as string[]).includes(value);
}

function isSort(value: string | undefined): value is SortKey {
  return value !== undefined && (SORT_KEYS as string[]).includes(value);
}

