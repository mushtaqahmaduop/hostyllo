import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Data table — docs/15_UI_SPEC_v1.md §7.4, "the workhorse".
 *
 * Tables are the primary surface for hostel ops, not charts (§8), so this is the component the
 * rest of the system is subordinate to. The rules it encodes:
 *
 *   - No zebra striping (§16.8). Zebra plus status tints is mud, and status tints have to win.
 *   - Hairline dividers, no shadow. Structure comes from 1px rules and spacing (§2 Law 3).
 *   - Row height follows the app's density mode, not a prop (`--hs-row-h`, base.css).
 *   - The page never scrolls sideways; the table scrolls inside its own container (§11).
 *   - Numeric columns are right-aligned mono with tabular figures (§4.3 Tier 2).
 *
 * Every row reserves a 2px transparent leading border, so turning it indigo (selected) or amber
 * (action-required) changes a colour and never a width — the columns cannot shift under the
 * operator's eye when they tick a checkbox.
 */
function Table({
  className,
  containerClassName,
  stickyFirstColumn,
  minWidth = 720,
  ...props
}: React.ComponentProps<'table'> & {
  containerClassName?: string;
  /** §7.4 / §11: keeps the identifying column visible while wide ledgers scroll. */
  stickyFirstColumn?: boolean;
  minWidth?: number;
}) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        'relative w-full overflow-x-auto overflow-y-visible rounded-lg border border-hairline bg-surface',
        containerClassName,
      )}
    >
      <table
        data-slot="table"
        data-sticky-first={stickyFirstColumn || undefined}
        style={{ minWidth }}
        className={cn(
          'w-full border-collapse text-body-sm',
          // The sticky column needs its own background or the scrolling cells show through it,
          // and a hairline on the inline-end edge so it reads as a pinned column rather than a
          // rendering artefact.
          stickyFirstColumn && [
            '[&_tbody_td:first-child]:sticky [&_tbody_td:first-child]:start-0 [&_tbody_td:first-child]:z-10',
            '[&_tbody_td:first-child]:bg-surface',
            '[&_thead_th:first-child]:sticky [&_thead_th:first-child]:start-0 [&_thead_th:first-child]:z-30',
            '[&_thead_th:first-child]:bg-surface-sunken',
            '[&_td:first-child]:border-e [&_th:first-child]:border-e [&_td:first-child]:border-e-hairline [&_th:first-child]:border-e-hairline',
          ],
          className,
        )}
        {...props}
      />
    </div>
  );
}

/**
 * Sticky by default. A warden reconciling 80 rows of dues loses the column meanings the moment the
 * header scrolls away, and then reads the wrong figure — which is the failure this whole product
 * exists to prevent.
 */
function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        'sticky top-0 z-20 bg-surface-sunken',
        '[&_tr]:border-b [&_tr]:border-hairline',
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-b-0', className)}
      {...props}
    />
  );
}

/** Totals row. Hairline above, mono figures, never a tinted slab. */
function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t border-hairline-strong font-medium', className)}
      {...props}
    />
  );
}

function TableRow({
  className,
  selected,
  attention,
  ...props
}: React.ComponentProps<'tr'> & {
  /** §7.4: 2px indigo leading bar + brand tint. */
  selected?: boolean;
  /** §7.4: 2px amber leading bar + amber tint. Never a full red row. */
  attention?: boolean;
}) {
  return (
    <tr
      data-slot="table-row"
      data-state={selected ? 'selected' : undefined}
      // The leading bar itself lives in base.css as `.hs-row-threshold` — see the note there for
      // why it is not a Tailwind arbitrary variant.
      data-threshold={selected ? 'brand' : attention ? 'attention' : undefined}
      className={cn(
        'hs-row-threshold border-b border-hairline',
        // §9 micro-interactions: background only, never a transform. `fast` is the nearest motion
        // token to the spec's 120ms — §16.17 forbids a raw duration in a component, and the token
        // scale is the source of truth for values.
        'transition-colors duration-fast ease-standard',
        'hover:bg-surface-hover',
        selected && 'bg-brand-tint',
        attention && 'bg-attention-tint',
        className,
      )}
      {...props}
    />
  );
}

/**
 * `numeric` right-aligns the header so it sits over its own column's digits. `sort` renders the
 * persistent indicator §7.4 asks for and, more importantly, sets `aria-sort` — a sorted table with
 * no `aria-sort` tells a screen-reader user nothing about the order they are reading.
 */
function TableHead({
  className,
  numeric,
  sort,
  children,
  ...props
}: React.ComponentProps<'th'> & {
  numeric?: boolean;
  sort?: 'asc' | 'desc' | 'none';
}) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : sort ? 'none' : undefined}
      className={cn(
        'h-10 whitespace-nowrap px-3 align-middle',
        'text-caption font-semibold text-fg-secondary',
        numeric ? 'text-end' : 'text-start',
        className,
      )}
      {...props}
    >
      {children}
      {sort && sort !== 'none' && (
        <span aria-hidden className="ms-1 inline-block text-fg-tertiary">
          {sort === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  );
}

/**
 * `numeric` is the §4.3 Tier 2 treatment in one prop: mono, tabular, aligned on the end edge so a
 * column of amounts lines up digit for digit and two figures can be compared by shape.
 */
function TableCell({
  className,
  numeric,
  ...props
}: React.ComponentProps<'td'> & { numeric?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'h-[var(--hs-row-h)] px-3 align-middle',
        numeric ? 'text-end font-mono text-mono tabular-nums' : 'text-start',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('px-3 py-2 text-start text-caption text-fg-tertiary', className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
