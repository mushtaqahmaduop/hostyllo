import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { canOperate } from '@/lib/session';
import { formatPkr } from '@/lib/format';
import { Notice, PageHeading, RowLink, SearchForm, TableFrame, Td, Th, Tr } from '@/components/ui';
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
    return <Notice tone="amber">Your role cannot record payments.</Notice>;
  }

  const { studentId, q, month } = await searchParams;

  return (
    <>
      <PageHeading title="Record payment" />
      <Link href="/payments" className="text-sm text-text-muted">
        ← Back to payments
      </Link>

      <div className="mt-5">
        {studentId ? <ForStudent studentId={studentId} month={month} /> : <StudentPicker q={q} />}
      </div>
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
      return <Notice tone="red">That student does not exist. Search for them again.</Notice>;
    }
    return <Notice tone="red">{error instanceof ApiError ? error.message : 'Could not load that student.'}</Notice>;
  }

  if (student.status === 'vacated') {
    return <Notice tone="amber">{student.full_name} has vacated. No new payment can be recorded against them.</Notice>;
  }

  // Karachi, not the server's clock: a Railway container runs in UTC, and between midnight and 5am
  // local it would otherwise default the month and date to the previous day.
  const karachi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
  const defaultMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : karachi.slice(0, 7);

  return (
    <>
      <div className="mb-5 rounded-lg border border-border bg-surface p-4">
        <div className="text-[13px] text-text-muted">Paying for</div>
        <div className="text-lg font-semibold">{student.full_name}</div>
        <div className="mt-0.5 text-sm text-text-muted">
          {[
            student.room_number ? `Room ${student.room_number}` : null,
            student.bed_label,
            `${formatPkr(student.monthly_fee)} / month`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
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
      const result = await api<{ students: SearchHit[] }>(`/students?q=${encodeURIComponent(q)}&limit=20`);
      hits = result.students;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) redirect('/login');
      failed = error instanceof ApiError ? error.message : 'Could not search students.';
    }
  }

  return (
    <>
      <SearchForm defaultValue={q} label="Search for the student who is paying" autoFocus />

      {failed && <Notice tone="red">{failed}</Notice>}

      {!failed && q && hits.length === 0 && <Notice tone="muted">No students match “{q}”.</Notice>}

      {!failed && !q && <Notice tone="muted">Search for the student who is paying.</Notice>}

      {hits.length > 0 && (
        <TableFrame minWidth={520}>
          <thead>
            <tr className="bg-surface-2 text-left">
              <Th>Name</Th>
              <Th>Room</Th>
              <Th align="right">Unpaid</Th>
              <Th align="right">{''}</Th>
            </tr>
          </thead>
          <tbody>
            {hits.map((s) => (
              <Tr key={s.student_id}>
                <Td>{s.full_name}</Td>
                <Td>{s.room_number ?? '—'}</Td>
                <Td align="right" numeric>
                  {formatPkr(s.unpaid_pkr)}
                </Td>
                <Td align="right">
                  <RowLink href={`/payments/new?studentId=${s.student_id}`}>Select</RowLink>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableFrame>
      )}
    </>
  );
}
