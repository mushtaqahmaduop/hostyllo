import * as React from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui-kit/button';
import { Skeleton } from '@/components/ui-kit/skeleton';
import { cn } from '@/lib/utils';

/**
 * The six states — docs/15_UI_SPEC_v1.md §10.
 *
 * "loading · empty (never used) · empty (filtered to zero) · error · offline/stale · populated."
 *
 * They live together in one file on purpose. The failure this prevents is the common one: a screen
 * ships with `populated` and `loading`, and the other four are discovered in production by the
 * person the empty screen happened to. Having them side by side makes it obvious when one is
 * missing, and makes it obvious that first-run empty and filtered-to-zero need *different copy* —
 * telling someone with 400 students "No students yet, add your first" because their filter matched
 * nothing is the specific bug §10 is written to stop.
 */

/**
 * First run. Brass rule, Newsreader headline, one sentence, one action.
 * The copy is an invitation, never an apology (§14).
 */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start rounded-lg border border-hairline bg-surface px-6 py-12',
        className,
      )}
    >
      <span className="hs-rule" aria-hidden />
      <h2 className="mt-4 font-display text-h1 font-normal text-fg">{title}</h2>
      <p className="mt-2 max-w-[52ch] text-body text-fg-secondary">{body}</p>
      {action && (
        <Button asChild variant="primary" className="mt-6">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

/**
 * Filtered to zero. Different copy, and a way back — never the first-run illustration (§10).
 * `clearHref` is the same page with the filters stripped, so it works without JavaScript.
 */
export function FilteredEmptyState({
  clearHref,
  what = 'results',
  className,
}: {
  clearHref: string;
  /** What was being looked for: "payments", "students". */
  what?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start rounded-lg border border-hairline bg-surface px-6 py-12',
        className,
      )}
    >
      <p className="text-body text-fg-secondary">No {what} match these filters.</p>
      <Button asChild variant="secondary" className="mt-4">
        <Link href={clearHref}>Clear filters</Link>
      </Button>
    </div>
  );
}

/**
 * Error. States what failed and the next step (§10). The raw detail goes behind a disclosure for
 * support rather than in the operator's face — a stack trace tells them nothing they can act on,
 * but it is the first thing support will ask for.
 */
export function ErrorState({
  title = 'Something went wrong',
  body,
  detail,
  retryHref,
  className,
}: {
  title?: string;
  /** "Couldn't load payments. Check your connection and try again." */
  body: string;
  detail?: string;
  retryHref?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      data-state="attention"
      className={cn('hs-threshold rounded-lg border border-hairline bg-surface p-6', className)}
    >
      <h2 className="text-h3 font-semibold text-fg">{title}</h2>
      <p className="mt-2 max-w-[52ch] text-body text-fg-secondary">{body}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {retryHref && (
          <Button asChild variant="secondary">
            <Link href={retryHref}>Try again</Link>
          </Button>
        )}
        {detail && (
          <details className="text-body-sm text-fg-tertiary">
            <summary className="cursor-pointer select-none">Details</summary>
            <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap font-mono text-mono-sm">
              {detail}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Offline / stale — §10 calls this "a primary state, not an edge case", and on the connectivity
 * this product runs over that is simply true. A slim amber strip, never a modal: the data on
 * screen is still the best available and the operator can keep working with it, they just need to
 * know how old it is.
 */
export function StaleBanner({ asOf, className }: { asOf: string; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-2 border-b border-hairline bg-attention-tint px-6 py-2',
        'text-body-sm text-attention-text',
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-attention" />
      Showing data from {asOf} · reconnecting
    </div>
  );
}

/**
 * Loading. §10: "skeletons matching final geometry exactly (same row height, same column widths).
 * No spinners for content areas." A spinner says "wait"; a skeleton says "here is the shape of
 * what is coming", which is the difference between a page that feels slow and one that feels
 * heavy.
 *
 * Row height comes from `--hs-row-h`, the same variable the real table reads, so the skeleton
 * cannot drift out of step with the density mode.
 */
export function TableSkeleton({
  rows = 8,
  columns,
  className,
}: {
  rows?: number;
  /** Relative column widths, e.g. `[3, 2, 2, 1]`. Match the real table's columns. */
  columns: number[];
  className?: string;
}) {
  return (
    <div
      aria-busy
      aria-label="Loading"
      className={cn('overflow-hidden rounded-lg border border-hairline bg-surface', className)}
    >
      <div className="flex h-10 items-center gap-3 border-b border-hairline bg-surface-sunken px-3">
        {columns.map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ flex: w }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="flex items-center gap-3 border-b border-hairline px-3 last:border-b-0"
          style={{ height: 'var(--hs-row-h)' }}
        >
          {columns.map((w, i) => (
            <Skeleton key={i} className="h-3.5" style={{ flex: w }} />
          ))}
        </div>
      ))}
    </div>
  );
}
