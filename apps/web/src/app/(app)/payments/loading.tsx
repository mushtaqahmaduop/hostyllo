import {
  HeaderSkeleton,
  HeroPanelSkeleton,
  LoadingLabel,
  SidePanelSkeleton,
  TableSkeleton,
} from '@/components/skeletons';

/**
 * Mirrors the real Dues & payments layout exactly — hero panel over two thirds, "Still owing"
 * beside it, then the ledger. The column weights match the seven real columns so the table does
 * not re-flow when the data lands (§10, §11).
 */
export default function Loading() {
  return (
    <>
      <LoadingLabel label="Loading payments" />
      <HeaderSkeleton />
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <HeroPanelSkeleton className="lg:col-span-2" />
        <SidePanelSkeleton />
      </div>
      <TableSkeleton rows={10} columns={[3, 1, 2, 2, 2, 1.5, 2]} />
    </>
  );
}
