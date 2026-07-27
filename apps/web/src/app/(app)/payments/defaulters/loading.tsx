import { HeadingSkeleton, StatGridSkeleton, TableSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      <HeadingSkeleton />
      <StatGridSkeleton count={2} />
      <TableSkeleton label="Loading defaulters" />
    </>
  );
}
