'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Bell, Calendar, Menu, Monitor, Moon, Search, Sun } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-kit/dropdown-menu';
import { NAV_ITEMS } from './nav-items';

/**
 * The page header — `--card` surface, 1px hairline underneath, ~11px padding.
 *
 * Per `docs/design/handoff/README.md`: page title, search field with the ⌘K
 * hint, month picker, notification bell with a dot, theme toggle, then up to two
 * actions. Only the screen's own primary action is filled — this bar draws none
 * of them itself; a page passes its actions in, so the "one filled button per
 * screen" rule is enforced at the one place a screen can break it.
 *
 * Controls are 38px and flat: a hairline on `--card` with a `--hov` fill on
 * hover. No shadows anywhere — elevation on this system is the tonal ladder, and
 * a header sitting on the same surface as the sidebar is not elevated at all.
 */
export function Topbar({
  today,
  alertCount,
  onToggleNav,
  navHidden,
  actions,
}: {
  today: string;
  alertCount: number;
  onToggleNav: () => void;
  navHidden: boolean;
  /** The screen's own actions. At most two, at most one of them filled. */
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();

  // The title comes from the nav rather than from a prop threaded through every
  // page: the sidebar already knows what each route is called, and two places
  // naming the same screen is two places to disagree.
  const current = NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const title = current?.label ?? 'Hostyllo';

  return (
    <header className="flex min-w-[var(--hs-content-min)] shrink-0 items-center gap-[10px] border-b border-hairline bg-surface px-5 py-[11px]">
      <button
        type="button"
        onClick={onToggleNav}
        aria-expanded={!navHidden}
        aria-label={navHidden ? 'Show navigation' : 'Hide navigation'}
        title={navHidden ? 'Show navigation' : 'Hide navigation'}
        className="grid size-[30px] shrink-0 place-items-center rounded-md text-fg-secondary transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-fg"
      >
        <Menu className="size-4" aria-hidden />
      </button>

      <h1 className="shrink-0 text-display font-semibold tracking-snug">{title}</h1>

      <div className="min-w-4 flex-1" />

      {/*
       * The search field is drawn but inert: there is no search endpoint, and a
       * box that takes typing and then does nothing is a worse lie than a control
       * that says it is not ready. It is a real <button> so it is reachable and
       * announces itself, and it becomes the command palette trigger the day the
       * endpoint exists.
       */}
      <button
        type="button"
        disabled
        title="Global search — not built yet"
        className="flex h-[var(--hs-control-h)] w-[280px] shrink-0 cursor-not-allowed items-center gap-[9px] rounded-md border border-hairline bg-canvas px-[11px] text-start text-fg-tertiary"
      >
        <Search className="size-[15px] shrink-0" aria-hidden />
        <span className="flex-1 truncate text-[12.5px]">Search…</span>
        <span className="hs-num shrink-0 rounded-sm bg-surface-hover px-[6px] py-[2px] text-[10.5px] text-fg-secondary">
          ⌘K
        </span>
      </button>

      <span
        className="flex h-[var(--hs-control-h)] shrink-0 items-center gap-[8px] whitespace-nowrap rounded-md border border-hairline bg-surface px-[11px] text-[12.5px] font-medium"
        // Not a button: the bundle draws a month picker here, but no screen has a
        // date filter behind it yet. It states today's date, which is true, and
        // gains its menu when the filter is wired.
      >
        <Calendar className="size-[15px] text-fg-tertiary" aria-hidden />
        <span className="hs-num">{today}</span>
      </span>

      <button
        type="button"
        disabled={alertCount === 0}
        title={alertCount > 0 ? `${alertCount} awaiting approval` : 'Nothing awaiting approval'}
        aria-label={alertCount > 0 ? `Notifications, ${alertCount} awaiting approval` : 'Notifications'}
        className="relative grid size-[var(--hs-control-h)] shrink-0 place-items-center rounded-md border border-hairline bg-surface text-fg-secondary transition-colors duration-fast ease-standard enabled:hover:bg-surface-hover enabled:hover:text-fg"
      >
        <Bell className="size-4" aria-hidden />
        {/* A dot, not a count — the bundle's header carries the dot and the
            sidebar carries the numbers. Two places printing the same figure is
            two places to disagree. */}
        {alertCount > 0 && (
          <span className="absolute right-[9px] top-[9px] size-[6px] rounded-full bg-negative ring-2 ring-surface" />
        )}
      </button>

      <ThemeButton />

      {actions && <div className="flex shrink-0 items-center gap-[8px]">{actions}</div>}
    </header>
  );
}

/**
 * Theme control.
 *
 * The bundle draws a single sun/moon square that flips between two states. It is
 * kept as a three-option menu behind that square instead, because a two-way
 * toggle has no way back to `system`: a user who once chose dark would override
 * their device forever. Same 38px button, one extra option inside it.
 */
function ThemeButton() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The stored choice is only readable on the client. Naming the current theme
  // during SSR would either mismatch the markup React hydrates or flicker.
  useEffect(() => setMounted(true), []);

  const Icon = mounted && resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Theme"
        className="grid size-[var(--hs-control-h)] shrink-0 place-items-center rounded-md border border-hairline bg-surface text-fg-secondary transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-fg"
      >
        <Icon className="size-4" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        {(
          [
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'system', label: 'System', icon: Monitor },
          ] as const
        ).map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setTheme(option.value)}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <option.icon className="size-4" aria-hidden />
              {option.label}
            </span>
            {/* The current choice is marked by a word, not only by a highlight. */}
            {mounted && theme === option.value && (
              <span className="text-caption text-fg-tertiary">Current</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
