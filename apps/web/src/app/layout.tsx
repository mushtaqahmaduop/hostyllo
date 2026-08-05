import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Geist, Newsreader, JetBrains_Mono, Noto_Naskh_Arabic } from 'next/font/google';
import { Toaster } from '@/components/ui-kit/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

/**
 * Fonts per docs/15_UI_SPEC_v1.md §4.1.
 *
 * Loaded through `next/font`, which downloads and self-hosts the files at build time — the spec
 * requires self-hosting because the CSP forbids external font origins, and a render-blocking round
 * trip to a third-party CDN is the single worst thing you can do to first paint on the connections
 * this product is built for.
 *
 * Geist deliberately, not Inter: §4.1 calls Inter "the default tell" on template dashboards.
 */
const geist = Geist({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-geist',
  display: 'swap',
});

/**
 * Page titles, the hero figure's companions and empty-state headlines. Editorial serif, used with
 * restraint — never below 20px, never for UI chrome (§4.1).
 *
 * `preload: false` is the spec's own instruction: §4.1 preloads only the two Geist weights used
 * above the fold, to hold first paint inside the 180 KB font budget.
 */
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  preload: false,
});

/** Tier 2 of the numeric doctrine (§4.3): ledger cells, IDs, receipt numbers, CNIC, timestamps. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: false,
});

/**
 * Urdu (§4.1). Naskh, not Nastaliq: Nastaliq's slanted baseline breaks table row rhythm, and this
 * product is a ledger first. Nastaliq stays permitted in printed receipt templates only.
 */
const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-naskh',
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
  // Pinch-zoom stays available. These users are often reading small numbers in poor light, and
  // disabling zoom would be an accessibility failure, not a polish decision (§12).
  // The two canvas values from tokens.css §2/§3 — warm, never pure black.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#181715' },
    { media: '(prefers-color-scheme: light)', color: '#f0eee6' },
  ],
};

/**
 * §3.3, verbatim. Runs before first paint and before React, so the correct theme is on the
 * document even when the stored preference is `system` — which the server cannot resolve.
 * "Zero flash is a Definition-of-Done item."
 */
const THEME_SCRIPT = `(function () {
  try {
    var t = document.cookie.match(/hs-theme=(light|dark|system)/);
    var v = t ? t[1] : 'system';
    var dark = v === 'dark' || (v === 'system' &&
      matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /*
   * The cookie is what makes SSR render the right theme (§3.3). An explicit `dark` can be honoured
   * in the server's own HTML, so the markup is already correct before a single byte of script
   * runs. `system` cannot be resolved on the server — only the inline script above knows the
   * device preference — so it falls through to light and the script corrects it pre-paint.
   */
  const theme = (await cookies()).get('hs-theme')?.value;

  return (
    // `suppressHydrationWarning` is required by next-themes and scoped to this one element: the
    // theme script mutates the class before React hydrates, so the server's markup legitimately
    // differs here and nowhere else.
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={[
        geist.variable,
        newsreader.variable,
        jetbrainsMono.variable,
        notoNaskh.variable,
        theme === 'dark' ? 'dark' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <head>
        {/* §3.3: native scrollbars, form controls and the UA's own colours follow the theme. */}
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          {/* §7.10: bottom-right, one at a time. `richColors` is off — the spec's success toast is
              a quiet neutral surface with a green dot, never a green banner. */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
