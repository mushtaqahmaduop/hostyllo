import Link from 'next/link';
import { redirect } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { canOperate } from '@/lib/session';
import { PageHeader } from '@/components/patterns/page-header';
import { SearchForm } from '@/components/patterns/search-form';
import { Pagination } from '@/components/patterns/pagination';
import { Money } from '@/components/patterns/money';
import { EmptyState, FilteredEmptyState, ErrorState } from '@/components/patterns/states';
import { Alert, AlertDescription } from '@/components/ui-kit/alert';
import { Button } from '@/components/ui-kit/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui-kit/table';

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
      return (
        <>
          <PageHeader title="Students" />
          <Alert tone="attention">
            <AlertDescription>
              Your role does not have access to the student list. Ask the hostel owner to change it.
            </AlertDescription>
          </Alert>
        </>
      );
    }
    return (
      <>
        <PageHeader title="Students" />
        <ErrorState
          title="Couldn't load students"
          body="Check your connection and try again."
          detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
          retryHref="/students"
        />
      </>
    );
  }

  const shown = list.students.length;

  return (
    <>
      <PageHeader
        eyebrow={`${list.total} active`}
        title="Students"
        actions={
          mayWrite ? (
            <Button asChild variant="primary">
              <Link href="/students/new">Add student</Link>
            </Button>
          ) : undefined
        }
      />

      {added && (
        // Named rather than "Student added": the warden has just typed a name and wants to see it
        // echoed back — it confirms the right record was created (§14).
        <Alert tone="positive" className="mb-6">
          <AlertDescription>
            {list.students.find((s) => s.student_id === added)?.full_name ?? 'Student'} was admitted.
          </AlertDescription>
        </Alert>
      )}

      <SearchForm defaultValue={q} label="Search students by name or phone" />

      {shown === 0 ? (
        q ? (
          <FilteredEmptyState what="students" clearHref="/students" />
        ) : (
          <EmptyState
            title="No students yet"
            body="Add your first student to start tracking rooms and dues."
            action={mayWrite ? { label: 'Add student', href: '/students/new' } : undefined}
          />
        )
      ) : (
        <Table stickyFirstColumn minWidth={800}>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead numeric>Rent</TableHead>
              <TableHead numeric>Unpaid</TableHead>
              {mayWrite && <TableHead numeric>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.students.map((s) => {
              const unpaid = Number(s.unpaid_pkr ?? 0);
              return (
                <TableRow key={s.student_id}>
                  <TableCell>
                    {/* The name is the link, not the whole row: a row-wide click target would
                        swallow the "Take payment" link sitting inside it. */}
                    <Link
                      href={`/students/${s.student_id}`}
                      className="font-medium text-fg hover:text-brand-text"
                    >
                      {s.full_name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-mono text-fg-secondary">
                    {s.room_number
                      ? `${s.room_number}${s.bed_label ? ` · ${s.bed_label}` : ''}`
                      : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-mono">{s.phone ?? '—'}</TableCell>
                  <TableCell numeric>
                    <Money value={s.rent_pkr} tier="ledger" />
                  </TableCell>
                  <TableCell numeric>
                    <Money
                      value={unpaid}
                      tier="ledger"
                      className={unpaid > 0 ? 'font-semibold text-attention-text' : 'text-fg-tertiary'}
                    />
                  </TableCell>
                  {/* The overwhelmingly common next action from this screen: a student walks up,
                      the warden finds their row, and takes the month's rent. */}
                  {mayWrite && (
                    <TableCell className="text-end">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/payments/new?studentId=${s.student_id}`}>Take payment</Link>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
