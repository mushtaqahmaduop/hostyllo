import Link from 'next/link';
import { redirect } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { canOperate } from '@/lib/session';
import { formatDate, formatAmount } from '@/lib/format';
import { PageHeader } from '@/components/patterns/page-header';
import { HeroPanel } from '@/components/patterns/hero-panel';
import { StatStrip, StatItem } from '@/components/patterns/stat-strip';
import { Money, Num } from '@/components/patterns/money';
import { Pagination } from '@/components/patterns/pagination';
import { EmptyState, FilteredEmptyState, ErrorState } from '@/components/patterns/states';
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
import { cn } from '@/lib/utils';

export const metadata = { title: 'Dues & payments' };

/** GET /payments — API spec Module 4. Money arrives as strings on some endpoints. */
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

/**
 * §3.2: "If a screen shows more than ~6 amber elements at once, that's a product problem — surface
 * a grouped banner instead of 12 amber badges." Above this many outstanding rows the page states
 * the total once and leaves the rows neutral; the operator's next move is the defaulters worklist,
 * not scanning a wall of amber.
 */
const AMBER_LIMIT = 6;

/** The API takes `month` as YYYY-MM. Karachi, not the container's UTC clock — otherwise the first
    five hours of the 1st would default to last month. */
function currentMonth() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date()).slice(0, 7);
}

/** `2026-07` → `July 2026`, for the eyebrow and the empty-state copy. */
function monthLabel(month: string) {
  const d = new Date(`${month}-01T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? month
    : new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; offset?: string; receipt?: string }>;
}) {
  const { month: rawMonth, status, offset: rawOffset, receipt } = await searchParams;
  const month = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : currentMonth();
  const offset = Math.max(0, Number(rawOffset ?? 0) || 0);
  const mayWrite = await canOperate();

  const listParams = new URLSearchParams({ month, limit: String(PAGE_SIZE), offset: String(offset) });
  if (status) listParams.set('status', status);

  let list: PaymentList;
  let summary: Summary | null = null;

  try {
    // The summary aggregates the whole month, not the page — fetched alongside so the header
    // totals do not change as the operator pages through, which would make them useless for
    // reconciliation.
    [list, summary] = await Promise.all([
      api<PaymentList>(`/payments?${listParams.toString()}`),
      api<Summary>(`/payments/summary?month=${month}`).catch(() => null),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');

    // §10: the error states what failed and the next step. A 403 is not a failure — it is an
    // answer — so it reads as one rather than offering a retry that will never work.
    if (error instanceof ApiError && error.status === 403) {
      return (
        <>
          <PageHeader eyebrow={monthLabel(month)} title="Dues & payments" />
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
        <PageHeader eyebrow={monthLabel(month)} title="Dues & payments" />
        <ErrorState
          title="Couldn't load payments"
          body="Check your connection and try again. Nothing has been changed."
          detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
          retryHref={`/payments?month=${month}${status ? `&status=${status}` : ''}`}
        />
      </>
    );
  }

  const filtered = Boolean(status);
  const outstandingRows = list.payments.filter(
    (p) => Number(p.unpaidPkr ?? 0) > 0 && p.status !== 'void',
  );
  const tintRows = outstandingRows.length > 0 && outstandingRows.length <= AMBER_LIMIT;

  return (
    <>
      <PageHeader
        eyebrow={monthLabel(month)}
        title="Dues & payments"
        attention={outstandingRows.length > 0}
        actions={
          mayWrite ? (
            <Button asChild variant="primary">
              <Link href="/payments/new">Record payment</Link>
            </Button>
          ) : undefined
        }
      />

      {/* §14: the toast copy matches the button. This is its persistent twin, for the operator who
          navigated away before the toast dismissed — the receipt number is what gets written on
          the paper slip and quoted back weeks later, so it must survive a reload. */}
      {receipt && (
        <Alert tone="positive" className="mb-6">
          <AlertDescription>
            Payment recorded. Receipt <span className="font-mono text-mono">{receipt}</span>.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <HeroPanel
          className="lg:col-span-2"
          eyebrow={`Collected · ${monthLabel(month)}`}
          value={summary?.revenuePkr}
          definition="Collected = sum of amount paid on every non-voided payment row dated in this month."
        >
          <StatStrip>
            <StatItem
              label="Outstanding"
              attention={Number(summary?.pendingPkr ?? 0) > 0}
              hint={summary ? 'across unpaid and partial rows' : undefined}
            >
              <Money value={summary?.pendingPkr} />
            </StatItem>
            <StatItem label="Paid in full">
              <Num value={summary?.paidCount} />
            </StatItem>
            <StatItem label="Partly paid">
              <Num value={summary?.partialCount} />
            </StatItem>
            <StatItem label="Unpaid">
              <Num value={summary?.pendingCount} />
            </StatItem>
          </StatStrip>
        </HeroPanel>

        {/*
         * The grouped banner §3.2 asks for. It replaces per-row amber above the limit, and it is
         * also simply the more useful control: one link into the worklist that is sorted by how
         * much each student owes.
         */}
        <section
          data-state={outstandingRows.length > 0 ? 'attention' : undefined}
          className="hs-threshold rounded-lg border border-hairline bg-surface p-6"
        >
          <p className="hs-eyebrow">Still owing</p>
          {outstandingRows.length === 0 ? (
            <div className="mt-4">
              <span className="hs-rule" aria-hidden />
              <p className="mt-3 text-body text-fg-secondary">
                Everyone on this page has paid in full.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-4 text-body text-fg">
                <span className="font-semibold tabular-nums text-attention-text">
                  {outstandingRows.length}
                </span>{' '}
                {outstandingRows.length === 1 ? 'student owes' : 'students owe'} money on this page.
              </p>
              <p className="mt-1 text-body-sm text-fg-secondary">
                Outstanding this month:{' '}
                <span className="font-mono text-mono">
                  PKR {formatAmount(summary?.pendingPkr)}
                </span>
              </p>
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <Link href={`/payments/defaulters?month=${month}`}>See who still owes</Link>
              </Button>
            </>
          )}
        </section>
      </div>

      {/* GET form: filters live in the URL, so a month view can be bookmarked or sent to the owner,
          and the back button behaves. No JavaScript required to change month or status. */}
      <form method="GET" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="month" className="text-body-sm font-medium text-fg-secondary">
            Month
          </label>
          <input
            id="month"
            type="month"
            name="month"
            defaultValue={month}
            className={FILTER}
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="status" className="text-body-sm font-medium text-fg-secondary">
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
        </div>

        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      {list.payments.length === 0 ? (
        /*
         * §10 makes these two different states with different copy. Telling an operator whose
         * "void" filter matched nothing that they have no payments yet — when they have four
         * hundred — is precisely the bug the distinction exists to prevent.
         */
        filtered ? (
          <FilteredEmptyState what="payments" clearHref={`/payments?month=${month}`} />
        ) : (
          <EmptyState
            title={`No payments for ${monthLabel(month)}`}
            body="Rent rows are created when the month's billing runs. Record a payment to start the ledger for this month."
            action={mayWrite ? { label: 'Record payment', href: '/payments/new' } : undefined}
          />
        )
      ) : (
        <Table stickyFirstColumn minWidth={840}>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Room</TableHead>
              <TableHead numeric>Due</TableHead>
              <TableHead numeric>Paid</TableHead>
              <TableHead numeric>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.payments.map((p) => {
              const unpaid = Number(p.unpaidPkr ?? 0);
              const voided = p.status === 'void';
              return (
                <TableRow
                  key={p.paymentId}
                  attention={tintRows && unpaid > 0 && !voided}
                  // A voided payment stays in the ledger for the audit trail but must not read as
                  // live money. Dimming says so without hiding the row — §16 has no time for a
                  // ledger that quietly drops entries.
                  className={cn(voided && 'opacity-55')}
                >
                  <TableCell>
                    <Link
                      href={`/students/${p.studentId}`}
                      className="font-medium text-fg hover:text-brand-text"
                    >
                      {p.studentName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-mono text-fg-secondary">
                    {p.roomNumber ?? '—'}
                  </TableCell>
                  <TableCell numeric>
                    <Money value={p.totalDuePkr} tier="ledger" />
                  </TableCell>
                  <TableCell numeric>
                    <Money value={p.amountPaidPkr} tier="ledger" />
                  </TableCell>
                  <TableCell numeric>
                    <Money
                      value={unpaid}
                      tier="ledger"
                      className={
                        unpaid > 0 && !voided ? 'font-semibold text-attention-text' : 'text-fg-tertiary'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-fg-secondary">{formatDate(p.paymentDate)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
  'h-[var(--hs-control-h)] rounded-md border border-hairline bg-surface px-3 text-body text-fg ' +
  'transition-[border-color] duration-instant ease-standard hover:border-hairline-strong';
