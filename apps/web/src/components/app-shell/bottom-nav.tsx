'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, isActive } from './nav-items';

/**
 * Mobile tab bar (spec §5, "Navigation: bottom tab bar").
 *
 * At the bottom because that is where a thumb reaches on a phone held one-handed — the same reason
 * the spec puts it there rather than in a hamburger. `pb-[env(safe-area-inset-bottom)]` keeps the
 * targets clear of the iOS home indicator, which would otherwise swallow taps on the bottom edge.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-20 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors duration-150',
              active ? 'font-semibold text-gold' : 'text-text-muted',
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
