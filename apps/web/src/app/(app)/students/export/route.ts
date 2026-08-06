import { NextResponse, type NextRequest } from 'next/server';

import { api, ApiError } from '@/lib/api';

/**
 * `GET /students/export` — the roster as CSV, honouring the current filters.
 *
 * Pages the API rather than asking for everything at once: `GET /students`
 * clamps `limit` to 100, so a single request would silently return the first
 * hundred students and call it the hostel. A truncated export is worse than no
 * export — nobody notices a missing tail until they reconcile against it.
 *
 * Runs on the server with the session cookie, so the file never travels through
 * client JavaScript and no token is exposed to build it.
 */

const PAGE = 100;

/** Refuses to run away if `total` is wrong or the list is genuinely enormous. */
const MAX_ROWS = 20_000;

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
  bed_label: string | null;
  rent_pkr: number | string;
  mess_fee_pkr: number | string | null;
  nationality: string | null;
  course: string | null;
  join_date: string | null;
  unpaid_pkr: number | string;
  masked_cnic: string | null;
};

const COLUMNS = [
  'Name',
  "Father's name",
  'Room',
  'Floor',
  'Bed',
  'Phone',
  'Emergency contact',
  'CNIC on record',
  'Nationality',
  'Address',
  'Course',
  'Rent (PKR)',
  'Mess (PKR)',
  'Total per month (PKR)',
  'Outstanding (PKR)',
  'Status',
  'Joined',
];

export async function GET(request: NextRequest) {
  const incoming = request.nextUrl.searchParams;

  const params = new URLSearchParams({
    status: incoming.get('tab') ?? 'active',
    sort: incoming.get('sort') ?? 'room',
    dir: incoming.get('dir') === 'desc' ? 'desc' : 'asc',
    limit: String(PAGE),
  });
  const q = incoming.get('q')?.trim();
  if (q) params.set('q', q);

  const rows: ApiStudent[] = [];
  try {
    for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
      params.set('offset', String(offset));
      const page = await api<{ students: ApiStudent[]; total: number }>(
        `/students?${params.toString()}`,
      );
      rows.push(...page.students);
      if (rows.length >= page.total || page.students.length < PAGE) break;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (error instanceof ApiError && error.status === 403) {
      return new NextResponse('Your role cannot export the student list.', { status: 403 });
    }
    return new NextResponse('Could not build the export. Try again.', { status: 502 });
  }

  const body = [
    COLUMNS.map(csvCell).join(','),
    ...rows.map((s) =>
      [
        s.full_name,
        s.father_name,
        s.room_number,
        s.room_floor,
        s.bed_label,
        s.phone,
        s.emergency_contact,
        // The masked value itself carries no information, so the column answers
        // the question a roster export is actually used to answer: whose
        // documents are still missing.
        s.masked_cnic ? 'Yes' : 'No',
        s.nationality,
        s.address,
        s.course,
        s.rent_pkr,
        // Empty, not 0 — mess absent and mess zero-rated are different facts,
        // and a spreadsheet that sums the column must not count the first.
        s.mess_fee_pkr ?? '',
        Number(s.rent_pkr ?? 0) + Number(s.mess_fee_pkr ?? 0),
        s.unpaid_pkr,
        s.status,
        s.join_date,
      ]
        .map(csvCell)
        .join(','),
    ),
  ].join('\r\n');

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(`﻿${body}`, {
    headers: {
      // The BOM above makes Excel read it as UTF-8; without it Pakistani names
      // with non-ASCII characters arrive mangled on the machine most likely to
      // open this file.
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="students-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * One CSV cell: quoted, internal quotes doubled, and neutralised against
 * spreadsheet formula injection.
 *
 * A student whose name or address begins `=`, `+`, `-` or `@` becomes an
 * executable formula the moment the file is opened in Excel or Sheets. The API
 * strips these on import for the same reason; an export that reintroduced them
 * would just move the hole to the other end of the round trip. The leading
 * apostrophe is the standard neutraliser and is invisible in the cell.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
