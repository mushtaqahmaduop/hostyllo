import { LoginForm } from '@/components/login-form';

export const metadata = { title: 'Sign in · Hostyllo' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ fontSize: 28, margin: '0 0 var(--space-2)', letterSpacing: '-0.02em' }}>
          Hostyllo
        </h1>
        <p style={{ margin: '0 0 var(--space-6)', color: 'var(--text-muted)' }}>
          Sign in to manage your hostel.
        </p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
