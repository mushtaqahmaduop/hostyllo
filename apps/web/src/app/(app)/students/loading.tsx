import { LoadingLabel } from '@/components/skeletons';
import { Skeleton } from '@/components/ui-kit/skeleton';

/**
 * Matches the roster's real geometry: action row, toolbar, ten-column table,
 * pagination. The column widths are the real ones, so nothing shifts sideways
 * when the data lands — a skeleton whose blocks sit where the content will not
 * is worse than none.
 */
const COLUMN_WIDTHS = [180, 90, 130, 110, 90, 140, 130, 120, 90, 60];

export default function Loading() {
  return (
    <div aria-hidden className="flex h-full flex-col">
      <LoadingLabel label="Loading students" />

      <div className="mb-3 flex shrink-0 justify-end gap-[8px]">
        <Skeleton className="h-[var(--hs-control-h)] w-[120px] rounded-lg" />
        <Skeleton className="h-[var(--hs-control-h)] w-[130px] rounded-lg" />
      </div>

      <div className="mb-3 flex shrink-0 flex-col gap-[11px]">
        <div className="flex flex-wrap items-center gap-[11px]">
          <Skeleton className="h-[var(--hs-control-h)] min-w-[260px] flex-1 rounded-xl" />
          <Skeleton className="h-[var(--hs-control-h)] w-[380px] rounded-xl" />
          <Skeleton className="h-[var(--hs-control-h)] w-[130px] rounded-xl" />
        </div>
        <Skeleton className="h-[14px] w-[280px]" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-hairline bg-surface">
        <div className="flex gap-4 border-b border-hairline bg-surface-sunken px-[var(--hs-cell-pad-x)] py-[var(--hs-cell-pad-y)]">
          {COLUMN_WIDTHS.map((width, i) => (
            <Skeleton key={i} className="h-[11px]" style={{ width }} />
          ))}
        </div>
        {Array.from({ length: 10 }, (_, row) => (
          <div
            key={row}
            className="flex items-center gap-4 border-b border-hairline-soft px-[var(--hs-cell-pad-x)] py-[var(--hs-cell-pad-y)]"
          >
            {/* The first cell is an avatar over two lines of text, which is what
                sets the row height on this screen. */}
            <div className="flex items-center gap-[10px]" style={{ width: COLUMN_WIDTHS[0] }}>
              <Skeleton className="size-7 shrink-0 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-[13px] w-full" />
                <Skeleton className="mt-[5px] h-[10px] w-2/3" />
              </div>
            </div>
            {COLUMN_WIDTHS.slice(1).map((width, i) => (
              <Skeleton key={i} className="h-[13px]" style={{ width }} />
            ))}
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between px-[2px] pb-[14px] pt-[11px]">
        <Skeleton className="h-[14px] w-[160px]" />
        <Skeleton className="h-[30px] w-[260px] rounded-lg" />
      </div>
    </div>
  );
}
