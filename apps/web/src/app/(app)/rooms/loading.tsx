import { CardGridSkeleton, HeadingSkeleton, StatGridSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      <HeadingSkeleton />
      <StatGridSkeleton count={3} />
      <CardGridSkeleton label="Loading rooms" />
    </>
  );
}
