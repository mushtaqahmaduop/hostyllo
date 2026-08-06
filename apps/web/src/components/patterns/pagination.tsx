import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Offset pagination — numbered pages, per the redesign's ledger screens.
 *
 * "Infinite scroll is banned in ledger views (breaks reconciliation)." That is
 * the whole reason this component exists rather than a scroll listener: an
 * operator reconciling a month's takings needs to know they have seen page 3 of
 * 7, and needs the same rows to be on page 3 tomorrow.
 *
 * Rendered as links, so pages are shareable and the back button works. `params`
 * carries the current filters forward — losing them on page 2 is the classic
 * annoyance, and here it would mean silently paging through the wrong month.
 *
 * The window is at most seven numbers around the current page. A hostel with
 * 2,000 students would otherwise draw eighty buttons, and the first and last are
 * always present so "jump to the end" never needs a scroll.
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

  const pageCount = Math.ceil(total / pageSize);
  const current = Math.floor(offset / pageSize) + 1;

  const href = (page: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    const nextOffset = (page - 1) * pageSize;
    if (nextOffset > 0) q.set('offset', String(nextOffset));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const box =
    'inline-flex h-[30px] items-center justify-center rounded-lg border text-[12px] transition-colors duration-fast ease-standard';
  const step = cn(box, 'px-[11px]');
  const idle = 'border-hairline bg-surface text-fg-secondary hover:border-hairline-strong hover:text-fg';
  // Rendered but inert at the boundary, in the same shape — a control that
  // vanishes shifts the ones beside it and makes the operator re-aim mid-task.
  const dead = 'border-hairline bg-surface text-fg-disabled';

  return (
    <nav
      aria-label="Pagination"
      className="flex shrink-0 items-center justify-between gap-3 px-[2px] pb-[14px] pt-[11px]"
    >
      <span className="text-body-sm text-fg-tertiary">
        Showing <span className="hs-num">{total === 0 ? 0 : offset + 1}</span>–
        <span className="hs-num">{offset + shown}</span> of <span className="hs-num">{total}</span>
      </span>

      <div className="flex items-center gap-[5px]">
        {current === 1 ? (
          <span aria-disabled="true" className={cn(step, dead)}>
            Previous
          </span>
        ) : (
          <Link href={href(current - 1)} className={cn(step, idle)} rel="prev">
            Previous
          </Link>
        )}

        {pageWindow(current, pageCount).map((page, i) =>
          page === null ? (
            <span key={`gap-${i}`} aria-hidden className="px-[4px] text-body-sm text-fg-tertiary">
              …
            </span>
          ) : page === current ? (
            <span
              key={page}
              aria-current="page"
              className={cn(
                box,
                'hs-num min-w-[30px] border-brand-border bg-brand-tint px-[8px] font-semibold text-brand-text',
              )}
            >
              {page}
            </span>
          ) : (
            <Link
              key={page}
              href={href(page)}
              aria-label={`Page ${page}`}
              className={cn(box, idle, 'hs-num min-w-[30px] px-[8px]')}
            >
              {page}
            </Link>
          ),
        )}

        {current === pageCount ? (
          <span aria-disabled="true" className={cn(step, dead)}>
            Next
          </span>
        ) : (
          <Link href={href(current + 1)} className={cn(step, idle)} rel="next">
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}

/**
 * The page numbers to draw: first, last, the current page and its neighbours,
 * with `null` standing for an elision. Never more than seven slots, so the
 * control keeps one width regardless of how many students the hostel has.
 */
function pageWindow(current: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);

  const pages = new Set([1, count, current, current - 1, current + 1]);
  // Keep the run beside the ends dense, so page 2 is one click from page 1
  // rather than hidden behind an ellipsis.
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= count - 2) [count - 3, count - 2, count - 1].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);

  const out: (number | null)[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) out.push(null);
    out.push(page);
    previous = page;
  }
  return out;
}
