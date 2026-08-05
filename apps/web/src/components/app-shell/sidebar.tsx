'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { NAV_GROUPS, badgeTone, isActive, type BadgeTone, type NavItem } from './nav-items';
import { UserMenu } from './user-menu';

const BADGE_STYLE: Record<BadgeTone, string> = {
  danger: 'bg-negative-tint text-negative',
  warning: 'bg-attention-tint text-attention',
  neutral: 'bg-surface-hover text-fg-secondary',
};

/**
 * Desktop sidebar — 203px, `--card` surface, 1px hairline on the trailing edge.
 *
 * Three regions, per `docs/design/handoff/README.md`: brand block, scrolling
 * grouped nav, user footer.
 *
 * The active item is an accent-*tinted* row with accent text at weight 600 — not
 * a filled violet block. The filled violet is the one primary action per screen,
 * and spending it on the page you are already looking at spends it on nothing.
 * That is the Claude system's accent discipline and the bundle's own spec
 * agreeing with each other, so it is not a close call.
 */
export function Sidebar({
  tenantName,
  userName,
  userRole,
  badges,
}: {
  tenantName: string;
  userName: string | null;
  userRole: string | null;
  /** Counts keyed by nav href — only rendered where there is something to count. */
  badges: Record<string, number>;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[var(--hs-sidebar-w)] shrink-0 flex-col border-e border-hairline bg-surface lg:flex">
      <div className="flex shrink-0 items-center gap-[10px] px-[13px] py-[13px]">
        <BrandMark />
        <span className="min-w-0">
          <span className="block text-[12.5px] font-bold leading-[1.2] tracking-wide">HOSTYLLO</span>
          <span className="block truncate text-meta leading-[1.35] text-fg-tertiary">
            {tenantName}
          </span>
        </span>
      </div>

      <nav className="hs-scroll flex-1 overflow-y-auto px-[10px] pb-[10px]" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="px-[6px] pb-[6px] pt-[13px] text-eyebrow font-semibold uppercase tracking-wider text-fg-tertiary">
              {group.label}
            </p>
            <ul className="grid list-none gap-[2px] p-0">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={isActive(pathname, item.href)}
                    badge={badges[item.href] ?? 0}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: avatar, name, role, chevron — and the only sign-out in the app. */}
      <div className="shrink-0 border-t border-hairline">
        <UserMenu name={userName} role={userRole} />
      </div>
    </aside>
  );
}

function NavLink({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) {
  const content = (
    <>
      <item.icon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      {badge > 0 && (
        <span
          className={cn(
            'hs-num inline-flex h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-sm px-[5px] text-[10px] font-semibold',
            BADGE_STYLE[badgeTone(item.href)],
          )}
        >
          {badge}
        </span>
      )}
    </>
  );

  const shape =
    'flex h-[var(--hs-nav-item-h)] items-center gap-[10px] rounded-md px-[10px] text-[12.5px]';

  /*
   * Unbuilt screens render as a `<span>`, not a disabled `<a>`. A link with
   * `aria-disabled` is still in the tab order and still announces as a link,
   * which promises a destination that does not exist; a span simply reads as
   * the label it is.
   */
  if (!item.ready) {
    return (
      <span className={cn(shape, 'cursor-default text-fg-disabled')} title={`${item.label} — not built yet`}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        shape,
        'transition-colors duration-fast ease-standard',
        active
          ? 'bg-brand-tint font-semibold text-brand-text hover:text-brand-text'
          : 'font-medium text-fg-secondary hover:bg-surface-hover hover:text-fg',
      )}
    >
      {content}
    </Link>
  );
}

/** The 30px Hostyllo mark, 8px radius, per the bundle's brand block. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-[30px] shrink-0 place-items-center rounded-lg bg-brand text-[15px] font-bold text-fg-on-brand',
        className,
      )}
    >
      H
    </span>
  );
}
