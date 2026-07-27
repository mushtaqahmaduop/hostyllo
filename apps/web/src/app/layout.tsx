import type { Metadata, Viewport } from 'next';
import { Figtree, DM_Mono, Noto_Nastaliq_Urdu } from 'next/font/google';
import { Toaster } from '@/components/ui-kit/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

/**
 * Fonts per docs/04_UX_DESIGN_SYSTEM.md §3.
 *
 * The spec writes these as `@import` from fonts.googleapis.com. They are loaded through
 * `next/font` instead, which self-hosts the files at build time. That is a deliberate upgrade, not
 * a deviation: it removes a render-blocking round trip to a third-party origin — the single worst
 * thing you can do to first paint on the slow Pakistani mobile connections this product is built
 * for — and `display: swap` plus the size-adjusted fallback keeps text readable while the real
 * face arrives, instead of a blank screen.
 */
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
  display: 'swap',
});

/** Money, CNIC and receipt numbers (spec §3 type scale). */
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

/**
 * Urdu (spec §12). Nastaliq is a large face and is not needed by the English UI, so it is left to
 * load lazily — `preload: false` keeps roughly a megabyte off the critical path for the majority
 * of sessions that never render an Urdu string.
 */
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400'],
  variable: '--font-nastaliq',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: { default: 'Hostyllo', template: '%s · Hostyllo' },
  description: 'Hostel management for owners, chain managers and wardens.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom stays available: the users this is built for are often reading small numbers in
  // poor light, and disabling zoom would be an accessibility failure, not a polish decision.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b0e14' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning` is required by next-themes and scoped to this one element: the
    // theme script sets `data-theme` before React hydrates, so the server's markup legitimately
    // differs here and nowhere else.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${dmMono.variable} ${nastaliq.variable}`}
    >
      <body>
        <ThemeProvider>
          {children}
          {/* Spec §4.10. Bottom-centre on mobile so a confirmation never lands under the thumb
              that is still on the button that produced it. */}
          <Toaster position="bottom-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
