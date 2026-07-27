import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { redirect } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { formatPkr, formatDate } from '@/lib/format';
import { canOperate } from '@/lib/session';
import { cn } from '@/lib/utils';
import { ActionLink, Notice, PageHeading, Pagination, Stat, StatGrid, StatusBadge, TableFrame, Td, Th } from '@/components/ui';

export const metadata = { title: 'Payments' };

/** GET /payments — API spec Module 4. Money arrives as strings; formatPkr coerces. */
type Payment = {
  paymentId: string;
  studentId: string;
  studentName: string;
  roomNumber: string | null;
  paymentMonth: string;
  totalDuePkr: number | string;
  amountPaidPkr: number | string;
  unpaidPkr: number | string;
  status: string;
  paymentMethod: string | null;
  paymentDate: string | null;
};

type PaymentList = { payments: Payment[]; total: number };

type Summary = {
  month: string;
  revenuePkr: number | string;
  pendingPkr: number | string;
  paidCount: number | string;
  partialCount: number | string;
  pendingCount: number | string;
};

const PAGE_SIZE = 25;
const STATUSES = ['paid', 'partial', 'pending', 'void'] as const;

/** The API takes `month` as YYYY-MM; this is also the default the summary uses. */
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; offset?: string; receipt?: string }>;
}) {
  const { month: rawMonth, status, offset: rawOffset, receipt } = await searchParams;
  const month = rawMonth || currentMonth();
  const offset = Math.max(0, Number(rawOffset ?? 0) || 0);
  const mayWrite = await canOperate();

  const listParams = new URLSearchParams({ month, limit: String(PAGE_SIZE), offset: String(offset) });
  if (status) listParams.set('status', status);

  let list: PaymentList;
  let summary: Summary | null = null;

  try {
    // The summary is a separate aggregate over the whole month, not the page — fetched alongside
    // so the header totals do not change as the user pages through.
    [list, summary] = await Promise.all([
      api<PaymentList>(`/payments?${listParams.toString()}`),
      api<Summary>(`/payments/summary?month=${month}`).catch(() => null),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 403) {
      return <Notice tone="amber">Your role does not have access to payments.</Notice>;
    }
    return <Notice tone="red">{error instanceof ApiError ? error.message : 'Could not load payments.'}</Notice>;
  }

  return (
    <>
      <PageHeading
        title="Payments"
        meta={`${list.total} for ${month}`}
        action={
          mayWrite ? (
            <ActionLink href="/payments/new">
              <Receipt className="size-4" aria-hidden />
              Record payment
            </ActionLink>
          ) : undefined
        }
      />

      {receipt && (
        <div className="mb-5">
          {/* The receipt number is the thing worth showing — it is what a warden writes on the
              paper slip and what a student quotes back when querying a payment later. */}
          <Notice tone="teal">Payment recorded. Receipt {receipt}.</Notice>
        </div>
      )}

      {summary && (
        <StatGrid label="Month summary">
          <Stat label="Collected" value={formatPkr(summary.revenuePkr)} tone="teal" />
          <Stat
            label="Outstanding"
            value={formatPkr(summary.pendingPkr)}
            tone={Number(summary.pendingPkr) > 0 ? 'amber' : undefined}
          />
          <Stat label="Paid in full" value={String(Number(summary.paidCount ?? 0))} />
          <Stat label="Partial" value={String(Number(summary.partialCount ?? 0))} />
          <Stat label="Unpaid" value={String(Number(summary.pendingCount ?? 0))} />
        </StatGrid>
      )}

      <p className="mb-5">
        <Link href={`/payments/defaulters?month=${month}`} className="text-[15px]">
          See who still owes for {month} →
        </Link>
      </p>

      {/* GET form: filters live in the URL, so a month view can be bookmarked or shared, and the
          back button behaves. No JavaScript required to change month or status. */}
      <form method="GET" className="mb-5 flex flex-wrap gap-2">
        {/* Labels stay in the accessibility tree even where the control is self-evident visually. */}
        <label htmlFor="month" className="sr-only">
          Month
        </label>
        <input id="month" type="month" name="month" defaultValue={month} className={FILTER} />

        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select id="status" name="status" defaultValue={status ?? ''} className={FILTER}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md bg-gold px-4 font-semibold text-on-gold shadow-sm transition-colors duration-150 hover:bg-gold-hover active:bg-gold-active"
        >
          Apply
        </button>
      </form>

      {list.payments.length === 0 ? (
        <Notice tone="muted">
          No payments recorded for {month}
          {status ? ` with status “${status}”` : ''}.
        </Notice>
      ) : (
        <TableFrame minWidth={780}>
          <thead>
            <tr className="bg-surface-2 text-left">
              <Th>Student</Th>
              <Th>Room</Th>
              <Th align="right">Due</Th>
              <Th align="right">Paid</Th>
              <Th align="right">Unpaid</Th>
              <Th>Status</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody>
            {list.payments.map((p) => {
              const unpaid = Number(p.unpaidPkr ?? 0);
              const voided = p.status === 'void';
              return (
                <tr
                  key={p.paymentId}
                  className={cn(
                    'border-t border-border transition-colors duration-150 hover:bg-surface-2',
                    // A voided payment still counts for the audit trail but must not read as live
                    // money; dimming it is the cheapest way to say so without hiding the row.
                    voided && 'opacity-55',
                  )}
                >
                  <Td>
                    <Link href={`/students/${p.studentId}`} className="font-medium text-text hover:text-gold">
                      {p.studentName}
                    </Link>
                  </Td>
                  <Td>{p.roomNumber ?? '—'}</Td>
                  <Td align="right" numeric>
                    {formatPkr(p.totalDuePkr)}
                  </Td>
                  <Td align="right" numeric>
                    {formatPkr(p.amountPaidPkr)}
                  </Td>
                  <Td align="right" numeric>
                    <span className={unpaid > 0 && !voided ? 'font-semibold text-red' : 'text-text-muted'}>
                      {formatPkr(unpaid)}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td>{formatDate(p.paymentDate)}</Td>
                </tr>
              );
            })}
          </tbody>
        </TableFrame>
      )}

      <Pagination
        basePath="/payments"
        params={{ month, status }}
        offset={offset}
        shown={list.payments.length}
        total={list.total}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}

const FILTER =
  'min-h-11 rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-base text-text ' +
  'transition-colors duration-150 hover:border-text-disabled';
