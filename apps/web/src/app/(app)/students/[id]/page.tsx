import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { canOperate, canRevealCnic } from '@/lib/session';
import { PageHeader } from '@/components/patterns/page-header';
import { StatStrip, StatItem } from '@/components/patterns/stat-strip';
import { Money } from '@/components/patterns/money';
import { EmptyState, ErrorState } from '@/components/patterns/states';
import { Alert, AlertDescription } from '@/components/ui-kit/alert';
import { Button } from '@/components/ui-kit/button';
import { StatusBadge } from '@/components/ui-kit/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-kit/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui-kit/table';
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
      return (
        <>
          <PageHeader title="Student" />
          <Alert tone="attention">
            <AlertDescription>
              Your role does not have access to student records. Ask the hostel owner to change it.
            </AlertDescription>
          </Alert>
        </>
      );
    }
    return (
      <>
        <PageHeader title="Student" />
        <ErrorState
          title="Couldn't load this student"
          body="Check your connection and try again."
          detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
          retryHref={`/students/${id}`}
        />
      </>
    );
  }

  const [mayWrite, mayReveal] = await Promise.all([canOperate(), canRevealCnic()]);
  const payments = student.recent_payments ?? [];
  const active = student.status === 'active';

  return (
    <>
      <PageHeader
        eyebrow={student.room_number ? `Room ${student.room_number}` : 'Unassigned'}
        title={student.full_name}
        // A vacated student is not an error, but it is a state the operator must notice before
        // they take money from someone who has already moved out.
        attention={Boolean(student.vacate_date)}
        actions={
          mayWrite && active ? (
            <Button asChild variant="primary">
              <Link href={`/payments/new?studentId=${student.id}`}>Take payment</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <StatusBadge status={student.status} />
        <Link href="/students" className="text-body-sm text-fg-secondary hover:text-fg">
          Back to students
        </Link>
      </div>

      <div className="mb-8 rounded-lg border border-hairline bg-surface p-6">
        <StatStrip>
          <StatItem
            label="Bed"
            hint={student.bed_label ?? undefined}
          >
            <span className="font-mono text-mono">
              {student.room_number ? `Room ${student.room_number}` : '—'}
            </span>
          </StatItem>
          <StatItem label="Monthly rent">
            <Money value={student.monthly_fee} />
          </StatItem>
          <StatItem label="Joined">
            <span className="text-h3">{formatDate(student.join_date)}</span>
          </StatItem>
          <StatItem label="Vacated" attention={Boolean(student.vacate_date)}>
            <span className="text-h3">
              {student.vacate_date ? formatDate(student.vacate_date) : '—'}
            </span>
          </StatItem>
        </StatStrip>
      </div>

      <div className="mb-8 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <Card>
          <CardHeader>
            <CardTitle className="text-h3">Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4">
              <Detail label="Phone" value={student.phone} numeric />
              <Detail label="Emergency contact" value={student.emergency_contact} numeric />
              <Detail label="Email" value={student.email} />
              <Detail label="Father's name" value={student.father_name} />
              <Detail label="Address" value={student.address} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-h3">Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4">
              <div>
                <dt className="text-body-sm text-fg-secondary">CNIC</dt>
                <dd className="mt-1">
                  {/* The API never returns the real number from a detail call — only this mask.
                      The reveal is its own audited endpoint, offered to owners and chain managers
                      only. */}
                  {mayReveal && student.masked_cnic ? (
                    <RevealCnic studentId={student.id} masked={student.masked_cnic} />
                  ) : (
                    <span className="font-mono text-mono text-fg-secondary">
                      {student.masked_cnic ?? '—'}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-body-sm text-fg-secondary">Admission fee</dt>
                <dd className="mt-1">
                  <Money value={student.admission_fee} tier="ledger" className="text-start" />
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <section aria-label="Recent payments">
        <h2 className="hs-eyebrow mb-3">Recent payments</h2>

        {payments.length === 0 ? (
          <EmptyState
            title="No payments yet"
            body="Payments recorded for this student will appear here, most recent first."
            action={
              mayWrite && active
                ? { label: 'Take payment', href: `/payments/new?studentId=${student.id}` }
                : undefined
            }
          />
        ) : (
          <>
            <Table minWidth={560}>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead numeric>Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.payment_id}>
                    {/* The API returns `month` as a DATE (the 1st); only the month is meaningful. */}
                    <TableCell>{formatMonth(p.payment_month)}</TableCell>
                    <TableCell className="font-mono text-mono text-fg-secondary">
                      {p.receipt_id ?? '—'}
                    </TableCell>
                    <TableCell numeric>
                      <Money value={p.amount_paid_pkr} tier="ledger" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <p className="mt-3 text-body-sm text-fg-tertiary">
              Showing the six most recent. <Link href="/payments">See all payments</Link>
            </p>
          </>
        )}
      </section>
    </>
  );
}

function Detail({ label, value, numeric }: { label: string; value: string | null; numeric?: boolean }) {
  return (
    <div>
      <dt className="text-body-sm text-fg-secondary">{label}</dt>
      <dd className={cnDetail(numeric)}>{value || '—'}</dd>
    </div>
  );
}

function cnDetail(numeric?: boolean) {
  return numeric ? 'mt-1 break-words font-mono text-mono' : 'mt-1 break-words text-body';
}

function formatMonth(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}
