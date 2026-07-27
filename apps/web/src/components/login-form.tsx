'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [reveal, setReveal] = useState(false);
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
      <label htmlFor="email" className={LABEL}>
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
        className={CONTROL}
      />

      <label htmlFor="password" className={cn(LABEL, 'mt-4')}>
        Password
      </label>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={reveal ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn(CONTROL, 'pr-12')}
        />
        {/*
          A reveal toggle, because the alternative on a phone keyboard in poor light is a warden
          mistyping a password three times and hitting the API's 10-per-15-minute login rate limit.
          `aria-pressed` rather than a label swap so a screen reader announces the state change.
        */}
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-pressed={reveal}
          aria-label={reveal ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-md text-text-muted transition-colors duration-150 hover:text-text"
        >
          {reveal ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      </div>

      {error && (
        // Inline, next to the thing that failed — the design system explicitly rules out alerts.
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-red-subtle p-3 text-sm text-red">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          // 44px is the minimum comfortable touch target; the primary users are on phones.
          'mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md text-base font-semibold shadow-sm transition-colors duration-150',
          pending
            ? 'cursor-progress bg-gold-active text-on-gold'
            : 'bg-gold text-on-gold hover:bg-gold-hover active:bg-gold-active',
        )}
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

const LABEL = 'mb-2 block text-sm text-text-muted';

const CONTROL =
  'w-full min-h-11 rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-base text-text ' +
  'transition-colors duration-150 hover:border-text-disabled';
