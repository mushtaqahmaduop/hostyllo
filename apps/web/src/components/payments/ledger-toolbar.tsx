import { Search } from 'lucide-react';

import { SORT_LABEL, type LedgerView } from '@/lib/payments/contract';
import { StatusTabs } from '@/components/patterns/status-tabs';

/**
 * The ledger toolbar: month, search, status tabs, and the line that says what you
 * are looking at.
 *
 * ── One form, three controls ─────────────────────────────────────────────────
 * A plain GET form, like the roster's. Month, search and the carried-forward sort
 * all land in the URL, so a month view survives a refresh, can be sent to the
 * owner, and works with the back button — and on a hostel's connection it is one
 * request rather than one per keystroke.
 *
 * The month field is a native `<input type="month">`. The design draws a custom
 * dropdown; the native control gives a real calendar, a keyboard path and a
 * mobile month wheel for free, and this screen is opened on a phone at the front
 * desk more often than not.
 *
 * ── What the design has here that this does not ──────────────────────────────
 * The sketch's filter card carries eight dropdowns (method, room, block, amount
 * band, date range…). Every one of them would need a query parameter the API does
 * not have, so they would either do nothing or silently filter the page instead
 * of the month. The two filters that are real — the month and the search — are
 * here, and the tabs do the third job. "Clear Filters" goes with them: with two
 * controls, the tab labelled All *is* the clear.
 */
export function LedgerToolbar({ view }: { view: LedgerView }) {
  return (
    <div className="mb-3 flex shrink-0 flex-col gap-[11px]">
      <div className="flex flex-wrap items-center gap-[11px]">
        <form method="GET" action="/payments" className="flex min-w-[280px] flex-1 gap-[9px]">
          {/* Sort rides along as hidden fields: searching must not silently
              throw away the column the operator chose to sort by. The tab is
              deliberately *not* carried — a search is a new question, and
              landing inside "Overdue" with no matches reads as "nobody is
              overdue" rather than "your search found nothing here". */}
          {view.sort !== 'room' && <input type="hidden" name="sort" value={view.sort} />}
          {view.dir !== 'asc' && <input type="hidden" name="dir" value={view.dir} />}

          <label className="sr-only" htmlFor="ledger-month">
            Billing month
          </label>
          <input
            id="ledger-month"
            type="month"
            name="month"
            defaultValue={view.month}
            className="hs-num h-[var(--hs-control-h)] shrink-0 rounded-xl border border-hairline bg-surface px-[11px] text-[12.5px] text-fg focus:border-hairline-strong focus:outline-none"
          />

          <div className="flex h-[var(--hs-control-h)] min-w-0 flex-1 items-center gap-[9px] rounded-xl border border-hairline bg-surface px-[13px] focus-within:border-hairline-strong">
            <Search className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={view.q}
              aria-label="Search payments by student, room, receipt number or method"
              /* Names the four fields the API actually searches — no more. The
                 sketch offers "transaction ID", which nothing in this schema
                 stores; an operator who types one and gets nothing concludes the
                 payment was never recorded. */
              placeholder="Student, room, receipt no, method…"
              className="h-full w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-tertiary"
            />
          </div>

          <button type="submit" className="sr-only">
            Apply
          </button>
        </form>

        <StatusTabs tabs={view.tabs} label="Filter payments by status" />
      </div>

      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="hs-num text-body-sm text-fg-secondary">{view.resultLabel}</span>
        <span className="h-[14px] w-px bg-hairline" aria-hidden />
        <span className="text-body-sm text-fg-tertiary">
          Sorted by{' '}
          <b className="font-medium text-fg-secondary">
            {SORT_LABEL[view.sort]} {view.dir === 'asc' ? 'ascending' : 'descending'}
          </b>
        </span>
      </div>
    </div>
  );
}
