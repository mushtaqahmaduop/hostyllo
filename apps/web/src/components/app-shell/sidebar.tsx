'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui-kit/tooltip';
import { cn } from '@/lib/utils';
import { NAV_GROUPS, isActive, type NavItem } from './nav-items';

const STORAGE_KEY = 'hs:sidebar-collapsed';

/**
 * Desktop sidebar — docs/15_UI_SPEC_v1.md §7.8, 264px collapsing to a 72px icon rail.
 *
 * The background is `surface-sunken`, not a dark slab. Every reference dashboard in §1 reaches for
 * a dark navigation rail in light mode; it looks decisive in a screenshot and then fights the real
 * dark theme, where the rail has to become *lighter* than the canvas to stay legible. A recessed
 * neutral works in both.
 *
 * The active item is marked by the Threshold Rule — an indigo bar on the leading edge — plus
 * weight and a tint. Never a full indigo fill: indigo means "you can act on this", and a solid
 * block of it on the thing you are already looking at spends the colour on nothing.
 */
export function Sidebar({ asOf }: { asOf: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  // Read after mount rather than during render: localStorage does not exist on the server, and
  // seeding state from it would make the first client render disagree with the server's HTML.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === '1');
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        data-collapsed={collapsed || undefined}
        style={{ width: collapsed ? 'var(--hs-sidebar-w-collapsed)' : 'var(--hs-sidebar-w)' }}
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-hairline bg-surface-sunken lg:flex',
          // The first paint is not animated: a remembered collapsed state would otherwise visibly
          // slide shut on every page load, which reads as the app changing its mind.
          ready && 'transition-[width] duration-base ease-standard',
        )}
      >
        <div className="flex h-[var(--hs-topbar-h)] shrink-0 items-center overflow-hidden px-4">
          <Link href="/dashboard" className="flex items-center gap-3 text-fg hover:text-fg">
            <BrandMark />
            {!collapsed && (
              <span className="truncate font-display text-h2 tracking-snug">Hostyllo</span>
            )}
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden px-3 py-4" aria-label="Main">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {/* §7.8: groups carry eyebrow headers. Hidden in the rail, where there is no room
                  for them and the tooltips carry the labels instead. */}
              {!collapsed && <p className="hs-eyebrow mb-2 px-3">{group.label}</p>}
              <ul className="grid list-none gap-1 p-0">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      active={isActive(pathname, item.href)}
                      collapsed={collapsed}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/*
         * "Data as of / Last refresh", pinned bottom — adopted from the Lead Tracker reference and
         * made mandatory by §1: multi-tenant SaaS over patchy connectivity must state its data
         * freshness. Without it, a stale page and a fresh one are indistinguishable, and the
         * operator reconciles cash against a number from twenty minutes ago.
         */}
        <div className="shrink-0 border-t border-hairline px-3 py-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="px-3 text-center text-caption text-fg-tertiary">·</p>
              </TooltipTrigger>
              <TooltipContent side="right">Data as of {asOf}</TooltipContent>
            </Tooltip>
          ) : (
            <p className="px-3 text-caption text-fg-tertiary">
              Data as of <span className="tabular-nums">{asOf}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="m-3 mt-0 flex h-[var(--hs-control-h)] items-center gap-3 rounded-md px-3 text-fg-tertiary transition-colors duration-instant ease-standard hover:bg-surface-hover hover:text-fg"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
          ) : (
            <PanelLeftClose className="size-4 shrink-0" aria-hidden />
          )}
          {!collapsed && <span className="truncate text-body-sm">Collapse</span>}
        </button>
      </aside>
    </TooltipProvider>
  );
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-11 items-center gap-3 rounded-md ps-4 pe-3',
        'text-body transition-colors duration-fast ease-standard',
        // The reserved 2px leading bar. Transparent when inactive, so activating an item changes a
        // colour and never a position — §9 forbids anything moving that does not need to.
        // §9: "Nav item activate — threshold bar, 200ms ease-emphasis." The one overshoot easing
        // in the system, reserved for the threshold bar and the hero figure.
        'before:absolute before:inset-y-2 before:start-0 before:w-[var(--hs-threshold-w)] before:rounded-full before:bg-transparent before:transition-colors before:duration-base before:ease-emphasis',
        active
          ? 'bg-surface-active font-semibold text-fg before:bg-brand'
          : 'text-fg-secondary hover:bg-surface-hover hover:text-fg',
      )}
    >
      <item.icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  // Collapsed to icons, the label has to come from somewhere (§7.8: "icon + tooltip").
  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  ) : (
    link
  );
}

/**
 * The Aperture-O mark in miniature: an indigo ring with an amber threshold at its leading edge —
 * the same device the whole interface is built on (§2), at 28px.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative grid size-7 shrink-0 place-items-center rounded-full border-2 border-brand',
        className,
      )}
    >
      <span className="absolute inset-y-1 start-[-2px] w-[var(--hs-threshold-w)] rounded-full bg-attention" />
    </span>
  );
}
