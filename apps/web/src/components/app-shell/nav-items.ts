import {
  Activity,
  ArrowLeftRight,
  BedDouble,
  CircleHelp,
  FileText,
  LayoutDashboard,
  MessageSquareWarning,
  Package,
  Receipt,
  Settings,
  UserRoundCog,
  Users,
  Wallet,
  Wrench,
  XCircle,
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
  /**
   * Whether the route exists.
   *
   * The bundle's sidebar shows the product's whole shape — eighteen entries
   * across four groups — and five of those screens are built. Rather than hide
   * thirteen items and ship a sidebar that does not look like the design, the
   * unbuilt ones render in place and inert: visible, greyed, not focusable, not
   * clickable. The manager can see where the product is going without ever
   * landing on a 404, and each entry becomes a link by flipping this one flag
   * when its screen lands.
   *
   * The handoff README calls the six inert destinations "placeholders for the
   * next design round, not bugs" — this is that, in code.
   */
  ready?: boolean;
};

export type NavGroup = {
  /** Rendered as a 9.5px uppercase micro-label above the group. */
  label: string;
  items: NavItem[];
};

/**
 * The navigation, defined once and rendered by both the desktop sidebar and the
 * mobile tab bar.
 *
 * Groups, order and badge counts come from `docs/design/handoff/README.md`
 * ("Global chrome"): Main · Finance · Inventory · System. Two departures, both
 * deliberate:
 *
 *   1. "Defaulters" is not in the bundle, but the route exists and is reachable
 *      today, so it is kept nested under Payments rather than orphaned.
 *   2. Maintenance sits in System per the bundle, and is separate from
 *      Complaints in Main — the design brief is explicit that they are two
 *      different things, and an earlier draft that merged them was wrong.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, inTabBar: true, ready: true },
      { href: '/students', label: 'Students', short: 'Students', icon: Users, inTabBar: true, ready: true },
      { href: '/rooms', label: 'Rooms', short: 'Rooms', icon: BedDouble, inTabBar: true, ready: true },
      { href: '/cancellations', label: 'Cancellations', short: 'Cancelled', icon: XCircle },
      { href: '/complaints', label: 'Complaints', short: 'Complaints', icon: MessageSquareWarning },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/payments', label: 'Payments', short: 'Dues', icon: Wallet, inTabBar: true, ready: true },
      { href: '/payments/defaulters', label: 'Defaulters', short: 'Late', icon: Receipt, ready: true },
      { href: '/expenses', label: 'Expenses', short: 'Expenses', icon: FileText },
      { href: '/reports', label: 'Reports', short: 'Reports', icon: FileText },
      { href: '/transfers', label: 'Funds Transfers', short: 'Transfers', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Inventory',
    items: [{ href: '/stock', label: 'Stock Inventory', short: 'Stock', icon: Package }],
  },
  {
    label: 'System',
    items: [
      { href: '/staff', label: 'Staff', short: 'Staff', icon: UserRoundCog },
      { href: '/users', label: 'Users', short: 'Users', icon: Users },
      { href: '/maintenance', label: 'Maintenance', short: 'Fix', icon: Wrench },
      { href: '/settings', label: 'Settings', short: 'Settings', icon: Settings },
      { href: '/activity', label: 'Activity Log', short: 'Activity', icon: Activity },
      { href: '/help', label: 'Help & Support', short: 'Help', icon: CircleHelp },
    ],
  },
];

/** Flat list, for the tab bar and for anything that needs to walk every route once. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/**
 * How a nav badge is styled.
 *
 * The bundle: Complaints uses the danger pill, Cancellations the warning pill,
 * everything else the grey `--hov` pill. That is the "pills default to grey"
 * rule applied to navigation — a count is only coloured when the state behind
 * it is one somebody has to act on.
 */
export type BadgeTone = 'danger' | 'warning' | 'neutral';

export function badgeTone(href: string): BadgeTone {
  if (href === '/complaints') return 'danger';
  if (href === '/cancellations') return 'warning';
  return 'neutral';
}

/**
 * Whether a nav item should read as current.
 *
 * Prefix matching, so `/students/new` still highlights Students — but anchored on
 * a segment boundary, otherwise a future `/payments-archive` route would light up
 * Payments too.
 *
 * `exact` is needed because a child route has its own nav entry: without it,
 * `/payments` would also light up while the user is on `/payments/defaulters`,
 * and two items reading as current is worse than none.
 */
export function isActive(pathname: string, href: string): boolean {
  const hasNestedEntry = NAV_ITEMS.some((i) => i.href !== href && i.href.startsWith(`${href}/`));
  if (hasNestedEntry) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
