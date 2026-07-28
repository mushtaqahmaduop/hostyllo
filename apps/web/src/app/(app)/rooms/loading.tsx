import { CardGridSkeleton, HeaderSkeleton, HeroPanelSkeleton, LoadingLabel } from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      <LoadingLabel label="Loading rooms" />
      <HeaderSkeleton />
      <div className="mb-8">
        <HeroPanelSkeleton />
      </div>
      <CardGridSkeleton label="Loading rooms" />
    </>
  );
}
