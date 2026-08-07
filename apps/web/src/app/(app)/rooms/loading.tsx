import { LoadingLabel } from '@/components/skeletons';
import { Skeleton } from '@/components/ui-kit/skeleton';

/**
 * Matches the board's real geometry: title row, five KPI cards, toolbar, a card
 * grid on the same auto-fill track as the real one, and the rail at the width it
 * actually appears. The old skeleton drew a hero panel this screen no longer has,
 * so the page jumped the moment data landed.
 */
export default function Loading() {
  return (
    <div aria-hidden className="flex h-full flex-col">
      <LoadingLabel label="Loading rooms" />

      <div className="mb-3 flex shrink-0 items-center justify-between gap-[8px]">
        <Skeleton className="h-[18px] w-[90px]" />
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-[11px] md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[96px] rounded-xl" />
        ))}
      </div>

      <div className="mt-3 flex min-h-0 flex-1 gap-[13px]">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="mb-3 flex shrink-0 flex-col gap-[11px]">
            <div className="flex flex-wrap items-center gap-[11px]">
              <Skeleton className="h-[var(--hs-control-h)] min-w-[260px] flex-1 rounded-xl" />
              <Skeleton className="h-[var(--hs-control-h)] w-[430px] rounded-xl" />
            </div>
            <Skeleton className="h-[14px] w-[280px]" />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="grid gap-[11px] [grid-template-columns:repeat(auto-fill,minmax(272px,1fr))]">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-[268px] rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        <div className="hidden w-[264px] shrink-0 flex-col gap-[11px] xl:flex">
          <Skeleton className="h-[220px] rounded-xl" />
          <Skeleton className="h-[180px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
