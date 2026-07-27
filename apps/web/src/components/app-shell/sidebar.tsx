'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui-kit/tooltip';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, isActive } from './nav-items';

const STORAGE_KEY = 'hostyllo:sidebar-collapsed';

/**
 * Desktop sidebar — 260px, collapsing to a 60px icon rail (spec §5).
 *
 * Hidden below `lg`, where the bottom tab bar takes over. The collapsed preference is remembered,
 * because a warden who works on a small laptop collapses it once and should not have to do it
 * again every morning.
 */
export function Sidebar() {
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
      <motion.aside
        // Spec §10: sidebar collapse is 200ms easeInOut. The very first paint is not animated —
        // otherwise a remembered collapsed state would visibly slide shut on every page load.
        animate={{ width: collapsed ? 60 : 260 }}
        initial={false}
        transition={ready ? { duration: 0.2, ease: 'easeInOut' } : { duration: 0 }}
        className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface lg:flex"
      >
        <div className="flex h-[60px] items-center gap-2 overflow-hidden px-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-text hover:text-text">
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center rounded-md bg-gold font-bold text-on-gold"
            >
              H
            </span>
            {!collapsed && <span className="truncate text-[17px] font-bold tracking-tight">Hostyllo</span>}
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-x-hidden px-2 py-2" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] transition-colors duration-150',
                  active
                    ? 'bg-gold-subtle font-semibold text-gold'
                    : 'text-text-muted hover:bg-surface-2 hover:text-text',
                )}
              >
                {/* The current page is marked by weight, colour AND this rail — never colour alone. */}
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute left-0 h-6 w-[3px] rounded-full bg-gold"
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                )}
                <item.icon className="size-5 shrink-0" aria-hidden />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            // Collapsed to icons, the label has to come from somewhere — spec §5: "tooltips on hover".
            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </nav>

        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="m-2 flex min-h-11 items-center gap-3 rounded-md px-3 text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5 shrink-0" aria-hidden />
          ) : (
            <PanelLeftClose className="size-5 shrink-0" aria-hidden />
          )}
          {!collapsed && <span className="truncate text-sm">Collapse</span>}
        </button>
      </motion.aside>
    </TooltipProvider>
  );
}
