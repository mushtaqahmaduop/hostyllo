import Link from 'next/link';

import type { RosterTab } from '@/lib/students/contract';
import { cn } from '@/lib/utils';

/**
 * The roster's status tabs — a segmented control on a 38px inset track.
 *
 * Links, not buttons: the tab is part of the URL, so a warden can bookmark
 * "everyone who is leaving", send it to the owner, and use the back button to
 * get out of it. Rendered as a `<nav>` with `aria-current` on the active tab
 * rather than the ARIA tab pattern, because these are five destinations, not
 * five panels of one widget — and the ARIA pattern would promise arrow-key
 * navigation between panels that do not exist.
 *
 * Every tab carries its count, including zero. A tab that hides itself when
 * empty moves the four beside it, and "Blacklisted 0" is a useful answer to a
 * question the manager is asking; a missing tab is not an answer at all.
 */
export function StatusTabs({ tabs }: { tabs: RosterTab[] }) {
  return (
    <nav
      aria-label="Filter students by status"
      className="flex h-[var(--hs-control-h)] shrink-0 items-center gap-[2px] rounded-xl border border-hairline bg-surface p-[3px]"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.current ? 'page' : undefined}
          className={cn(
            'flex h-full items-center gap-[6px] whitespace-nowrap rounded-lg px-[14px] text-[12.5px]',
            'transition-colors duration-fast ease-standard',
            tab.current
              ? 'bg-surface-hover font-semibold text-fg'
              : 'font-medium text-fg-secondary hover:text-fg',
          )}
        >
          {tab.label}
          <span
            className={cn(
              'hs-num rounded-sm px-[5px] py-[1px] text-[10.5px]',
              // The one place the accent appears on this control, and only on
              // the current tab's count — the tab itself is carried by weight
              // and a tonal step, per the "violet is spent on one action"
              // rule. A violet fill on all five would be decoration.
              tab.current
                ? 'bg-brand-tint text-brand-text'
                : 'bg-surface-hover text-fg-tertiary',
            )}
          >
            {tab.count}
          </span>
        </Link>
      ))}
    </nav>
  );
}
