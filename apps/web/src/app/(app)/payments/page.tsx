import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeftRight,
  BarChart3,
  Clock,
  CreditCard,
  Plus,
  type LucideIcon,
} from 'lucide-react';

import { ApiError } from '@/lib/api';
import { canOperate } from '@/lib/session';
import { getLedgerView } from '@/lib/payments/presenter';
import { KpiStrip } from '@/components/patterns/kpi-strip';
import { LedgerTable } from '@/components/payments/ledger-table';
import { LedgerToolbar } from '@/components/payments/ledger-toolbar';
import { TopDue } from '@/components/payments/top-due';
import { Pagination } from '@/components/patterns/pagination';
import { EmptyState, FilteredEmptyState, ErrorState } from '@/components/patterns/states';
import { Alert, AlertDescription } from '@/components/ui-kit/alert';

export const metadata = { title: 'Payments' };

/** The strip is shared; the icons are what make it this screen's. */
const KPI_ICONS: Record<string, LucideIcon> = {
  collected: CreditCard,
  outstanding: AlertCircle,
  pending: Clock,
  transactions: ArrowLeftRight,
  average: BarChart3,
};

/**
 * The Payments ledger — the owner's redesign, `docs/design/handoff/designs/Payments.dc.html`.
 *
 * KPI strip, toolbar, an eleven-column table that scrolls inside its own frame,
 * numbered pagination, and a rail holding the month's largest dues.
 * `getLedgerView` owns every figure on the screen: the tab counts, the KPI
 * deltas, the mess breakdown and the result line all come out of the one request
 * that fetched the rows, so no two of them can disagree about the month.
 *
 * ── The screen is always scoped to a month ───────────────────────────────────
 * Not a default that can be cleared — a property. "Collected", "average per day"
 * and a comparison against the month before are only answerable inside one, and
 * an unbounded ledger summing every month ever recorded, under a heading naming
 * one of them, is the exact failure the dashboard rebuild existed to remove.
 *
 * ── What the design has that this does not ───────────────────────────────────
 * The bulk selection bar (checkbox column, "Mark as Paid", "Send Reminder",
 * "Print Receipts") is absent: there is no bulk endpoint behind any of the three,
 * WhatsApp is Phase 2, and a checkbox column whose only outcome is three dead
 * buttons costs a column on every row to deliver nothing. The rail's other five
 * panels are accounted for in `top-due.tsx`.
 */
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    q?: string;
    tab?: string;
    sort?: string;
    dir?: string;
    offset?: string;
    receipt?: string;
  }>;
}) {
  const query = await searchParams;
  const mayWrite = await canOperate();

  let view;
  try {
    view = await getLedgerView(query);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 403) {
      // Not a failure — an answer. It reads as one, rather than offering a retry
      // that will never work or an empty table that reads as "no payments".
      return (
        <Alert tone="attention">
          <AlertDescription>
            Your role does not have access to payments. Ask the hostel owner to change it.
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <ErrorState
        title="Couldn't load payments"
        body="Check your connection and try again. Nothing has been changed."
        detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
        retryHref="/payments"
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {query.receipt && (
        // The persistent twin of the toast, for the operator who navigated away
        // before it dismissed. The receipt number is what gets written on the
        // paper slip and quoted back weeks later, so it must survive a reload.
        <Alert tone="positive" className="mb-3 shrink-0">
          <AlertDescription>
            Payment recorded. Receipt <span className="hs-num font-medium">{query.receipt}</span>.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-[8px]">
        <h1 className="text-[15px] font-semibold text-fg">
          Payments{' '}
          <span className="font-normal text-fg-tertiary">· {view.monthLabel}</span>
        </h1>

        {mayWrite && (
          // The one filled button on this screen. Flat violet — the rules ban
          // the sketch's three-stop gradient on UI chrome.
          <Link
            href="/payments/new"
            className="inline-flex h-[var(--hs-control-h)] items-center gap-[7px] rounded-lg bg-brand px-[15px] text-[13px] font-semibold text-fg-on-brand transition-colors duration-fast ease-standard hover:bg-brand-hover"
          >
            <Plus className="size-4" aria-hidden />
            Record payment
          </Link>
        )}
      </div>

      <KpiStrip kpis={view.kpis} icons={KPI_ICONS} />

      <div className="mt-3 flex min-h-0 flex-1 gap-[13px]">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <LedgerToolbar view={view} />

          {view.rows.length === 0 ? (
            view.narrowed ? (
              <FilteredEmptyState what="payments" clearHref={`/payments?month=${view.month}`} />
            ) : (
              <EmptyState
                title={`No payments for ${view.monthLabel}`}
                body="Rent rows are created when the month's billing runs. Record a payment to start this month's ledger."
                action={mayWrite ? { label: 'Record payment', href: '/payments/new' } : undefined}
              />
            )
          ) : (
            <LedgerTable view={view} />
          )}

          <Pagination
            basePath="/payments"
            params={{
              month: view.month,
              q: view.q || undefined,
              tab: view.tab === 'all' ? undefined : view.tab,
              sort: view.sort === 'room' ? undefined : view.sort,
              dir: view.dir === 'asc' ? undefined : view.dir,
            }}
            offset={view.offset}
            shown={view.rows.length}
            total={view.total}
            pageSize={view.pageSize}
          />
        </div>

        <TopDue rows={view.topDue} month={view.month} />
      </div>
    </div>
  );
}
