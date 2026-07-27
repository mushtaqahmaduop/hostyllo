import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Receipt,
  TrendingDown,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatPkr, formatPct } from '@/lib/format';
import { canOperate } from '@/lib/session';
import { Notice, PageHeading, Stat, StatGrid } from '@/components/ui';

export const metadata = { title: 'Dashboard' };

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

  const mayWrite = await canOperate();

  const attention = [
    { count: alerts.pendingPaymentsCount, singular: 'payment is pending', plural: 'payments are pending', href: '/payments?status=pending' },
    { count: alerts.pendingVoidRequests, singular: 'void request awaits approval', plural: 'void requests await approval', href: '/payments' },
    { count: alerts.openMaintenance, singular: 'maintenance request is open', plural: 'maintenance requests are open', href: null },
    { count: alerts.unresolvedComplaints, singular: 'complaint is unresolved', plural: 'complaints are unresolved', href: null },
  ].filter((a) => a.count > 0);

  return (
    <>
      <PageHeading title="Dashboard" meta={stats.month} />

      {/* Spec §6 puts quick actions on this screen: the two things a warden opens the app to do,
          reachable without first navigating to a list. */}
      {mayWrite && (
        <div className="mb-6 flex flex-wrap gap-3">
          <QuickAction href="/students/new" icon={<UserPlus className="size-4" aria-hidden />}>
            Add student
          </QuickAction>
          <QuickAction href="/payments/new" icon={<Receipt className="size-4" aria-hidden />}>
            Record payment
          </QuickAction>
        </div>
      )}

      <StatGrid label="Key figures">
        <Stat
          label="Active students"
          value={String(stats.activeStudents)}
          icon={<Users className="size-4" aria-hidden />}
        />
        <Stat
          label="Occupancy"
          value={formatPct(stats.occupancyPct)}
          hint={`${stats.occupiedBeds} of ${stats.totalBeds} beds`}
          icon={<BedDouble className="size-4" aria-hidden />}
        />
        <Stat
          label="Revenue this month"
          value={formatPkr(stats.revenuePkr)}
          tone="teal"
          icon={<Wallet className="size-4" aria-hidden />}
        />
        <Stat
          label="Pending"
          value={formatPkr(stats.pendingPkr)}
          tone={Number(stats.pendingPkr) > 0 ? 'amber' : undefined}
          icon={<Clock className="size-4" aria-hidden />}
        />
        <Stat
          label="Expenses"
          value={formatPkr(stats.expensesPkr)}
          icon={<TrendingDown className="size-4" aria-hidden />}
        />
        <Stat
          label="Net fund"
          value={formatPkr(stats.netFundPkr)}
          tone={Number(stats.netFundPkr) < 0 ? 'red' : 'teal'}
          icon={<CircleDollarSign className="size-4" aria-hidden />}
        />
      </StatGrid>

      <section aria-label="Needs attention">
        <h2 className="mb-3 text-base font-semibold text-text-muted">Needs attention</h2>

        {attention.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-4 text-[15px] text-text-muted">
            <CheckCircle2 className="size-4 text-teal" aria-hidden />
            Nothing needs attention right now.
          </div>
        ) : (
          <ul className="grid list-none gap-2 p-0">
            {attention.map((a) => {
              const body = (
                <>
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  <span>
                    <span className="tabular font-semibold">{a.count}</span>{' '}
                    {a.count === 1 ? a.singular : a.plural}
                  </span>
                </>
              );
              return (
                <li key={a.singular}>
                  {/* Linked only where a screen exists to land on. Maintenance and complaints have
                      APIs but no UI yet, so those stay plain text rather than leading nowhere. */}
                  {a.href ? (
                    <Link
                      href={a.href}
                      className="flex min-h-11 items-center gap-2 rounded-md bg-amber-subtle p-3 text-[15px] text-amber transition-opacity duration-150 hover:opacity-80"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-h-11 items-center gap-2 rounded-md bg-amber-subtle p-3 text-[15px] text-amber">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function QuickAction({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-2 bg-surface px-4 text-[15px] font-medium text-text transition-colors duration-150 hover:border-gold hover:text-gold"
    >
      {icon}
      {children}
    </Link>
  );
}
