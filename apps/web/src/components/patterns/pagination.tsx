import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Offset pagination — docs/15_UI_SPEC_v1.md §7.4.
 *
 * "Infinite scroll is banned in ledger views (breaks reconciliation)." That is the whole reason
 * this component exists rather than a scroll listener: an operator reconciling a month's takings
 * needs to know they have seen page 3 of 7, and needs the same rows to be on page 3 tomorrow.
 *
 * Rendered as links, so pages are shareable and the back button works. `params` carries the
 * current filters forward — losing them on page 2 is the classic annoyance, and here it would mean
 * silently paging through the wrong month.
 */
export function Pagination({
  basePath,
  params,
  offset,
  shown,
  total,
  pageSize,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  offset: number;
  /** Rows on the current page. */
  shown: number;
  total: number;
  pageSize: number;
}) {
  if (total <= pageSize) return null;

  const href = (nextOffset: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (nextOffset > 0) q.set('offset', String(nextOffset));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const base =
    'inline-flex h-[var(--hs-control-h)] items-center rounded-md border px-3 text-body-sm transition-colors duration-instant ease-standard';
  const atStart = offset === 0;
  const atEnd = offset + shown >= total;

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center gap-3">
      {atStart ? (
        // Rendered, disabled, and still in the tab order's shape — a control that disappears at
        // the boundary shifts the two beside it and makes the operator re-aim mid-task.
        <span aria-disabled="true" className={cn(base, 'border-hairline text-fg-disabled')}>
          Previous
        </span>
      ) : (
        <Link
          href={href(offset - pageSize)}
          className={cn(base, 'border-hairline-strong text-fg hover:bg-surface-hover')}
        >
          Previous
        </Link>
      )}

      {/* §7.4: "plus a total count". Tabular so the figures do not jitter as pages change. */}
      <span className="text-body-sm tabular-nums text-fg-secondary">
        {total === 0 ? 0 : offset + 1}–{offset + shown} of {total}
      </span>

      {atEnd ? (
        <span aria-disabled="true" className={cn(base, 'border-hairline text-fg-disabled')}>
          Next
        </span>
      ) : (
        <Link
          href={href(offset + pageSize)}
          className={cn(base, 'border-hairline-strong text-fg hover:bg-surface-hover')}
        >
          Next
        </Link>
      )}
    </nav>
  );
}
