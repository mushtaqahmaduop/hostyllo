import { api, ApiError } from '@/lib/api';
import { redirect } from 'next/navigation';
import { formatPkr, formatPct } from '@/lib/format';
import { Notice, PageHeading, Stat, StatGrid } from '@/components/ui';

export const metadata = { title: 'Dashboard · Hostyllo' };

/** Shapes come from GET /dashboard/stats and /dashboard/alerts (API spec, Module 6). */
type Stats = {
  month: string;
  activeStudents: number;
  occupiedBeds: number;
  totalBeds: number;
  occupancyPct: number;
  revenuePkr: number;
  pendingPkr: number;
  expensesPkr: number;
  netFundPkr: number;
};

type Alerts = {
  pendingPaymentsCount: number;
  pendingVoidRequests: number;
  openMaintenance: number;
  unresolvedComplaints: number;
  occupancyBelowThreshold: boolean;
  activeNotices: unknown[];
};

export default async function DashboardPage() {
  let stats: Stats;
  let alerts: Alerts;

  try {
    // Fetched together: both are small aggregate queries and the page is useless with only one.
    [stats, alerts] = await Promise.all([api<Stats>('/dashboard/stats'), api<Alerts>('/dashboard/alerts')]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    // Anything else is a real failure and is shown rather than hidden behind an empty state —
    // "Never hide failures" (UX design system §1).
    return (
      <Notice tone="red">{error instanceof ApiError ? error.message : 'Could not load the dashboard.'}</Notice>
    );
  }

  return (
    <>
      <PageHeading title="Dashboard" />

      <StatGrid label="Key figures">
        <Stat label="Active students" value={String(stats.activeStudents)} />
        <Stat label="Occupancy" value={formatPct(stats.occupancyPct)} hint={`${stats.occupiedBeds} of ${stats.totalBeds} beds`} />
        <Stat label="Revenue this month" value={formatPkr(stats.revenuePkr)} tone="teal" />
        <Stat label="Pending" value={formatPkr(stats.pendingPkr)} tone={Number(stats.pendingPkr) > 0 ? 'amber' : undefined} />
        <Stat label="Expenses" value={formatPkr(stats.expensesPkr)} />
        <Stat label="Net fund" value={formatPkr(stats.netFundPkr)} tone={Number(stats.netFundPkr) < 0 ? 'red' : 'teal'} />
      </StatGrid>

      <section aria-label="Needs attention">
        <h2 style={{ fontSize: 16, color: 'var(--text-muted)', margin: '0 0 var(--space-3)' }}>Needs attention</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-2)' }}>
          <Alert count={alerts.pendingPaymentsCount} singular="payment is pending" plural="payments are pending" />
          <Alert count={alerts.pendingVoidRequests} singular="void request awaits approval" plural="void requests await approval" />
          <Alert count={alerts.openMaintenance} singular="maintenance request is open" plural="maintenance requests are open" />
          <Alert count={alerts.unresolvedComplaints} singular="complaint is unresolved" plural="complaints are unresolved" />
          {alerts.pendingPaymentsCount === 0 &&
            alerts.pendingVoidRequests === 0 &&
            alerts.openMaintenance === 0 &&
            alerts.unresolvedComplaints === 0 && (
              <li style={{ color: 'var(--text-muted)', fontSize: 15 }}>Nothing needs attention right now.</li>
            )}
        </ul>
      </section>
    </>
  );
}

function Alert({ count, singular, plural }: { count: number; singular: string; plural: string }) {
  if (!count) return null;
  return (
    <li
      style={{
        padding: 'var(--space-3)',
        background: 'var(--amber-subtle)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--amber)',
        fontSize: 15,
      }}
    >
      {count} {count === 1 ? singular : plural}
    </li>
  );
}

