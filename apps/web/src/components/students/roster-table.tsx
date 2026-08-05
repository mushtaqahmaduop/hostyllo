import Link from 'next/link';
import { ArrowDown, ArrowUp, Eye } from 'lucide-react';

import { formatAmount } from '@/lib/format';
import {
  SORT_LABEL,
  type RosterRow,
  type RosterView,
  type SortKey,
  type StatusKey,
} from '@/lib/students/contract';
import { cn } from '@/lib/utils';

/**
 * The roster table.
 *
 * Ten columns at 1540px, scrolling inside its own frame while the page around it
 * stays put. The identifying column is pinned at the start and the actions are
 * pinned at the end, so the two things an operator needs while reading a wide row
 * — who is this, and what can I do about it — never leave the viewport.
 *
 * Cell padding comes from `--hs-cell-pad-*` rather than a repeated `px-4 py-3`,
 * because it is the single most repeated measurement in the product and the
 * ledger screens have to agree on it to the pixel.
 */

const CELL = 'px-[var(--hs-cell-pad-x)] py-[var(--hs-cell-pad-y)]';

const HEAD = cn(
  CELL,
  'sticky top-0 z-20 whitespace-nowrap bg-surface-sunken text-start align-middle',
  'border-b border-hairline text-[11px] font-semibold uppercase tracking-eyebrow text-fg-tertiary',
);

/**
 * Status → pill treatment.
 *
 * `DESIGN_RULES.md`: "Pills default to grey. Semantic colour only when the state
 * is actionable." So Active — which is nine rows in ten — is grey. The screen
 * sketch tints it green; painting the majority state green spends the eye's
 * attention on the one thing that needs none of it, and leaves the amber row
 * that does need it competing with a field of colour.
 *
 * Cancelling is amber because it *is* actionable: a pending cancellation is a
 * bed about to come free and a confirmation somebody owes. Blacklisted is red
 * for the same reason — it changes what the front desk does when that person
 * walks in.
 */
const STATUS_PILL: Record<StatusKey, string> = {
  active: 'border-hairline bg-surface-hover text-fg-secondary',
  vacating: 'border-attention-border bg-attention-tint text-attention',
  vacated: 'border-hairline bg-surface-hover text-fg-tertiary',
  blacklisted: 'border-negative-border bg-negative-tint text-negative',
};

export function RosterTable({ view }: { view: RosterView }) {
  return (
    <div className="hs-scroll min-h-0 flex-1 overflow-auto rounded-xl border border-hairline bg-surface">
      <table className="w-full min-w-[1540px] border-separate border-spacing-0 text-[13.5px]">
        <caption className="sr-only">
          Students, {view.resultLabel}, sorted by {SORT_LABEL[view.sort]}{' '}
          {view.dir === 'asc' ? 'ascending' : 'descending'}
        </caption>
        <thead>
          <tr>
            <SortableHead column="name" view={view} className="min-w-[200px]">
              Student
            </SortableHead>
            <SortableHead column="room" view={view}>
              Room
            </SortableHead>
            <th scope="col" className={HEAD}>
              Phone / Emergency
            </th>
            <th scope="col" className={HEAD}>
              CNIC
            </th>
            <th scope="col" className={HEAD}>
              Nationality
            </th>
            <th scope="col" className={HEAD}>
              Address
            </th>
            <th scope="col" className={HEAD}>
              Course
            </th>
            <SortableHead column="rent" view={view} numeric>
              Rent + Mess / Mo
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

function Row({ row }: { row: RosterRow }) {
  const cell = cn(CELL, 'border-b border-hairline-soft align-middle whitespace-nowrap');

  return (
    <tr className="transition-colors duration-fast ease-standard hover:bg-surface-hover">
      <td className={cell}>
        <div className="flex items-center gap-[10px]">
          {/*
           * One neutral avatar, not a rotating palette. `DESIGN_RULES.md` bans
           * rainbow tiles outright, and a colour keyed to row index carries no
           * information about the student — it changes when they move page.
           */}
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-hover text-[11px] font-semibold text-fg-secondary"
          >
            {row.initials}
          </span>
          <span className="min-w-0">
            <Link
              href={`/students/${row.id}`}
              className="block truncate font-medium leading-[1.25] text-fg hover:text-brand-text"
            >
              {row.name}
            </Link>
            {row.fatherName && (
              <span className="block truncate text-[11px] leading-[1.3] text-fg-tertiary">
                {row.fatherName}
              </span>
            )}
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
          // Unassigned is a real state with a real consequence — nobody is
          // billed for a bed they were never given — so it says so rather than
          // leaving the cell blank.
          <span className="text-[11.5px] text-fg-tertiary">No room</span>
        )}
      </td>

      <td className={cell}>
        <span className="hs-num block text-[11.5px] text-fg-secondary">{row.phone ?? '—'}</span>
        {row.emergency && (
          <span className="hs-num mt-[3px] block text-[10.5px] text-fg-tertiary">
            {row.emergency}
          </span>
        )}
      </td>

      <td className={cn(cell, 'hs-num text-[11px]')}>
        {row.cnic ? (
          // Masked, always. The real value is behind the audited reveal on the
          // student's own record, which writes an audit_log row naming whoever
          // asked — a roster that printed 25 CNICs at a glance would make that
          // trail meaningless.
          <span className="text-fg-secondary" title="Hidden — open the record to reveal">
            {row.cnic}
          </span>
        ) : (
          <span className="text-fg-tertiary">Not on record</span>
        )}
      </td>

      <td className={cell}>
        {row.nationality ? (
          // Grey, for every nationality. The sketch tints one of them amber;
          // nationality is not an actionable state, and colouring a person's
          // nationality in a list is a line this product does not cross.
          <span className="inline-block rounded-full border border-hairline bg-surface-hover px-[8px] py-[2.5px] text-[11px] font-medium text-fg-secondary">
            {row.nationality}
          </span>
        ) : (
          <span className="text-[11px] text-fg-tertiary">—</span>
        )}
      </td>

      <td className={cn(cell, 'max-w-[150px] overflow-hidden text-ellipsis text-fg-secondary')}>
        {row.address ? <span title={row.address}>{row.address}</span> : '—'}
      </td>

      <td className={cn(cell, 'text-fg-secondary')}>{row.course ?? '—'}</td>

      <td className={cn(cell, 'text-end')}>
        <span className="hs-num block">
          <span className="text-[11px] text-fg-tertiary">PKR </span>
          <b className="font-semibold text-fg">{formatAmount(row.rentTotal)}</b>
        </span>
        {row.messFee === null ? (
          <span className="mt-[3px] block text-[11px] text-fg-tertiary">Mess not included</span>
        ) : (
          <span className="hs-num mt-[3px] block text-[11px] text-fg-tertiary">
            {formatAmount(row.rentOnly)} rent + {formatAmount(row.messFee)} mess
          </span>
        )}
      </td>

      <td className={cell}>
        <span
          className={cn(
            'inline-flex items-center gap-[6px] rounded-full border px-[9px] py-[3px] text-[11px] font-semibold',
            STATUS_PILL[row.status],
          )}
        >
          <span className="size-[5px] rounded-full bg-current" aria-hidden />
          {row.statusLabel}
        </span>
      </td>

      {/*
       * One action, not the sketch's four. View is the only one of them that has
       * somewhere to go today: there is no edit form, no shift-room flow and no
       * delete confirmation on the web app yet. Three dead buttons on every row
       * would be seventy-five controls that do nothing, and an operator who
       * clicks one and gets nothing stops trusting the other.
       */}
      <td
        className={cn(cell, 'sticky end-0 border-s border-hairline bg-surface text-end')}
      >
        <Link
          href={`/students/${row.id}`}
          title={`Open ${row.name}'s record`}
          className="inline-grid size-[27px] place-items-center rounded-lg border border-hairline bg-surface-hover text-fg-secondary transition-colors duration-fast ease-standard hover:border-hairline-strong hover:text-fg"
        >
          <Eye className="size-[14px]" aria-hidden />
          <span className="sr-only">Open {row.name}&rsquo;s record</span>
        </Link>
      </td>
    </tr>
  );
}

/**
 * A sortable column header.
 *
 * A link, so sorting is in the URL and survives a refresh like every other piece
 * of roster state. `aria-sort` is set on the column that is actually sorted —
 * without it a screen-reader user is told the order by an arrow glyph they
 * cannot see.
 */
function SortableHead({
  column,
  view,
  numeric,
  className,
  children,
}: {
  column: SortKey;
  view: RosterView;
  numeric?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const active = view.sort === column;
  // Clicking the sorted column flips it; clicking any other starts ascending,
  // which is what "sort by this" means before you have an opinion about it.
  const nextDir = active && view.dir === 'asc' ? 'desc' : 'asc';

  const params = new URLSearchParams();
  if (view.tab !== 'active') params.set('tab', view.tab);
  if (view.q) params.set('q', view.q);
  if (column !== 'room' || nextDir !== 'asc') {
    params.set('sort', column);
    if (nextDir !== 'asc') params.set('dir', nextDir);
  }
  const search = params.toString();
  const Arrow = view.dir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={active ? (view.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(HEAD, numeric && 'text-end', className)}
    >
      <Link
        href={search ? `/students?${search}` : '/students'}
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
