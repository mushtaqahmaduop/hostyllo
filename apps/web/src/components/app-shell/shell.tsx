'use client';

import { useEffect, useState } from 'react';

import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const STORAGE_KEY = 'hs:nav-hidden';

/**
 * The signed-in shell: sidebar, header, scrolling content pane.
 *
 * A client component because the sidebar and the header share one piece of
 * state — whether navigation is showing — and there is nowhere else for it to
 * live. Everything expensive stays on the server: `children` is a server-
 * rendered tree passed through as a prop, so making this boundary client does
 * not pull a single page into the browser bundle.
 *
 * ── On the hamburger ────────────────────────────────────────────────────────
 * The redesign labels it "Collapse navigation" but never draws the collapsed
 * state, and the previous 72px icon rail it would have reused is gone with the
 * 216px sidebar. So it hides the sidebar outright rather than inventing a rail
 * nobody designed: an unambiguous behaviour that matches the label, and one
 * that reclaims the full width for a wide ledger — which is the reason an
 * operator reaches for that control in the first place.
 *
 * ── On the fixed width ──────────────────────────────────────────────────────
 * The content pane scrolls in both directions and its rows declare
 * `--hs-content-min` (1180px). Below that the dashboard slides sideways instead
 * of reflowing into a layout that was never designed. The bottom tab bar and the
 * existing simpler screens still carry small viewports.
 */
export function AppShell({
  name,
  role,
  today,
  alertCount,
  tenantName,
  badges,
  children,
}: {
  name: string | null;
  role: string | null;
  today: string;
  alertCount: number;
  tenantName: string;
  badges: Record<string, number>;
  children: React.ReactNode;
}) {
  const [navHidden, setNavHidden] = useState(false);
  const [ready, setReady] = useState(false);

  // Read after mount rather than during render: localStorage does not exist on
  // the server, and seeding state from it would make the first client render
  // disagree with the server's HTML.
  useEffect(() => {
    setNavHidden(window.localStorage.getItem(STORAGE_KEY) === '1');
    setReady(true);
  }, []);

  function toggleNav() {
    setNavHidden((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <div data-density="compact" className="flex h-dvh w-full overflow-hidden bg-canvas text-fg">
      {/*
       * Width is animated, not `display`, so the content pane reflows smoothly
       * — but only after mount. A remembered hidden state would otherwise visibly
       * slide shut on every page load, which reads as the app changing its mind.
       */}
      <div
        aria-hidden={navHidden}
        className={[
          'shrink-0 overflow-hidden',
          ready && 'transition-[width] duration-base ease-standard',
          navHidden ? 'w-0' : 'w-0 lg:w-[var(--hs-sidebar-w)]',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Sidebar tenantName={tenantName} userName={name} userRole={role} badges={badges} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          today={today}
          alertCount={alertCount}
          onToggleNav={toggleNav}
          navHidden={navHidden}
        />

        <main className="hs-scroll flex-1 overflow-auto p-5">{children}</main>

        <BottomNav />
      </div>
    </div>
  );
}
