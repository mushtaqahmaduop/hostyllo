import { redirect } from 'next/navigation';

import { ApiError } from '@/lib/api';
import { sessionUser } from '@/lib/session';
import { getDashboardView } from '@/lib/dashboard/presenter';
import { ErrorState } from '@/components/patterns/states';
import { BedOccupancyCard, MethodCard, RoomTypeCard } from '@/components/dashboard/donuts';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { MonthlyOverview } from '@/components/dashboard/monthly-overview';
import { NeedsAttention } from '@/components/dashboard/needs-attention';
import { PendingPayments } from '@/components/dashboard/pending-payments';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RevenueExpenses } from '@/components/dashboard/revenue-expenses';
import { SeatAvailability } from '@/components/dashboard/seat-availability';
import { TodayGlance } from '@/components/dashboard/today-glance';

export const metadata = { title: 'Dashboard' };

/**
 * The dashboard — four rows.
 *
 *   1  six KPIs with real sparklines
 *   2  monthly overview · seat availability · today at a glance
 *   3  room types · payment methods · bed occupancy · quick actions
 *   4  revenue vs expenses · pending payments · needs attention
 *
 * ── The layout reflows; it does not scroll sideways ──────────────────────────────────────────
 * Every row here used to declare `min-w-[var(--hs-content-min)]` — a hard 1180px floor. With
 * the sidebar taking ~240px, that overflowed any viewport under about 1420px: on an ordinary
 * 1366px laptop the first KPI card and the left edge of the overview chart were clipped off the
 * screen, and the whole page scrolled horizontally as one block.
 *
 * The floor is gone. Each row is now a responsive grid that drops to fewer columns as space
 * runs out, so the same content reflows instead of being cut. The ratio-based column widths
 * that carried the design's proportions are kept at the widest breakpoint, where there is room
 * to honour them.
 *
 * The page fetches nothing itself. `getDashboardView` owns every figure, which is what stops
 * the KPI strip and the cards below it from disagreeing about the same number. It also owns
 * provenance: a section marked `empty` renders an empty state, and no widget on this page can
 * draw a number the API did not produce.
 */
export default async function DashboardPage() {
  const { name } = await sessionUser();

  let view;
  try {
    view = await getDashboardView(name ?? 'there');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    return (
      <ErrorState
        title="Couldn't load the dashboard"
        body="Check your connection and try again."
        detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
        retryHref="/dashboard"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ROW 1 · six KPIs */}
      <KpiStrip kpis={view.kpis.data} />

      {/* ROW 2 · overview · seats · today */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.42fr)_minmax(0,.94fr)]">
        <MonthlyOverview series={view.series} />
        <SeatAvailability seatMap={view.seatMap} />
        <TodayGlance glance={view.glance} />
      </div>

      {/* ROW 3 · four square cards */}
      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RoomTypeCard types={view.roomTypes} />
        <MethodCard methods={view.methods} />
        <BedOccupancyCard beds={view.beds} />
        <QuickActions />
      </div>

      {/* ROW 4 · bars · pending · needs attention */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.34fr)_minmax(0,1.16fr)]">
        <RevenueExpenses series={view.series} />
        <PendingPayments
          pending={view.pending}
          duesTotal={view.totals.dues}
          dueCount={view.totals.dueStudents}
        />
        <NeedsAttention attention={view.attention} />
      </div>
    </div>
  );
}
