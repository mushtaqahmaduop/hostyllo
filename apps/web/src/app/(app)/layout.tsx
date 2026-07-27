import Link from 'next/link';
import { AppNav } from '@/components/app-nav';

/**
 * Shell for every signed-in page. Middleware has already redirected anyone without a session
 * cookie, so this layout assumes a session exists but never assumes what it permits — the API
 * decides that per request.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Link href="/dashboard" style={{ fontWeight: 700, color: 'var(--text)', fontSize: 18 }}>
          Hostyllo
        </Link>
        <AppNav />
      </header>

      <main style={{ flex: 1, padding: 'var(--space-6) var(--space-4)', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
