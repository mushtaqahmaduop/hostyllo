'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Theme switching.
 *
 * `attribute="data-theme"` is not the library default (`class` is) — it is chosen to match
 * docs/04_UX_DESIGN_SYSTEM.md §2, which defines both palettes under `:root[data-theme="…"]`. The
 * spec picked the attribute; this follows it rather than the other way round.
 *
 * `enableSystem` is off deliberately. The spec names dark as the product's default, and for a
 * warden reading a screen in a dim corridor that is the correct starting point regardless of what
 * their phone's OS is set to. They can still switch, and the choice persists.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      themes={['dark', 'light']}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
