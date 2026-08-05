'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';

import { notify } from '@/components/ui-kit/sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui-kit/dropdown-menu';

const ROLE_LABELS: Record<string, string> = {
  hostel_owner: 'Owner',
  chain_manager: 'Chain manager',
  warden: 'Warden',
  viewer: 'Viewer',
};

/** Initials for the avatar; falls back to an em dash when there is no name. */
function initials(name: string | null): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]).join('');
  return letters ? letters.toUpperCase() : '—';
}

/**
 * The sidebar's footer, and the account menu behind it.
 *
 * It lives at the foot of the sidebar rather than in the header because that is
 * where `docs/design/handoff/README.md` puts it — and because the header's job
 * on every screen is the screen's own controls. The chevron the design draws is
 * real: this is the only place to sign out.
 */
export function UserMenu({ name, role }: { name: string | null; role: string | null }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('logout failed');
    } catch {
      // The handler clears cookies even when the API is unreachable, so this only
      // fires if the request never completed. Say so rather than leaving the
      // button stuck on "Signing out…" — a user who thinks they signed out on a
      // shared phone and did not is a real problem.
      setSigningOut(false);
      notify.failure('Could not sign out. Check your connection and try again.', {
        label: 'Try again',
        onClick: () => void signOut(),
      });
      return;
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={name ? `Account menu for ${name}` : 'Account menu'}
        className="flex w-full items-center gap-[9px] rounded-md p-[13px] text-start transition-colors duration-fast ease-standard hover:bg-surface-hover"
      >
        <span
          className="grid size-[27px] shrink-0 place-items-center rounded-full border text-[10.5px] font-semibold text-brand-text"
          style={{ background: 'var(--hs-brand-tint)', borderColor: 'var(--hs-brand-border)' }}
          aria-hidden
        >
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-semibold leading-[1.3] text-fg">
            {name ?? 'Signed in'}
          </span>
          {role && (
            <span className="block truncate text-meta leading-[1.3] text-fg-tertiary">
              {ROLE_LABELS[role] ?? role}
            </span>
          )}
        </span>
        <ChevronDown className="size-[13px] shrink-0 text-fg-tertiary" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate font-semibold text-fg">{name ?? 'Signed in'}</div>
          {role && <div className="text-caption text-fg-secondary">{ROLE_LABELS[role] ?? role}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} disabled={signingOut} className="min-h-9">
          <LogOut className="size-4" aria-hidden />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
