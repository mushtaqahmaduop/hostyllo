import { HeadingSkeleton, StatGridSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      <HeadingSkeleton />
      <span role="status" className="sr-only">
        Loading dashboard
      </span>
      <StatGridSkeleton />
    </>
  );
}
