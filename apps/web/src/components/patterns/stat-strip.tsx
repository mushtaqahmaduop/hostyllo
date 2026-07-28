import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Stat strip — docs/15_UI_SPEC_v1.md §7.2.
 *
 * Label above value, separated by vertical hairlines. No icons, no card borders, no colour unless
 * something is action-required. §1's kill list names "every KPI card with its own coloured
 * circular icon" and "a card per metric, six across" for the same reason: seven icons make seven
 * focal points, which is the same as none.
 *
 * Max four. That is a real limit, not a suggestion — a fifth column at 1366px starts wrapping the
 * labels, and a wrapped stat strip reads as a bug.
 */
export function StatStrip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        // Wraps to two columns before it wraps a label. Below 640 the vertical rules are dropped
        // by the item itself — a hairline between stacked rows would read as a table.
        items.length > 2 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2',
        className,
      )}
    >
      {items}
    </dl>
  );
}

export function StatItem({
  label,
  children,
  hint,
  attention,
  className,
}: {
  label: string;
  /** The value. A `<Money>`, `<Num>` or `<Pct>` — never a raw string of digits. */
  children: React.ReactNode;
  /** Second line of context: "18 of 24 beds", "target PKR 4,00,000". */
  hint?: string;
  /** §3.2: amber only where a human must act. Not for "this number is interesting". */
  attention?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // The vertical rule sits on the inline-start edge of every item except the first in its
        // row, which is what `[&:not(:first-child)]` plus the responsive reset below achieves
        // without knowing the column count at build time.
        'ps-6 [&:nth-child(2n+1)]:ps-0 md:[&:nth-child(2n+1)]:ps-6 md:[&:first-child]:ps-0',
        'border-s border-hairline [&:nth-child(2n+1)]:border-s-0 md:[&:nth-child(2n+1)]:border-s md:[&:first-child]:border-s-0',
        className,
      )}
    >
      <dt className="text-body-sm text-fg-secondary">{label}</dt>
      <dd
        className={cn(
          'mt-2 text-h2 font-semibold text-fg',
          attention && 'text-attention-text',
        )}
      >
        {children}
      </dd>
      {hint && <p className="mt-1 text-caption text-fg-tertiary">{hint}</p>}
    </div>
  );
}
