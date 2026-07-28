import { HeaderSkeleton, LoadingLabel, TableSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      <LoadingLabel label="Loading students" />
      <HeaderSkeleton />
      {/* Column weights match the six real columns, so nothing re-flows on arrival (§10). */}
      <TableSkeleton rows={10} columns={[3, 2, 2, 2, 2, 1.5]} />
    </>
  );
}
