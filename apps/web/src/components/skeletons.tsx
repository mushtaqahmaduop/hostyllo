import { Skeleton } from '@/components/ui-kit/skeleton';

/**
 * Loading placeholders (spec §1: "Skeletons not spinners", §4.8).
 *
 * Every screen here is a server component that awaits the API, so Next streams these while the
 * request is in flight. The shapes deliberately match the real layout — a skeleton whose blocks sit
 * where the content will not is worse than none, because the page visibly jumps when it resolves.
 *
 * `aria-hidden` with a single polite live message: a screen reader should hear "Loading" once, not
 * read out two dozen empty boxes.
 */

function Loading({ label }: { label: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}

export function StatGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-hidden
      className="mb-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4">
          <Skeleton className="mb-3 h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8, label }: { rows?: number; label: string }) {
  return (
    <>
      <Loading label={label} />
      <div aria-hidden className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border bg-surface-2 px-3 py-3">
          <Skeleton className="h-3 w-28" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-3 py-4 last:border-b-0">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="hidden h-4 w-20 sm:block" />
          </div>
        ))}
      </div>
    </>
  );
}

export function CardGridSkeleton({ count = 6, label }: { count?: number; label: string }) {
  return (
    <>
      <Loading label={label} />
      <div aria-hidden className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-4">
            <Skeleton className="mb-2 h-5 w-28" />
            <Skeleton className="mb-4 h-3 w-40" />
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(110px,1fr))]">
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

export function HeadingSkeleton() {
  return (
    <div aria-hidden className="mb-6 flex items-baseline gap-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}
