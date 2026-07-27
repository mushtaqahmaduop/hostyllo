import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatPkr } from '@/lib/format';
import { canOperate, canRevealCnic } from '@/lib/session';
import {
  ActionLink,
  Notice,
  PageHeading,
  Stat,
  StatGrid,
  StatusBadge,
  TableFrame,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { RevealCnic } from './reveal-cnic';

/** GET /students/:id returns `s.*` plus these joins — see API spec Module 2. */
type RecentPayment = {
  payment_id: string;
  payment_month: string;
  status: string;
  amount_paid_pkr: number | string;
  receipt_id: string | null;
};

type Student = {
  id: string;
  full_name: string;
  father_name: string | null;
  phone: string | null;
  emergency_contact: string | null;
  email: string | null;
  address: string | null;
  masked_cnic: string | null;
  room_number: string | null;
  bed_label: string | null;
  monthly_fee: number | string;
  admission_fee: number | string;
  join_date: string | null;
  vacate_date: string | null;
  status: string;
  recent_payments: RecentPayment[] | null;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const student = await api<Student>(`/students/${id}`);
    return { title: student.full_name };
  } catch {
    // The page itself reports the failure properly; a title is not worth a second error path.
    return { title: 'Student' };
  }
}

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let student: Student;
  try {
    student = await api<Student>(`/students/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    // A cross-tenant id is a 404 by design (RLS returns no row), so this is also the "not yours"
    // path — and it must look identical to a genuinely missing student, or the response becomes an
    // oracle for whether an id exists in someone else's hostel.
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) {
      return <Notice tone="amber">Your role does not have access to student records.</Notice>;
    }
    return <Notice tone="red">{error instanceof ApiError ? error.message : 'Could not load this student.'}</Notice>;
  }

  const [mayWrite, mayReveal] = await Promise.all([canOperate(), canRevealCnic()]);
  const payments = student.recent_payments ?? [];
  const active = student.status === 'active';

  return (
    <>
      <PageHeading
        title={student.full_name}
        action={
          mayWrite && active ? (
            <ActionLink href={`/payments/new?studentId=${student.id}`}>
              <Receipt className="size-4" aria-hidden />
              Take payment
            </ActionLink>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={student.status} />
        <Link href="/students" className="text-sm text-text-muted">
          ← Back to students
        </Link>
      </div>

      <StatGrid label="Summary">
        <Stat
          label="Bed"
          value={student.room_number ? `Room ${student.room_number}` : 'Unassigned'}
          hint={student.bed_label ?? undefined}
        />
        <Stat label="Monthly rent" value={formatPkr(student.monthly_fee)} />
        <Stat label="Joined" value={formatDate(student.join_date)} />
        {student.vacate_date && <Stat label="Vacated" value={formatDate(student.vacate_date)} tone="amber" />}
      </StatGrid>

      <div className="mb-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <section className="rounded-lg border border-border bg-surface p-4" aria-label="Contact details">
          <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-text-muted">
            Contact
          </h2>
          <dl className="grid gap-3">
            <Detail label="Phone" value={student.phone} numeric />
            <Detail label="Emergency contact" value={student.emergency_contact} numeric />
            <Detail label="Email" value={student.email} />
            <Detail label="Father's name" value={student.father_name} />
            <Detail label="Address" value={student.address} />
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4" aria-label="Identity">
          <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-text-muted">
            Identity
          </h2>
          <dl className="grid gap-3">
            <div>
              <dt className="mb-1 text-[13px] text-text-muted">CNIC</dt>
              <dd>
                {/* The API never returns the real number from a detail call — only this mask. The
                    reveal is its own audited endpoint, offered to owners and chain managers only. */}
                {mayReveal && student.masked_cnic ? (
                  <RevealCnic studentId={student.id} masked={student.masked_cnic} />
                ) : (
                  <span className="tabular text-text-muted">{student.masked_cnic ?? '—'}</span>
                )}
              </dd>
            </div>
            <Detail label="Admission fee" value={formatPkr(student.admission_fee)} numeric />
          </dl>
        </section>
      </div>

      <section aria-label="Recent payments">
        <h2 className="mb-3 text-base font-semibold text-text-muted">Recent payments</h2>
        {payments.length === 0 ? (
          <Notice tone="muted">No payments recorded for this student yet.</Notice>
        ) : (
          <TableFrame minWidth={520}>
            <thead>
              <tr className="bg-surface-2 text-left">
                <Th>Month</Th>
                <Th>Receipt</Th>
                <Th align="right">Paid</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <Tr key={p.payment_id}>
                  {/* The API returns `month` as a DATE (the 1st); only the month is meaningful. */}
                  <Td>{formatMonth(p.payment_month)}</Td>
                  <Td numeric>{p.receipt_id ?? '—'}</Td>
                  <Td align="right" numeric>
                    {formatPkr(p.amount_paid_pkr)}
                  </Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableFrame>
        )}
        <p className="mt-3 text-[13px] text-text-muted">
          Showing the six most recent.{' '}
          <Link href="/payments">See all payments</Link>
        </p>
      </section>
    </>
  );
}

function Detail({ label, value, numeric }: { label: string; value: string | null; numeric?: boolean }) {
  return (
    <div>
      <dt className="mb-1 text-[13px] text-text-muted">{label}</dt>
      <dd className={numeric ? 'tabular break-words' : 'break-words'}>{value || '—'}</dd>
    </div>
  );
}

function formatMonth(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}
