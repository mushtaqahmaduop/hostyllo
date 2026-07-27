'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/students', label: 'Students' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/payments', label: 'Payments' },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1 }}>
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              color: active ? 'var(--gold)' : 'var(--text-muted)',
              background: active ? 'var(--gold-subtle)' : 'transparent',
              fontSize: 15,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {link.label}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={signOut}
        style={{
          marginLeft: 'auto',
          padding: 'var(--space-2) var(--space-3)',
          background: 'transparent',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          minHeight: 44,
        }}
      >
        Sign out
      </button>
    </nav>
  );
}
