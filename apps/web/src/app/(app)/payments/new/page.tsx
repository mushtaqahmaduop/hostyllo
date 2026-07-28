import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { canOperate } from '@/lib/session';
import { PageHeader } from '@/components/patterns/page-header';
import { SearchForm } from '@/components/patterns/search-form';
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
import { PaymentForm } from './payment-form';

export const metadata = { title: 'Record payment' };

type Student = {
  id: string;
  full_name: string;
  monthly_fee: number | string;
  room_number: string | null;
  bed_label: string | null;
  status: string;
};

type SearchHit = {
  student_id: string;
  full_name: string;
  phone: string | null;
  room_number: string | null;
  unpaid_pkr: number | string;
};

/**
 * Two states in one route, on purpose.
 *
 * Without `?studentId` this is a "who is paying" search; with one it is the payment form. A warden
 * usually arrives here from a row in the students list and never sees the search step — but the
 * nav link has to lead somewhere, and a search is a better answer than a dropdown of every student
 * in the hostel.
 */
export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; q?: string; month?: string }>;
}) {
  if (!(await canOperate())) {
    return (
      <>
        <PageHeader title="Record payment" />
        <Alert tone="attention">
          <AlertDescription>
            Your role cannot record payments. Ask the hostel owner to change it.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const { studentId, q, month } = await searchParams;

  return (
    <>
      <PageHeader
        title="Record payment"
        actions={
          <Button asChild variant="ghost">
            <Link href="/payments">Cancel</Link>
          </Button>
        }
      />

      {studentId ? <ForStudent studentId={studentId} month={month} /> : <StudentPicker q={q} />}
    </>
  );
}

async function ForStudent({ studentId, month }: { studentId: string; month?: string }) {
  let student: Student;
  try {
    student = await api<Student>(`/students/${studentId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 404) {
      return (
        <ErrorState
          title="That student does not exist"
          body="They may have been removed. Search for them again."
          retryHref="/payments/new"
        />
      );
    }
    return (
      <ErrorState
        title="Couldn't load that student"
        body="Check your connection and try again. Nothing has been recorded."
        detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
        retryHref={`/payments/new?studentId=${studentId}`}
      />
    );
  }

  if (student.status === 'vacated') {
    return (
      <Alert tone="attention">
        <AlertDescription>
          {student.full_name} has vacated. No new payment can be recorded against them.
        </AlertDescription>
      </Alert>
    );
  }

  // Karachi, not the server's clock: a Railway container runs in UTC, and between midnight and 5am
  // local it would otherwise default the month and date to the previous day.
  const karachi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
  const defaultMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : karachi.slice(0, 7);

  return (
    <>
      <div className="hs-threshold mb-6 rounded-lg border border-hairline bg-surface p-6">
        <p className="hs-eyebrow">Paying for</p>
        <p className="mt-2 text-h2 font-semibold text-fg">{student.full_name}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-body-sm text-fg-secondary">
          {[student.room_number ? `Room ${student.room_number}` : null, student.bed_label]
            .filter(Boolean)
            .join(' · ')}
          <span aria-hidden>·</span>
          <Money value={student.monthly_fee} /> / month
        </p>
      </div>

      {/*
        The idempotency key is minted per render of this page, so it identifies *this* attempt to
        record a payment. Replaying the same submission — double tap, back-then-resubmit — returns
        the payment already created instead of a duplicate. `POST /payments` requires the header,
        so there is no path that skips it.
      */}
      <PaymentForm
        studentId={student.id}
        idempotencyKey={randomUUID()}
        defaultRent={Number(student.monthly_fee ?? 0)}
        defaultMonth={defaultMonth}
        today={karachi}
      />
    </>
  );
}

async function StudentPicker({ q }: { q?: string }) {
  let hits: SearchHit[] = [];
  let failed: string | null = null;

  if (q) {
    try {
      const result = await api<{ students: SearchHit[] }>(
        `/students?q=${encodeURIComponent(q)}&limit=20`,
      );
      hits = result.students;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) redirect('/login');
      failed = error instanceof ApiError ? error.message : 'Could not search students.';
    }
  }

  return (
    <>
      <SearchForm defaultValue={q} label="Search for the student who is paying" />

      {failed && (
        <ErrorState
          title="Couldn't search students"
          body="Check your connection and try again."
          detail={failed}
          retryHref="/payments/new"
        />
      )}

      {!failed && !q && (
        <EmptyState
          title="Who is paying?"
          body="Search by name or phone number to find the student, then record their payment."
        />
      )}

      {!failed && q && hits.length === 0 && (
        <FilteredEmptyState what="students" clearHref="/payments/new" />
      )}

      {hits.length > 0 && (
        <Table minWidth={560}>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Room</TableHead>
              <TableHead numeric>Unpaid</TableHead>
              <TableHead numeric>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hits.map((s) => {
              const unpaid = Number(s.unpaid_pkr ?? 0);
              return (
                <TableRow key={s.student_id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell className="font-mono text-mono text-fg-secondary">
                    {s.room_number ?? '—'}
                  </TableCell>
                  <TableCell numeric>
                    <Money
                      value={unpaid}
                      tier="ledger"
                      className={unpaid > 0 ? 'font-semibold text-attention-text' : 'text-fg-tertiary'}
                    />
                  </TableCell>
                  <TableCell className="text-end">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/payments/new?studentId=${s.student_id}`}>Select</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
