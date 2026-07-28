import {
  HeaderSkeleton,
  HeroPanelSkeleton,
  LoadingLabel,
  SidePanelSkeleton,
} from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      <LoadingLabel label="Loading dashboard" />
      <HeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <HeroPanelSkeleton className="lg:col-span-2" />
        <SidePanelSkeleton />
      </div>
    </>
  );
}
