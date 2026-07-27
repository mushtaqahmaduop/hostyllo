import { BedDouble, LayoutDashboard, Users, Wallet, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile tab bar. The sidebar has room for the full label; a 5-across bar does not. */
  short: string;
};

/**
 * The navigation, defined once and rendered by both the desktop sidebar and the mobile tab bar.
 *
 * Only routes that exist are listed. docs/04_UX_DESIGN_SYSTEM.md §5 also shows Expenses, Reports,
 * Issues and Settings in the sidebar — those screens are not built yet, and a nav item that leads
 * to a 404 costs more trust than an absent one does convenience. They join this list as they land.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { href: '/students', label: 'Students', short: 'Students', icon: Users },
  { href: '/rooms', label: 'Rooms', short: 'Rooms', icon: BedDouble },
  { href: '/payments', label: 'Payments', short: 'Pay', icon: Wallet },
];

/**
 * Whether a nav item should read as current.
 *
 * Prefix matching, so `/students/new` still highlights Students — but anchored on a segment
 * boundary, otherwise a future `/payments-archive` route would light up Payments too.
 */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
