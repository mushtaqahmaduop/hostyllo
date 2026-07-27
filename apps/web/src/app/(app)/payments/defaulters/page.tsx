import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Phone } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatPkr } from '@/lib/format';
import {
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
  totalUnpaidPkr: number;
};

function currentMonth() {
  // Karachi rather than the container's UTC clock — otherwise the first five hours of the 1st of
  // the month would default to chasing last month's arrears.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date()).slice(0, 7);
}

/**
 * Who still owes money this month.
 *
 * This is a worklist, not a report: it is sorted by amount outstanding (the API orders by
 * `unpaid DESC`) and every row leads straight to either taking the payment or phoning the student.
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
      return <Notice tone="amber">Your role does not have access to payments.</Notice>;
    }
    return <Notice tone="red">{error instanceof ApiError ? error.message : 'Could not load defaulters.'}</Notice>;
  }

  return (
    <>
      <PageHeading title="Defaulters" meta={month} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/payments" className="text-sm text-text-muted">
          ← Back to payments
        </Link>
      </div>

      <form method="GET" className="mb-5 flex flex-wrap gap-2">
        <label htmlFor="month" className="sr-only">
          Month
        </label>
        <input
          id="month"
          type="month"
          name="month"
          defaultValue={month}
          className="min-h-11 rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-base text-text transition-colors duration-150 hover:border-text-disabled"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md bg-gold px-4 font-semibold text-on-gold shadow-sm transition-colors duration-150 hover:bg-gold-hover active:bg-gold-active"
        >
          Show
        </button>
      </form>

      <StatGrid label="Outstanding summary">
        <Stat
          label="Students owing"
          value={String(data.totalDefaulters)}
          tone={data.totalDefaulters > 0 ? 'amber' : 'teal'}
        />
        <Stat
          label="Total outstanding"
          value={formatPkr(data.totalUnpaidPkr)}
          tone={Number(data.totalUnpaidPkr) > 0 ? 'red' : 'teal'}
        />
      </StatGrid>

      {/*
        No per-row "collect" action, and that is deliberate.

        Every student on this list already has a payment row for this month — that is what makes
        them a defaulter (the API filters on status pending/partial). Settling one is therefore an
        edit of that row, `PATCH /payments/:id`, not a new payment: `POST /payments` would hit the
        duplicate-month guard and 409 on every single row.

        The blocker is that `GET /payments/defaulters` returns `studentId` but not the payment's own
        id, so there is nothing here to deep-link an edit to. Logged in tasks/todo §1.5. Until the
        endpoint returns `paymentId`, each row links to the student instead.
      */}
      {data.defaulters.length === 0 ? (
        <Notice tone="teal">Everyone has paid in full for {month}. Nothing to chase.</Notice>
      ) : (
        <TableFrame minWidth={720}>
          <thead>
            <tr className="bg-surface-2 text-left">
              <Th>Student</Th>
              <Th>Room</Th>
              <Th>Phone</Th>
              <Th align="right">Due</Th>
              <Th align="right">Paid</Th>
              <Th align="right">Outstanding</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {data.defaulters.map((d) => (
              <Tr key={d.studentId}>
                <Td>
                  <Link href={`/students/${d.studentId}`} className="font-medium text-text hover:text-gold">
                    {d.studentName}
                  </Link>
                </Td>
                <Td>{d.roomNumber ?? '—'}</Td>
                <Td numeric>
                  {/* A tel: link, because the next action after reading this row is almost always
                      to ring them — and on the phone this is one tap instead of copying digits. */}
                  {d.phone ? (
                    <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1.5">
                      <Phone className="size-3.5" aria-hidden />
                      {d.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td align="right" numeric>
                  {formatPkr(d.totalDuePkr)}
                </Td>
                <Td align="right" numeric>
                  {formatPkr(d.amountPaidPkr)}
                </Td>
                <Td align="right" numeric>
                  <span className="font-semibold text-red">{formatPkr(d.unpaidPkr)}</span>
                </Td>
                <Td>
                  <StatusBadge status={d.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableFrame>
      )}
    </>
  );
}
