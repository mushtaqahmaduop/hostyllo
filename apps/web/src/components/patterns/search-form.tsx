import { Search } from 'lucide-react';

import { Button } from '@/components/ui-kit/button';
import { Input } from '@/components/ui-kit/input';
import { cn } from '@/lib/utils';

/**
 * A plain GET search form.
 *
 * No debounced typeahead. The query lands in the URL, so a search survives a refresh, can be
 * bookmarked or sent to a colleague, works with the back button, and needs no JavaScript at all.
 * On the connections this product runs over that is also one request instead of one per keystroke
 * — and §11's budget is written for exactly those connections.
 *
 * Filters are rendered as hidden inputs so a search does not silently discard the month or status
 * the operator already chose.
 */
export function SearchForm({
  action,
  defaultValue,
  label,
  placeholder = 'Search name or phone',
  hidden,
  children,
  className,
}: {
  /** The page's own path. Omitted, the form posts to the current URL, which is usually right. */
  action?: string;
  defaultValue?: string;
  /** The accessible name. The visible placeholder is not a label (§7.7). */
  label: string;
  placeholder?: string;
  /** Filters to carry forward, e.g. `{ month: '2026-07', status: 'pending' }`. */
  hidden?: Record<string, string | undefined>;
  /** Extra controls rendered inline — a month picker, a status select. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <form method="GET" action={action} className={cn('mb-6 flex flex-wrap items-end gap-3', className)}>
      {Object.entries(hidden ?? {}).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}

      <div className="relative min-w-[220px] flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary"
        />
        <Input
          type="search"
          name="q"
          defaultValue={defaultValue ?? ''}
          placeholder={placeholder}
          aria-label={label}
          className="ps-9"
        />
      </div>

      {children}

      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}
