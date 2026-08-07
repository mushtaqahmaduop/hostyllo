import Link from 'next/link';
import { ArrowDown, ArrowUp, Eye, Receipt } from 'lucide-react';

import { formatAmount } from '@/lib/format';
import {
  SORT_LABEL,
  type DerivedKey,
  type LedgerRow,
  type LedgerView,
  type SortKey,
} from '@/lib/payments/contract';
import { cn } from '@/lib/utils';

/**
 * The payments ledger table.
 *
 * Eleven columns, scrolling inside its own frame while the page around it stays
 * put. The student is pinned at the start and the actions at the end, so the two
 * things an operator needs while reading a wide row — who is this, and what can I
 * do about it — never leave the viewport. Same frame, same cell padding tokens
 * and same sticky behaviour as the roster, because they are the same object.
 */

const CELL = 'px-[var(--hs-cell-pad-x)] py-[var(--hs-cell-pad-y)]';

const ROW_ACTION =
  'inline-grid size-[27px] place-items-center rounded-lg border border-hairline bg-surface-hover ' +
  'text-fg-secondary transition-colors duration-fast ease-standard hover:border-hairline-strong hover:text-fg';

const HEAD = cn(
  CELL,
  'sticky top-0 z-20 whitespace-nowrap bg-surface-sunken text-start align-middle',
  'border-b border-hairline text-[11px] font-semibold uppercase tracking-eyebrow text-fg-tertiary',
);

/**
 * Status → pill treatment.
 *
 * `DESIGN_RULES.md`: pills default to grey, semantic colour only when the state
 * is actionable. Overdue is red and Pending amber because both are money the
 * hostel is owed and both demand a call today. Paid, Partial and Void are grey —
 * which is the design's own choice for Partial, and worth stating because it
 * looks like an omission: a partial payment is not silent, it carries a figure in
 * the Unpaid column, and once it is late it moves to Overdue and turns red. What
 * it does not do is spend colour on the majority of a busy month.
 */
const STATUS_PILL: Record<DerivedKey, string> = {
  paid: 'border-hairline bg-surface-hover text-fg-secondary',
  partial: 'border-hairline bg-surface-hover text-fg-secondary',
  pending: 'border-attention-border bg-attention-tint text-attention',
  overdue: 'border-negative-border bg-negative-tint text-negative',
  void: 'border-hairline bg-surface-hover text-fg-tertiary',
};

export function LedgerTable({ view }: { view: LedgerView }) {
  return (
    <div className="hs-scroll min-h-0 flex-1 overflow-auto rounded-xl border border-hairline bg-surface">
      <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-[13.5px]">
        <caption className="sr-only">
          Payments for {view.monthLabel}, {view.resultLabel}, sorted by {SORT_LABEL[view.sort]}{' '}
          {view.dir === 'asc' ? 'ascending' : 'descending'}
        </caption>
        <thead>
          <tr>
            <SortableHead column="student" view={view} className="min-w-[190px]">
              Student
            </SortableHead>
            <SortableHead column="room" view={view}>
              Room
            </SortableHead>
            <SortableHead column="month" view={view}>
              Month
            </SortableHead>
            <SortableHead column="rent" view={view} numeric>
              Rent / Mo
            </SortableHead>
            <SortableHead column="conc" view={view} numeric>
              Conc.
            </SortableHead>
            <SortableHead column="extra" view={view} numeric>
              Extra
            </SortableHead>
            <SortableHead column="paid" view={view} numeric>
              Paid
            </SortableHead>
            <SortableHead column="unpaid" view={view} numeric>
              Unpaid
            </SortableHead>
            <SortableHead column="method" view={view}>
              Method
            </SortableHead>
            <SortableHead column="status" view={view}>
              Status
            </SortableHead>
            <th scope="col" className={cn(HEAD, 'sticky end-0 z-30 border-s border-hairline text-end')}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ row }: { row: LedgerRow }) {
  const cell = cn(CELL, 'border-b border-hairline-soft align-middle whitespace-nowrap');

  return (
    <tr
      className={cn(
        'transition-colors duration-fast ease-standard hover:bg-surface-hover',
        // A voided payment stays in the ledger for the audit trail but must not
        // read as live money. Dimming says so without hiding the row.
        row.voided && 'opacity-60',
      )}
    >
      <td className={cell}>
        <div className="flex items-center gap-[10px]">
          {/* One neutral avatar. A palette keyed to row index changes when the
              student moves page, so it encodes nothing about them. */}
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-hover text-[11px] font-semibold text-fg-secondary"
          >
            {row.initials}
          </span>
          <span className="min-w-0">
            <Link
              href={`/students/${row.studentId}`}
              className="block truncate font-medium leading-[1.25] text-fg hover:text-brand-text"
            >
              {row.studentName}
            </Link>
            {/* The design prints "ID: PAY-2026-0142" under the name. There is no
                such identifier: the payment's id is a UUID nobody quotes, and
                receipt_number is only assigned when a receipt is issued. The
                receipt number is shown when it exists, and nothing is invented
                when it does not. */}
            <span className="hs-num block truncate text-[11px] leading-[1.3] text-fg-tertiary">
              {row.receiptId ? `Receipt ${row.receiptId}` : 'No receipt issued'}
            </span>
          </span>
        </div>
      </td>

      <td className={cell}>
        {row.room ? (
          <>
            <span className="hs-num inline-block rounded-lg border border-hairline bg-surface-hover px-[7px] py-[2px] text-[11.5px] font-semibold text-fg">
              {row.room}
            </span>
            {row.roomMeta && (
              <span className="mt-[3px] block text-[10.5px] text-fg-tertiary">{row.roomMeta}</span>
            )}
          </>
        ) : (
          <span className="text-[11.5px] text-fg-tertiary">No room</span>
        )}
      </td>

      <td className={cn(cell, 'hs-num text-fg-secondary')}>{row.monthLabel}</td>

      <td className={cn(cell, 'text-end')}>
        <span className="hs-num block">
          <span className="text-[11px] text-fg-tertiary">PKR </span>
          <b className="font-semibold text-fg">{formatAmount(row.rentTotal)}</b>
        </span>
        {/*
         * Mess: absent, or included and possibly zero-rated. The API keeps NULL
         * and 0.00 apart (migration 014) and so does this line — "Mess not
         * included" and "+ 0 mess" are different answers to a warden asking why
         * two students on the same floor are billed differently.
         */}
        {row.messFee === null ? (
          <span className="mt-[3px] block text-[11px] text-fg-tertiary">Mess not included</span>
        ) : (
          <span className="hs-num mt-[3px] block text-[11px] text-fg-tertiary">
            {formatAmount(row.rentOnly)} + {formatAmount(row.messFee)} mess
          </span>
        )}
      </td>

      <td className={cn(cell, 'hs-num text-end text-fg-secondary')}>
        {row.concession > 0 ? formatAmount(row.concession) : '—'}
      </td>

      <td className={cn(cell, 'text-end')}>
        <span className="hs-num block text-fg-secondary">
          {row.extraCharges > 0 ? formatAmount(row.extraCharges) : '0'}
        </span>
        {row.extraLabel && (
          <span className="mt-[3px] block text-[11px] text-fg-tertiary">{row.extraLabel}</span>
        )}
      </td>

      <td className={cn(cell, 'hs-num text-end font-semibold text-fg')}>
        <span className="text-[11px] font-normal text-fg-tertiary">PKR </span>
        {formatAmount(row.paid)}
      </td>

      <td className={cn(cell, 'hs-num text-end')}>
        {row.unpaid > 0 ? (
          <span
            className={cn(
              'font-semibold',
              // Red only once it is late. An unpaid row inside its own month is
              // ordinary business; the same row next month is a debt.
              row.derived === 'overdue' ? 'text-negative' : 'text-attention',
            )}
          >
            <span className="text-[11px] font-normal text-fg-tertiary">PKR </span>
            {formatAmount(row.unpaid)}
          </span>
        ) : (
          <span className="text-fg-tertiary">—</span>
        )}
      </td>

      <td className={cell}>
        {row.method ? (
          <span className="inline-block rounded-full border border-hairline bg-surface-hover px-[9px] py-[2.5px] text-[11px] font-medium text-fg-secondary">
            {row.method}
          </span>
        ) : (
          <span className="text-[11px] text-fg-tertiary">Not recorded</span>
        )}
      </td>

      <td className={cell}>
        <span
          className={cn(
            'inline-flex items-center gap-[6px] rounded-full border px-[9px] py-[3px] text-[11px] font-semibold',
            STATUS_PILL[row.derived],
          )}
        >
          <span className="size-[5px] rounded-full bg-current" aria-hidden />
          {row.derivedLabel}
        </span>
      </td>

      {/*
       * Two actions, not the design's four. Receipt and View are real: the
       * receipt endpoint renders a PDF on demand, and the student record exists.
       * Edit has no payment-edit screen behind it and "More" has no menu, so both
       * are absent — twenty-five rows of two dead controls is fifty controls that
       * teach the operator this screen is broken.
       */}
      <td className={cn(cell, 'sticky end-0 border-s border-hairline bg-surface text-end')}>
        <div className="inline-flex gap-1.5">
          {/* A plain anchor, not a Link: this is a route handler streaming a
              PDF, and the client router would try to treat the response as a
              page. Opens in a new tab so the ledger — with its month, tab,
              search and page — is still there when the receipt is closed. */}
          <a
            href={`/payments/${row.id}/receipt`}
            target="_blank"
            rel="noopener"
            title={`Receipt for ${row.studentName}`}
            className={ROW_ACTION}
          >
            <Receipt className="size-[14px]" aria-hidden />
            <span className="sr-only">Open receipt for {row.studentName}</span>
          </a>
          <Link
            href={`/students/${row.studentId}`}
            title={`Open ${row.studentName}'s record`}
            className={ROW_ACTION}
          >
            <Eye className="size-[14px]" aria-hidden />
            <span className="sr-only">Open {row.studentName}&rsquo;s record</span>
          </Link>
        </div>
      </td>
    </tr>
  );
}

/**
 * A sortable column header.
 *
 * A link, so the sort is in the URL and survives a refresh like every other piece
 * of ledger state. `aria-sort` marks the sorted column — without it a screen
 * reader user is told the order by an arrow glyph they cannot see.
 */
function SortableHead({
  column,
  view,
  numeric,
  className,
  children,
}: {
  column: SortKey;
  view: LedgerView;
  numeric?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const active = view.sort === column;
  // Clicking the sorted column flips it; clicking any other starts ascending,
  // which is what "sort by this" means before you have an opinion about it.
  const nextDir = active && view.dir === 'asc' ? 'desc' : 'asc';

  const params = new URLSearchParams({ month: view.month });
  if (view.tab !== 'all') params.set('tab', view.tab);
  if (view.q) params.set('q', view.q);
  if (column !== 'room' || nextDir !== 'asc') {
    params.set('sort', column);
    if (nextDir !== 'asc') params.set('dir', nextDir);
  }
  const Arrow = view.dir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={active ? (view.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(HEAD, numeric && 'text-end', className)}
    >
      <Link
        href={`/payments?${params.toString()}`}
        className={cn(
          'inline-flex items-center gap-[5px] transition-colors duration-fast ease-standard hover:text-fg-secondary',
          numeric && 'flex-row-reverse',
          active && 'text-fg-secondary',
        )}
      >
        {children}
        {active && <Arrow className="size-[12px]" aria-hidden />}
      </Link>
    </th>
  );
}
