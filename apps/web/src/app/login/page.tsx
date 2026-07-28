import { LoginForm } from '@/components/login-form';
import { BrandMark } from '@/components/app-shell/sidebar';

export const metadata = { title: 'Sign in' };

/**
 * Sign-in — docs/15_UI_SPEC_v1.md §16.
 *
 * The previous version of this screen had a blurred radial gradient wash behind the card. It is
 * gone: §16 bans gradients (1) and marketing-page chrome generally (18), and the justification for
 * it — "so a warden can tell at a glance they are signed out" — is already carried by the absence
 * of the entire app shell. Nothing is left but the mark, the name, and the form.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-start">
          <BrandMark className="size-9" />
          <h1 className="mt-4 font-display text-display font-normal tracking-snug text-fg">Hostyllo</h1>
          <p className="mt-1 text-body text-fg-secondary">Sign in to manage your hostel.</p>
        </div>

        <div className="rounded-lg border border-hairline bg-surface p-6">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
