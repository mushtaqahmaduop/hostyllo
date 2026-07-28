import Link from 'next/link';
import { redirect } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { canOperate } from '@/lib/session';
import { PageHeader } from '@/components/patterns/page-header';
import { HeroPanel } from '@/components/patterns/hero-panel';
import { StatStrip, StatItem } from '@/components/patterns/stat-strip';
import { NeedsAttention, type AttentionItem } from '@/components/patterns/needs-attention';
import { Money, Num, Pct } from '@/components/patterns/money';
import { ErrorState } from '@/components/patterns/states';
import { Button } from '@/components/ui-kit/button';

export const metadata = { title: 'Dashboard' };

/** Shapes come from GET /dashboard/stats and /dashboard/alerts (API spec, Module 6). */
type Stats = {
  month: string;
  activeStudents: number | string;
  occupiedBeds: number | string;
  totalBeds: number | string;
  occupancyPct: number | string;
  revenuePkr: number | string;
  pendingPkr: number | string;
  expensesPkr: number | string;
  netFundPkr: number | string;
};

type Alerts = {
  pendingPaymentsCount: number;
  pendingVoidRequests: number;
  openMaintenance: number;
  unresolvedComplaints: number;
  occupancyBelowThreshold: boolean;
  activeNotices: unknown[];
};

/**
 * The dashboard — docs/15_UI_SPEC_v1.md §2.
 *
 * "A hostel manager opens HOSTYLLO to answer four questions in under five seconds: Did money come
 * in? Who owes me? Is any room empty? What breaks today?"
 *
 * So: one hero figure (money collected), a hairline strip of the three supporting answers, and the
 * Needs-Attention panel beside it. Not six equal cards — §1's kill list names "a card per metric,
 * six across" for fragmenting the eye, and the previous version of this screen was exactly that.
 *
 * There is deliberately no greeting. §16.5: "the hero is the money figure, not a greeting."
 */
export default async function DashboardPage() {
  let stats: Stats;
  let alerts: Alerts;

  try {
    // Fetched together: both are small aggregates and the page is useless with only one.
    [stats, alerts] = await Promise.all([
      api<Stats>('/dashboard/stats'),
      api<Alerts>('/dashboard/alerts'),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState
          title="Couldn't load the dashboard"
          body="Check your connection and try again."
          detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
          retryHref="/dashboard"
        />
      </>
    );
  }

  const mayWrite = await canOperate();

  /*
   * Maintenance and complaints have APIs but no screens yet, so those rows carry no href — §10's
   * insistence that a state be honest applies to affordances too. They join the links when the
   * screens land.
   */
  const attention: AttentionItem[] = [
    {
      count: alerts.pendingPaymentsCount,
      singular: 'payment is unpaid',
      plural: 'payments are unpaid',
      amount: stats.pendingPkr,
      href: '/payments?status=pending',
    },
    {
      count: alerts.pendingVoidRequests,
      singular: 'void request awaits approval',
      plural: 'void requests await approval',
      href: '/payments',
    },
    {
      count: alerts.openMaintenance,
      singular: 'maintenance request is open',
      plural: 'maintenance requests are open',
    },
    {
      count: alerts.unresolvedComplaints,
      singular: 'complaint is unresolved',
      plural: 'complaints are unresolved',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={stats.month}
        title="Dashboard"
        attention={attention.some((a) => a.count > 0)}
        actions={
          mayWrite ? (
            <>
              {/* §7.5: one primary per view. Recording a payment is the thing a warden opens this
                  app to do; adding a student is the weekly job. */}
              <Button asChild variant="secondary">
                <Link href="/students/new">Add student</Link>
              </Button>
              <Button asChild variant="primary">
                <Link href="/payments/new">Record payment</Link>
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <HeroPanel
          className="lg:col-span-2"
          eyebrow={`Collected · ${stats.month}`}
          value={stats.revenuePkr}
          definition="Collected = sum of amount paid on every non-voided payment row dated in this month."
        >
          <StatStrip>
            <StatItem
              label="Occupancy"
              hint={`${Number(stats.occupiedBeds ?? 0)} of ${Number(stats.totalBeds ?? 0)} beds`}
            >
              {/* §3.2's sharpest rule: a zero here renders tertiary, never green. An empty hostel
                  is not a success, and the reference dashboards that paint it green are lying. */}
              <Pct value={stats.occupancyPct} />
            </StatItem>
            <StatItem label="Active students">
              <Num value={stats.activeStudents} />
            </StatItem>
            <StatItem label="Expenses">
              <Money value={stats.expensesPkr} />
            </StatItem>
            <StatItem
              label="Net fund"
              // Amber, not red: a negative net fund is a thing to act on this week, not a failed
              // transaction. Red is reserved for destructive and failed (§3.1).
              attention={Number(stats.netFundPkr ?? 0) < 0}
            >
              <Money value={stats.netFundPkr} />
            </StatItem>
          </StatStrip>
        </HeroPanel>

        <NeedsAttention items={attention} />
      </div>
    </>
  );
}
