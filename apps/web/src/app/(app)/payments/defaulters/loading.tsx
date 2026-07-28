import { HeaderSkeleton, HeroPanelSkeleton, LoadingLabel, TableSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      <LoadingLabel label="Loading defaulters" />
      <HeaderSkeleton />
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <HeroPanelSkeleton className="lg:col-span-2" />
      </div>
      {/* Column weights match the seven real columns, so nothing re-flows on arrival (§10). */}
      <TableSkeleton rows={8} columns={[3, 1, 2, 2, 2, 2, 1.5]} />
    </>
  );
}
