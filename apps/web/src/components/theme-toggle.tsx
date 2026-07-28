'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui-kit/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-kit/dropdown-menu';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

/**
 * Theme switch — docs/15_UI_SPEC_v1.md §3.3: three states, not a two-way toggle.
 *
 * `system` has to be reachable, and it cannot be if the control is a single button that flips
 * between light and dark: a user who once tapped "dark" would be stuck overriding their device
 * forever with no way back.
 *
 * The trigger renders a fixed icon until mounted. The stored choice is only readable on the
 * client, so naming the current theme during SSR would either mismatch the markup React hydrates
 * or flicker on load — and §11 puts a hard CLS budget on exactly that kind of shift.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const Icon = mounted && resolvedTheme === 'light' ? Sun : Moon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Theme">
          <Icon className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setTheme(option.value)}
            // The current choice is marked by a word, not only by a highlight (§12).
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <option.icon className="size-4" aria-hidden />
              {option.label}
            </span>
            {mounted && theme === option.value && (
              <span className="text-caption text-fg-tertiary">Current</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
