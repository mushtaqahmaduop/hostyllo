import { HeadingSkeleton, StatGridSkeleton, TableSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      <HeadingSkeleton />
      <StatGridSkeleton count={5} />
      <TableSkeleton label="Loading payments" />
    </>
  );
}
