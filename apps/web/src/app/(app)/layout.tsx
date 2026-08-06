import { AppShell } from '@/components/app-shell/shell';
import { api } from '@/lib/api';
import { sessionUser } from '@/lib/session';

/**
 * Shell for every signed-in page.
 *
 * Middleware has already redirected anyone without a session cookie, so this
 * layout assumes a session exists but never assumes what it permits — the API
 * decides that per request.
 *
 * Two navigations, not one responsive one: a 216px sidebar from `lg` up and a
 * bottom tab bar below it. They render from the same `NAV_GROUPS`, so they
 * cannot drift apart, and each is the shape that fits its device rather than a
 * compromise that fits neither.
 */
type Alerts = {
  pendingPaymentsCount: number;
  pendingVoidRequests: number;
  openMaintenance: number;
  unresolvedComplaints: number;
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { name, role } = await sessionUser();

  /*
   * Nav badges. Fetched here rather than passed down from each page, because the
   * sidebar is on every screen and a count that only appears on the dashboard is
   * a count nobody sees when it matters.
   *
   * Swallowed on failure on purpose: a badge is an embellishment, and a hostel
   * with an unreachable alerts endpoint should still get its navigation. The
   * page below will surface the outage properly.
   */
  const alerts = await api<Alerts>('/dashboard/alerts').catch(() => null);

  // The header carries a month, not a full date — the bundle draws a month
  // picker there, and every ledger in this product is keyed by month.
  const today = new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

  return (
    <AppShell
      name={name}
      role={role}
      today={today}
      alertCount={alerts?.pendingVoidRequests ?? 0}
      // One hostel per session today. It becomes the tenant switcher's current
      // selection when multi-branch lands.
      tenantName="Hostel"
      badges={{ '/payments': alerts?.pendingPaymentsCount ?? 0 }}
    >
      {children}
    </AppShell>
  );
}
