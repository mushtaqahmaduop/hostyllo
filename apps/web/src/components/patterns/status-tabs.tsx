import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * The status tabs both ledger screens wear — a segmented control on a 38px inset
 * track.
 *
 * Shared rather than copied, for the same reason `pagination.tsx` is shared: the
 * roster and the payments ledger sit one click apart, and a segmented control
 * that is two pixels different between them is the kind of thing an owner
 * notices without being able to say what is wrong. Structural typing keeps it
 * honest — `RosterTab` and `LedgerTab` both satisfy `TabItem`, and neither has to
 * know about the other.
 *
 * Links, not buttons: the tab is part of the URL, so a warden can bookmark
 * "everyone who is overdue", send it to the owner, and use the back button to get
 * out of it. Rendered as a `<nav>` with `aria-current` rather than the ARIA tab
 * pattern, because these are destinations, not panels of one widget — the ARIA
 * pattern would promise arrow-key navigation between panels that do not exist.
 *
 * Every tab carries its count, including zero. A tab that hides itself when empty
 * moves the ones beside it, and "Overdue 0" is a useful answer to the question
 * being asked; a missing tab is not an answer at all.
 */

export type TabItem = {
  key: string;
  label: string;
  count: number;
  current: boolean;
  href: string;
};

export function StatusTabs({ tabs, label }: { tabs: TabItem[]; label: string }) {
  return (
    <nav
      aria-label={label}
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
              // The one place the accent appears on this control, and only on the
              // current tab's count — the tab itself is carried by weight and a
              // tonal step, per the "violet is spent on one action" rule. A violet
              // fill on all of them would be decoration.
              tab.current ? 'bg-brand-tint text-brand-text' : 'bg-surface-hover text-fg-tertiary',
            )}
          >
            {tab.count}
          </span>
        </Link>
      ))}
    </nav>
  );
}
