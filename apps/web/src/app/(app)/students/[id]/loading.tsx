import { HeadingSkeleton, StatGridSkeleton, TableSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      <HeadingSkeleton />
      <StatGridSkeleton count={3} />
      <TableSkeleton rows={4} label="Loading student" />
    </>
  );
}
