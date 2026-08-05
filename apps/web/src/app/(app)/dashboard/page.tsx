import { redirect } from 'next/navigation';
import { Info } from 'lucide-react';

import { ApiError } from '@/lib/api';
import { sessionUser } from '@/lib/session';
import { getDashboardView } from '@/lib/dashboard/presenter';
import { ErrorState } from '@/components/patterns/states';
import { BedOccupancyCard, MethodCard, RoomTypeCard } from '@/components/dashboard/donuts';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { MonthlyOverview } from '@/components/dashboard/monthly-overview';
import { PendingPayments } from '@/components/dashboard/pending-payments';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RevenueExpenses } from '@/components/dashboard/revenue-expenses';
import { SeatAvailability } from '@/components/dashboard/seat-availability';
import { TodayGlance } from '@/components/dashboard/today-glance';
import { UpcomingReminders } from '@/components/dashboard/upcoming-reminders';

export const metadata = { title: 'Dashboard' };

/**
 * The dashboard — the owner's redesign, four rows.
 *
 *   1  six KPIs with sparklines
 *   2  monthly overview · seat availability · today at a glance
 *   3  room types · payment methods · bed occupancy · quick actions
 *   4  revenue vs expenses · pending payments · upcoming reminders
 *
 * Every row declares `min-w-[var(--hs-content-min)]` — 1180px — so they all
 * scroll together as one object below that width. Set on the rows rather than on
 * the scroll container because a `min-width` on the container would also stop
 * the header above from tracking the same horizontal scroll, and a header that
 * slides out of register with the content it labels is worse than no header.
 *
 * The page fetches nothing itself. `getDashboardView` owns every figure, which
 * is what stops the KPI strip and the cards below it from disagreeing about the
 * same number.
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
      {view.hasUnverifiedData && <UnverifiedNotice />}

      {/* ROW 1 · six KPIs */}
      <KpiStrip kpis={view.kpis.data} />

      {/* ROW 2 · overview · seats · today */}
      <div className="grid min-w-[var(--hs-content-min)] grid-cols-[minmax(0,2fr)_minmax(0,1.42fr)_minmax(0,.94fr)] items-stretch gap-4">
        <MonthlyOverview series={view.series.data} />
        <SeatAvailability seatMap={view.seatMap.data} />
        <TodayGlance items={view.glance.data} />
      </div>

      {/* ROW 3 · four square cards */}
      <div className="grid min-w-[var(--hs-content-min)] grid-cols-4 items-stretch gap-4">
        <RoomTypeCard types={view.roomTypes.data} />
        <MethodCard methods={view.methods.data} />
        <BedOccupancyCard segments={view.beds.data} />
        <QuickActions />
      </div>

      {/* ROW 4 · bars · pending · reminders */}
      <div className="grid min-w-[var(--hs-content-min)] grid-cols-[minmax(0,1fr)_minmax(0,1.34fr)_minmax(0,1.16fr)] items-stretch gap-4">
        <RevenueExpenses series={view.series.data} />
        <PendingPayments
          rows={view.pending.data}
          duesTotal={view.totals.dues}
          dueCount={view.totals.dueStudents}
        />
        <UpcomingReminders reminders={view.reminders.data} />
      </div>
    </div>
  );
}

/**
 * One line, stated once, at the top.
 *
 * Six of the eleven widgets are drawing figures no endpoint produces yet. A
 * manager reconciling cash has to be able to tell those apart from the four that
 * are real, and the honest place to say so is before they read anything — not in
 * a footnote under a chart they have already believed.
 *
 * It disappears on its own: `hasUnverifiedData` is computed from the sections'
 * own provenance, so the last endpoint to land removes this banner without
 * anyone remembering to.
 */
function UnverifiedNotice() {
  return (
    <p className="flex min-w-[var(--hs-content-min)] items-center gap-2 rounded-md border border-attention-border bg-attention-tint px-3 py-2 text-body-sm text-fg">
      <Info className="size-4 shrink-0 text-attention" aria-hidden />
      <span>
        <strong className="font-semibold">Some figures are illustrative.</strong> Revenue, expenses,
        dues, students, beds and the pending list are live. The month series is projected from those
        totals; the seat map, room-type split, payment-method split, today&rsquo;s counters and
        reminders have no data source yet.
      </span>
    </p>
  );
}
