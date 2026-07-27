import { LoginForm } from '@/components/login-form';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden p-4">
      {/*
        A single soft gold wash behind the card. Spec §1 rules out decorative chrome, and this
        earns its place narrowly: it separates the sign-in screen from every other dark surface in
        the product, so a warden can tell at a glance they are signed out. `pointer-events-none`
        and `aria-hidden` keep it out of the way of both the mouse and a screen reader.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-20%] size-[520px] -translate-x-1/2 rounded-full opacity-[0.07] blur-[120px] [background:radial-gradient(circle,var(--gold),transparent_70%)]"
      />

      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            aria-hidden
            className="mb-4 grid size-12 place-items-center rounded-xl bg-gold text-xl font-bold text-on-gold shadow-lg"
          >
            H
          </span>
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Hostyllo</h1>
          <p className="mt-1 text-[15px] text-text-muted">Sign in to manage your hostel.</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
