import { HeadingSkeleton, TableSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      <HeadingSkeleton />
      <TableSkeleton label="Loading students" />
    </>
  );
}
