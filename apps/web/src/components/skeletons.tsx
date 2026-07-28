import { Skeleton } from '@/components/ui-kit/skeleton';

/**
 * Loading placeholders — docs/15_UI_SPEC_v1.md §10.
 *
 * Every screen is a server component that awaits the API, so Next streams these while the request
 * is in flight. §10 is strict about the shape: "skeletons matching final geometry exactly (same
 * row height, same column widths)". A skeleton whose blocks sit where the content will not is
 * worse than none, because the page visibly jumps when it resolves — and §11 budgets CLS < 0.05
 * after first paint.
 *
 * The blocks are `aria-hidden` with one polite message beside them: a screen reader should hear
 * "Loading payments" once, not read out two dozen empty boxes.
 */

export function LoadingLabel({ label }: { label: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}

/** Matches `<PageHeader>`: eyebrow, 30/36 display title, optional action. */
export function HeaderSkeleton() {
  return (
    <div aria-hidden className="mb-8 flex items-start gap-6 ps-4">
      <div className="flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-56" />
      </div>
      <Skeleton className="h-[var(--hs-control-h)] w-36" />
    </div>
  );
}

/** Matches `<HeroPanel>` plus its four-item `<StatStrip>`. */
export function HeroPanelSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`rounded-lg border border-hairline bg-surface p-6 ${className ?? ''}`}>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-12 w-64" />
      <div className="my-5 h-px bg-hairline" />
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-2 h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The counterweight panel — Needs-Attention, or the payments page's "Still owing". */
export function SidePanelSkeleton() {
  return (
    <div aria-hidden className="rounded-lg border border-hairline bg-surface p-6">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-4 h-5 w-full" />
      <Skeleton className="mt-2 h-5 w-3/4" />
    </div>
  );
}

/** The rooms grid — bed-occupancy cards. */
export function CardGridSkeleton({ count = 6, label }: { count?: number; label: string }) {
  return (
    <>
      <LoadingLabel label={label} />
      <div
        aria-hidden
        className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]"
      >
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="rounded-lg border border-hairline bg-surface p-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-2 h-3 w-40" />
            <div className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(110px,1fr))]">
              {Array.from({ length: 4 }, (_, j) => (
                <Skeleton key={j} className="h-12" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export { TableSkeleton } from '@/components/patterns/states';
