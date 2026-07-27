'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Sign-in form.
 *
 * Posts to this app's own /api/auth/login handler, never to the API directly — that handler owns
 * the cookie writes and keeps tokens out of client JavaScript entirely.
 */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        // The API returns one message for both a wrong password and an unknown email; it is shown
        // as-is so this form does not become the thing that reveals which accounts exist.
        setError(body.message ?? 'Sign in failed. Please try again.');
        setPending(false);
        return;
      }

      // A full refresh rather than a client transition: the session cookies were just set, and
      // every page reads them on the server.
      router.replace(next && next.startsWith('/') ? next : '/dashboard');
      router.refresh();
    } catch {
      setError('Cannot reach Hostyllo. Check your connection and try again.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="email" style={labelStyle}>
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />

      <label htmlFor="password" style={{ ...labelStyle, marginTop: 'var(--space-4)' }}>
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={inputStyle}
      />

      {error && (
        // Inline, next to the thing that failed — the design system explicitly rules out alerts.
        <p
          role="alert"
          style={{
            margin: 'var(--space-4) 0 0',
            padding: 'var(--space-3)',
            background: 'var(--red-subtle)',
            color: 'var(--red)',
            borderRadius: 'var(--radius-md)',
            fontSize: 14,
          }}
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} style={buttonStyle(pending)}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 'var(--space-2)',
  fontSize: 14,
  color: 'var(--text-muted)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-3)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border-2)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 16,
};

const buttonStyle = (pending: boolean): React.CSSProperties => ({
  width: '100%',
  marginTop: 'var(--space-6)',
  padding: 'var(--space-3)',
  background: pending ? 'var(--gold-active)' : 'var(--gold)',
  color: '#0b0e14',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontWeight: 600,
  fontSize: 16,
  cursor: pending ? 'progress' : 'pointer',
  // 44px is the minimum comfortable touch target; the primary users are on phones.
  minHeight: 44,
});
