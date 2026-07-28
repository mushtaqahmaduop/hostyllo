'use client';

import { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

/**
 * Theme switching — docs/15_UI_SPEC_v1.md §3.3.
 *
 * Three states, not two. `system` is the default because a warden on a phone in a dim corridor and
 * an owner on a 1366×768 laptop in daylight want opposite things, and the device already knows
 * which. Dark mode is a first-class theme here, not an inverted stylesheet.
 *
 * `attribute="class"` matches the spec's `class="dark"` on `<html>`, which is also what shadcn's
 * `dark:` variants expect — the previous `data-theme` attribute came from the superseded
 * docs/04_UX_DESIGN_SYSTEM.md.
 *
 * `disableTransitionOnChange` is deliberate: §9 allows a 180ms crossfade on background and border
 * colours only, and the library's blanket transition would drag text colour along with it, which
 * reads as a rendering bug rather than a theme change.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={['light', 'dark', 'system']}
      storageKey="hs-theme"
      disableTransitionOnChange
    >
      <ThemeCookieMirror />
      {children}
    </NextThemesProvider>
  );
}

/**
 * next-themes persists to localStorage, which the server cannot read. The layout needs the choice
 * at request time to put `class="dark"` in the HTML it sends — otherwise the correct theme only
 * arrives once the pre-paint script runs, and a user with a slow or blocked script sees the wrong
 * one. Mirroring the same value to a cookie closes that gap; the cookie is a mirror, never the
 * source, so the two cannot disagree about who wins.
 *
 * `SameSite=Lax` because it is only ever read by this app's own document requests, and no `Secure`
 * on localhost — production is HTTPS-only, where the browser sets it implicitly for the host.
 */
function ThemeCookieMirror() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!theme) return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    // One year: the preference should outlive a browser restart without becoming permanent.
    document.cookie = `hs-theme=${theme}; path=/; max-age=31536000; SameSite=Lax${secure}`;
  }, [theme]);

  return null;
}
