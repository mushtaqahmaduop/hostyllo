import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { redirect } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { formatPkr } from '@/lib/format';
import { canOperate } from '@/lib/session';
import {
  ActionLink,
  Notice,
  PageHeading,
  Pagination,
  RowLink,
  SearchForm,
  TableFrame,
  Td,
  Th,
  Tr,
} from '@/components/ui';

export const metadata = { title: 'Students' };

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
  searchParams: Promise<{ q?: string; offset?: string; added?: string }>;
}) {
  const { q, offset: rawOffset, added } = await searchParams;
  const offset = Math.max(0, Number(rawOffset ?? 0) || 0);
  const mayWrite = await canOperate();

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
      <PageHeading
        title="Students"
        meta={`${list.total} active`}
        action={
          mayWrite ? (
            <ActionLink href="/students/new">
              <UserPlus className="size-4" aria-hidden />
              Add student
            </ActionLink>
          ) : undefined
        }
      />

      {added && (
        <div className="mb-5">
          {/* Named rather than "Student added": the warden has just typed a name and wants to see
              it echoed back, and it confirms the right record was created. */}
          <Notice tone="teal">
            {list.students.find((s) => s.student_id === added)?.full_name ?? 'Student'} was admitted.
          </Notice>
        </div>
      )}

      {/* A plain GET form: search survives a page refresh, works without JavaScript, and keeps the
          query in the URL so a warden can bookmark or share it. */}
      <SearchForm defaultValue={q} label="Search students by name or phone" />

      {shown === 0 ? (
        <Notice tone="muted">
          {q ? `No students match “${q}”.` : 'No students yet.'}
        </Notice>
      ) : (
        <TableFrame>
            <thead>
              <tr className="bg-surface-2 text-left">
                <Th>Name</Th>
                <Th>Room</Th>
                <Th>Phone</Th>
                <Th align="right">Rent</Th>
                <Th align="right">Unpaid</Th>
                {mayWrite && <Th align="right">{''}</Th>}
              </tr>
            </thead>
            <tbody>
              {list.students.map((s) => {
                const unpaid = Number(s.unpaid_pkr ?? 0);
                return (
                  <Tr key={s.student_id}>
                    <Td>
                      {/* The name is the link, not the whole row: a row-wide click target would
                          swallow the "Take payment" link sitting inside it. */}
                      <Link
                        href={`/students/${s.student_id}`}
                        className="font-medium text-text hover:text-gold"
                      >
                        {s.full_name}
                      </Link>
                    </Td>
                    <Td>{s.room_number ? `${s.room_number}${s.bed_label ? ` · ${s.bed_label}` : ''}` : '—'}</Td>
                    <Td numeric>{s.phone ?? '—'}</Td>
                    <Td align="right" numeric>
                      {formatPkr(s.rent_pkr)}
                    </Td>
                    <Td align="right" numeric>
                      <span className={unpaid > 0 ? 'font-semibold text-red' : 'text-text-muted'}>
                        {formatPkr(unpaid)}
                      </span>
                    </Td>
                    {/* The overwhelmingly common next action from this screen: a student walks up,
                        the warden finds their row, and takes the month's rent. */}
                    {mayWrite && (
                      <Td align="right">
                        <RowLink href={`/payments/new?studentId=${s.student_id}`}>Take payment</RowLink>
                      </Td>
                    )}
                  </Tr>
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
