import { LoadingLabel } from '@/components/skeletons';
import { Skeleton } from '@/components/ui-kit/skeleton';

/**
 * Matches the ledger's real geometry: title row, five KPI cards, toolbar,
 * eleven-column table, pagination, and the rail at the size it actually appears.
 * The column widths are the real ones, so nothing shifts sideways when the data
 * lands — a skeleton whose blocks sit where the content will not is worse than
 * no skeleton at all.
 */
const COLUMN_WIDTHS = [170, 80, 70, 110, 60, 70, 90, 90, 80, 80, 60];

export default function Loading() {
  return (
    <div aria-hidden className="flex h-full flex-col">
      <LoadingLabel label="Loading payments" />

      <div className="mb-3 flex shrink-0 items-center justify-between gap-[8px]">
        <Skeleton className="h-[18px] w-[190px]" />
        <Skeleton className="h-[var(--hs-control-h)] w-[150px] rounded-lg" />
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
              <Skeleton className="h-[var(--hs-control-h)] w-[130px] rounded-xl" />
              <Skeleton className="h-[var(--hs-control-h)] min-w-[240px] flex-1 rounded-xl" />
              <Skeleton className="h-[var(--hs-control-h)] w-[430px] rounded-xl" />
            </div>
            <Skeleton className="h-[14px] w-[300px]" />
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
                {/* Avatar over two lines of text — the cell that sets the row
                    height on this screen, exactly as on the roster. */}
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

        <Skeleton className="hidden h-[280px] w-[264px] shrink-0 rounded-xl xl:block" />
      </div>
    </div>
  );
}
