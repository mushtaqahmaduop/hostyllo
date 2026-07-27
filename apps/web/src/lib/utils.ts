import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with later ones winning.
 *
 * `clsx` handles the conditionals; `twMerge` resolves conflicts — without it, `cn('p-2', 'p-4')`
 * emits both and the winner depends on stylesheet order rather than on the call site. Every
 * shadcn/ui component expects this helper at exactly this path.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
