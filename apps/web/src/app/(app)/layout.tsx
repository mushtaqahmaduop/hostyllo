import { Sidebar } from '@/components/app-shell/sidebar';
import { BottomNav } from '@/components/app-shell/bottom-nav';
import { UserMenu } from '@/components/app-shell/user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { sessionUser } from '@/lib/session';

/**
 * Shell for every signed-in page (spec §5).
 *
 * Middleware has already redirected anyone without a session cookie, so this layout assumes a
 * session exists but never assumes what it permits — the API decides that per request.
 *
 * Two navigations, not one responsive one: a sidebar from `lg` up and a bottom tab bar below it.
 * They render from the same `NAV_ITEMS` list, so they cannot drift apart, and each is the shape
 * that actually fits its device rather than a compromise that fits neither.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { name, role } = await sessionUser();

  return (
    <div className="flex min-h-dvh">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-sm lg:h-[60px] lg:px-6">
          {/* The brand only appears here on mobile — on desktop it lives at the top of the sidebar,
              and showing it twice wastes the horizontal space the page title needs. */}
          <span className="flex items-center gap-2 lg:hidden">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-md bg-gold text-[15px] font-bold text-on-gold"
            >
              H
            </span>
            <span className="text-[17px] font-bold tracking-tight">Hostyllo</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu name={name} role={role} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 lg:px-6">{children}</main>

        <BottomNav />
      </div>
    </div>
  );
}
