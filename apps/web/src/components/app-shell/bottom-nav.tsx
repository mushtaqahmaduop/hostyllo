'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { NAV_ITEMS, isActive } from './nav-items';

/**
 * Mobile tab bar — docs/15_UI_SPEC_v1.md §11: below 640 the sidebar becomes bottom navigation.
 *
 * At the bottom because that is where a thumb reaches on a phone held one-handed, which is also
 * why §11 sets a 44px minimum touch target. `pb-[env(safe-area-inset-bottom)]` keeps the targets
 * clear of the iOS home indicator, which would otherwise swallow taps on the bottom edge.
 *
 * The active item carries the same Threshold Rule as the sidebar, rotated to the top edge of the
 * tab — the one place the bar is horizontal, because on this axis "leading edge" is the top of a
 * stacked tab rather than its side.
 */
export function BottomNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.inTabBar);

  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-20 flex border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-[var(--hs-control-h-touch)] flex-1 flex-col items-center justify-center gap-1 py-2',
              'text-eyebrow transition-colors duration-fast ease-standard',
              'before:absolute before:inset-x-4 before:top-0 before:h-[var(--hs-threshold-w)] before:rounded-full before:bg-transparent',
              active ? 'font-semibold text-fg before:bg-brand' : 'text-fg-tertiary',
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}
