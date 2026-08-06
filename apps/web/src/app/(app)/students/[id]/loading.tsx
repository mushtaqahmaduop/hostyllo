import { HeaderSkeleton, HeroPanelSkeleton, LoadingLabel } from '@/components/skeletons';
import { TableSkeleton } from '@/components/patterns/states';
import { Skeleton } from '@/components/ui-kit/skeleton';

/**
 * Geometry-matched to the record it replaces: hero, four stat tiles, two panels,
 * then the ledger. A skeleton whose shape differs from the page it precedes makes
 * the content appear to jump on arrival, which reads as a bug rather than a load.
 */
export default function Loading() {
  return (
    <>
      <LoadingLabel label="Loading student" />
      <HeaderSkeleton />

      <HeroPanelSkeleton />

      <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-hairline bg-surface-sunken p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-28" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="rounded-xl border border-hairline bg-surface p-4">
            <Skeleton className="h-3 w-32" />
            {Array.from({ length: 6 }, (_, j) => (
              <Skeleton key={j} className="mt-4 h-4 w-full" />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <TableSkeleton rows={4} columns={[2, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5]} />
      </div>
    </>
  );
}
