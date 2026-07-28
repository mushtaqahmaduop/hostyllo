'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { notify } from '@/components/ui-kit/sonner';
import { Avatar, AvatarFallback } from '@/components/ui-kit/avatar';
import { Button } from '@/components/ui-kit/button';
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

/** Initials for the avatar; falls back to a person glyph when there is no name to work from. */
function initials(name: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]).join('');
  return letters ? letters.toUpperCase() : null;
}

export function UserMenu({ name, role }: { name: string | null; role: string | null }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('logout failed');
    } catch {
      // The handler clears cookies even when the API is unreachable, so this only fires if the
      // request never completed. Say so rather than leaving the button stuck on "Signing out…" —
      // a user who thinks they signed out on a shared phone and did not is a real problem.
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

  const label = initials(name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={name ? `Account menu for ${name}` : 'Account menu'}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-surface-sunken text-body-sm font-semibold text-fg">
              {label ?? <User className="size-4" aria-hidden />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate font-semibold text-fg">{name ?? 'Signed in'}</div>
          {role && <div className="text-caption text-fg-secondary">{ROLE_LABELS[role] ?? role}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} disabled={signingOut} className="min-h-11">
          <LogOut className="size-4" aria-hidden />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
