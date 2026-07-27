import { api, ApiError } from '@/lib/api';
import { redirect } from 'next/navigation';
import { formatPkr } from '@/lib/format';
import { Notice, PageHeading, Pagination, TableFrame, Td, Th } from '@/components/ui';

export const metadata = { title: 'Students · Hostyllo' };

/** Field names are the API's, verbatim — see GET /students in the API spec (Module 2). */
type Student = {
  student_id: string;
  full_name: string;
  phone: string | null;
  status: string;
  room_number: string | null;
  bed_label: string | null;
  rent_pkr: number | string;
  unpaid_pkr: number | string;
  join_date: string | null;
};

type StudentList = { students: Student[]; total: number };

const PAGE_SIZE = 25;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; offset?: string }>;
}) {
  const { q, offset: rawOffset } = await searchParams;
  const offset = Math.max(0, Number(rawOffset ?? 0) || 0);

  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (q) params.set('q', q);

  let list: StudentList;
  try {
    list = await api<StudentList>(`/students?${params.toString()}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 403) {
      // A viewer or chain manager hitting a guard they do not pass. Say so plainly rather than
      // showing an empty table, which would read as "this hostel has no students".
      return <Notice tone="amber">Your role does not have access to the student list.</Notice>;
    }
    return <Notice tone="red">{error instanceof ApiError ? error.message : 'Could not load students.'}</Notice>;
  }

  const shown = list.students.length;

  return (
    <>
      <PageHeading title="Students" meta={`${list.total} active`} />

      {/* A plain GET form: search survives a page refresh, works without JavaScript, and keeps the
          query in the URL so a warden can bookmark or share it. */}
      <form method="GET" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search name or phone"
          aria-label="Search students by name or phone"
          style={{
            flex: 1,
            padding: 'var(--space-3)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text)',
            fontSize: 16,
            minHeight: 44,
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0 var(--space-4)',
            background: 'var(--gold)',
            color: '#0b0e14',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          Search
        </button>
      </form>

      {shown === 0 ? (
        <Notice tone="muted">
          {q ? `No students match “${q}”.` : 'No students yet.'}
        </Notice>
      ) : (
        <TableFrame>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
                <Th>Name</Th>
                <Th>Room</Th>
                <Th>Phone</Th>
                <Th align="right">Rent</Th>
                <Th align="right">Unpaid</Th>
              </tr>
            </thead>
            <tbody>
              {list.students.map((s) => {
                const unpaid = Number(s.unpaid_pkr ?? 0);
                return (
                  <tr key={s.student_id} style={{ borderTop: '1px solid var(--border)' }}>
                    <Td>{s.full_name}</Td>
                    <Td>{s.room_number ? `${s.room_number}${s.bed_label ? ` · ${s.bed_label}` : ''}` : '—'}</Td>
                    <Td>{s.phone ?? '—'}</Td>
                    <Td align="right">{formatPkr(s.rent_pkr)}</Td>
                    <Td align="right">
                      <span style={{ color: unpaid > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                        {formatPkr(unpaid)}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
        </TableFrame>
      )}

            <Pagination
        basePath="/students"
        params={{ q }}
        offset={offset}
        shown={shown}
        total={list.total}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}
