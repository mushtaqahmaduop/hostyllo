import { HeaderSkeleton, HeroPanelSkeleton, LoadingLabel, TableSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      <LoadingLabel label="Loading student" />
      <HeaderSkeleton />
      <div className="mb-8">
        <HeroPanelSkeleton />
      </div>
      <TableSkeleton rows={4} columns={[2, 2, 2, 1.5]} />
    </>
  );
}
