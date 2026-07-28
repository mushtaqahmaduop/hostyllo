import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Phone } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/patterns/page-header';
import { HeroPanel } from '@/components/patterns/hero-panel';
import { StatStrip, StatItem } from '@/components/patterns/stat-strip';
import { Money, Num } from '@/components/patterns/money';
import { EmptyState, ErrorState } from '@/components/patterns/states';
import { Alert, AlertDescription } from '@/components/ui-kit/alert';
import { Button } from '@/components/ui-kit/button';
import { StatusBadge } from '@/components/ui-kit/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui-kit/table';

export const metadata = { title: 'Defaulters' };

/** GET /payments/defaulters — API spec Module 4. `month` is required and takes YYYY-MM. */
type Defaulter = {
  studentId: string;
  studentName: string;
  phone: string | null;
  roomNumber: string | null;
  totalDuePkr: number | string;
  amountPaidPkr: number | string;
  unpaidPkr: number | string;
  status: string;
};

type DefaultersResponse = {
  defaulters: Defaulter[];
  totalDefaulters: number;
  totalUnpaidPkr: number | string;
};

function currentMonth() {
  // Karachi rather than the container's UTC clock — otherwise the first five hours of the 1st of
  // the month would default to chasing last month's arrears.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date()).slice(0, 7);
}

function monthLabel(month: string) {
  const d = new Date(`${month}-01T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? month
    : new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

/**
 * Who still owes money this month.
 *
 * A worklist, not a report. The API orders by `unpaid DESC`, so the row that matters most is
 * first, and every row leads to the only two things an operator does with it: open the student, or
 * ring them. This is the one screen where amber in bulk is correct — every row here is by
 * definition action-required (§3.2), which is exactly why the count lives in the hero.
 */
export default async function DefaultersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams;
  const month = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : currentMonth();

  let data: DefaultersResponse;
  try {
    data = await api<DefaultersResponse>(`/payments/defaulters?month=${month}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 403) {
      return (
        <>
          <PageHeader eyebrow={monthLabel(month)} title="Defaulters" />
          <Alert tone="attention">
            <AlertDescription>
              Your role does not have access to payments. Ask the hostel owner to change it.
            </AlertDescription>
          </Alert>
        </>
      );
    }
    return (
      <>
        <PageHeader eyebrow={monthLabel(month)} title="Defaulters" />
        <ErrorState
          title="Couldn't load defaulters"
          body="Check your connection and try again."
          detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
          retryHref={`/payments/defaulters?month=${month}`}
        />
      </>
    );
  }

  const anyOwing = data.totalDefaulters > 0;

  return (
    <>
      <PageHeader
        eyebrow={monthLabel(month)}
        title="Defaulters"
        description="Everyone with an unpaid or partly paid rent row this month, largest debt first."
        attention={anyOwing}
        actions={
          <Button asChild variant="secondary">
            <Link href={`/payments?month=${month}`}>All payments</Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <HeroPanel
          className="lg:col-span-2"
          eyebrow={`Outstanding · ${monthLabel(month)}`}
          value={data.totalUnpaidPkr}
          definition="Outstanding = total due minus amount paid, summed over every unpaid or partly paid row this month."
        >
          <StatStrip>
            <StatItem label="Students owing" attention={anyOwing}>
              <Num value={data.totalDefaulters} />
            </StatItem>
            <StatItem label="Month">
              <span className="text-h2">{monthLabel(month)}</span>
            </StatItem>
          </StatStrip>
        </HeroPanel>

        <form method="GET" className="flex flex-col justify-end gap-3 rounded-lg border border-hairline bg-surface p-6">
          <label htmlFor="month" className="text-body-sm font-medium text-fg-secondary">
            Show another month
          </label>
          <input
            id="month"
            type="month"
            name="month"
            defaultValue={month}
            className="h-[var(--hs-control-h)] rounded-md border border-hairline bg-surface px-3 text-body text-fg transition-[border-color] duration-instant ease-standard hover:border-hairline-strong"
          />
          <Button type="submit" variant="secondary">
            Show
          </Button>
        </form>
      </div>

      {/*
       * No per-row "collect" action, and that is deliberate.
       *
       * Every student here already has a payment row for this month — that is what makes them a
       * defaulter (the API filters on status pending/partial). Settling one is an edit of that row,
       * `PATCH /payments/:id`, not a new payment: `POST /payments` would hit the duplicate-month
       * guard and 409 on every single row.
       *
       * The blocker is that `GET /payments/defaulters` returns `studentId` but not the payment's
       * own id, so there is nothing here to deep-link an edit to. Logged in tasks/todo. Until the
       * endpoint returns `paymentId`, each row links to the student instead.
       */}
      {data.defaulters.length === 0 ? (
        <EmptyState
          title={`Everyone has paid for ${monthLabel(month)}`}
          body="Nothing to chase this month. New arrears appear here as soon as a rent row goes unpaid."
        />
      ) : (
        <Table stickyFirstColumn minWidth={820}>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead numeric>Due</TableHead>
              <TableHead numeric>Paid</TableHead>
              <TableHead numeric>Outstanding</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.defaulters.map((d) => (
              <TableRow key={d.studentId} attention>
                <TableCell>
                  <Link
                    href={`/students/${d.studentId}`}
                    className="font-medium text-fg hover:text-brand-text"
                  >
                    {d.studentName}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-mono text-fg-secondary">
                  {d.roomNumber ?? '—'}
                </TableCell>
                <TableCell className="font-mono text-mono">
                  {/* A tel: link, because the next action after reading this row is almost always
                      to ring them — one tap on a phone instead of copying digits. */}
                  {d.phone ? (
                    <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1.5">
                      <Phone className="size-3.5" aria-hidden />
                      {d.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell numeric>
                  <Money value={d.totalDuePkr} tier="ledger" />
                </TableCell>
                <TableCell numeric>
                  <Money value={d.amountPaidPkr} tier="ledger" />
                </TableCell>
                <TableCell numeric>
                  <Money
                    value={d.unpaidPkr}
                    tier="ledger"
                    className="font-semibold text-attention-text"
                  />
                </TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
