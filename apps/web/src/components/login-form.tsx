'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui-kit/alert';
import { Button } from '@/components/ui-kit/button';
import { Input } from '@/components/ui-kit/input';
import { Label } from '@/components/ui-kit/label';

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
        setError(body.message ?? 'Sign in failed. Check your email and password, then try again.');
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
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div>
        <Label htmlFor="email" className="mb-2">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="password" className="mb-2">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={reveal ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pe-11"
          />
          {/*
            A reveal toggle, because the alternative on a phone keyboard in poor light is a warden
            mistyping a password three times and hitting the API's 10-per-15-minute login rate
            limit. `aria-pressed` rather than a label swap, so a screen reader announces the state
            change rather than a renamed button.
          */}
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-pressed={reveal}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            className="absolute end-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-fg-tertiary transition-colors duration-instant ease-standard hover:text-fg"
          >
            {reveal ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
      </div>

      {error && (
        // Inline, next to the thing that failed. §10: state what happened and what to do.
        <Alert tone="negative">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" variant="primary" size="touch" loading={pending} className="mt-2 w-full">
        Sign in
      </Button>
    </form>
  );
}
