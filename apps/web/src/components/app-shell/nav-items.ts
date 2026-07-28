import {
  BedDouble,
  LayoutDashboard,
  Users,
  Wallet,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile tab bar. The sidebar has room for the full label; a 5-across bar does not. */
  short: string;
  /** Mobile tab bar is four items wide. The rest live in the sidebar only. */
  inTabBar?: boolean;
};

export type NavGroup = {
  /** Rendered as an eyebrow above the group (§7.8). */
  label: string;
  items: NavItem[];
};

/**
 * The navigation, defined once and rendered by both the desktop sidebar and the mobile tab bar.
 *
 * Grouped per docs/15_UI_SPEC_v1.md §7.8, and named the way a hostel manager names things (§14):
 * "Dues", "Rooms", "Check-in" — not "Records", "Entities", "Modules".
 *
 * Only routes that exist are listed. The PRD's module map also has Expenses, Reports, Notices,
 * Maintenance and Settings; those screens are Phase 2 work not yet built, and a nav item that
 * leads to a 404 costs more trust than an absent one costs convenience. They join as they land.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, inTabBar: true },
    ],
  },
  {
    label: 'Hostel',
    items: [
      { href: '/students', label: 'Students', short: 'Students', icon: Users, inTabBar: true },
      { href: '/rooms', label: 'Rooms', short: 'Rooms', icon: BedDouble, inTabBar: true },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/payments', label: 'Dues & payments', short: 'Dues', icon: Wallet, inTabBar: true },
      { href: '/payments/defaulters', label: 'Defaulters', short: 'Late', icon: AlertTriangle },
    ],
  },
];

/** Flat list, for the tab bar and for anything that needs to walk every route once. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/**
 * Whether a nav item should read as current.
 *
 * Prefix matching, so `/students/new` still highlights Students — but anchored on a segment
 * boundary, otherwise a future `/payments-archive` route would light up Payments too.
 *
 * `exact` is needed now that a child route has its own nav entry: without it, `/payments` would
 * also light up while the user is on `/payments/defaulters`, and two items reading as current is
 * worse than none.
 */
export function isActive(pathname: string, href: string): boolean {
  const hasNestedEntry = NAV_ITEMS.some((i) => i.href !== href && i.href.startsWith(`${href}/`));
  if (hasNestedEntry) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
