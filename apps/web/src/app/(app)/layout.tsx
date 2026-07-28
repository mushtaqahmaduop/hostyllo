import { Sidebar, BrandMark } from '@/components/app-shell/sidebar';
import { BottomNav } from '@/components/app-shell/bottom-nav';
import { UserMenu } from '@/components/app-shell/user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { sessionUser } from '@/lib/session';
import { formatClock } from '@/lib/format';

/**
 * Shell for every signed-in page — docs/15_UI_SPEC_v1.md §5.
 *
 * Middleware has already redirected anyone without a session cookie, so this layout assumes a
 * session exists but never assumes what it permits — the API decides that per request.
 *
 * Two navigations, not one responsive one: a sidebar from `lg` up and a bottom tab bar below it.
 * They render from the same `NAV_GROUPS`, so they cannot drift apart, and each is the shape that
 * fits its device rather than a compromise that fits neither.
 *
 * `data-density="compact"` is the default because this product is a ledger before it is anything
 * else (§5: "Ledger-heavy pages default to Compact"). Every table reads `--hs-row-h` from here.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { name, role } = await sessionUser();

  /*
   * The freshness stamp (§1, §7.8). Rendered on the server, so it is the moment this page's data
   * was actually fetched — not the moment the browser happened to paint it, which on a slow
   * connection can be a minute later and would make the stamp a lie.
   */
  const asOf = formatClock(new Date());

  return (
    <div data-density="compact" className="flex min-h-dvh bg-canvas">
      <Sidebar asOf={asOf} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[var(--hs-topbar-h)] shrink-0 items-center gap-3 border-b border-hairline bg-surface px-4 lg:px-6">
          {/* The brand appears here on mobile only — on desktop it lives at the top of the
              sidebar, and showing it twice spends the horizontal space the page title needs. */}
          <span className="flex items-center gap-2 lg:hidden">
            <BrandMark />
            <span className="font-display text-h2 tracking-snug">Hostyllo</span>
          </span>

          <div className="ms-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu name={name} role={role} />
          </div>
        </header>

        {/*
         * §5: 12-column content, 32px gutters at ≥1280 stepping down to 16 below 768, capped at
         * 1440. The cap is not cosmetic — a ledger row stretched across a 2560px monitor puts the
         * student's name and the amount they owe half a metre apart.
         */}
        <main className="mx-auto w-full max-w-[var(--hs-content-max)] flex-1 px-4 py-6 md:px-6 xl:px-8">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
