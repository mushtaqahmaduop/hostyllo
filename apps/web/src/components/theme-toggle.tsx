'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui-kit/button';

/**
 * Dark/light switch for the header (spec §5, "Header Contents").
 *
 * Renders a fixed placeholder until mounted. The stored theme is only readable on the client, so
 * naming the current one during SSR would either mismatch the markup React then hydrates, or make
 * the button flicker from "Light" to "Dark" on load. Reserving the space keeps the header from
 * shifting — spec §10: never animate a layout shift under content the user is reading.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme !== 'light';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={mounted ? `Switch to ${isDark ? 'light' : 'dark'} theme` : 'Switch theme'}
      title={mounted ? `Switch to ${isDark ? 'light' : 'dark'} theme` : undefined}
      className="text-text-muted hover:text-text"
    >
      {mounted && !isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
