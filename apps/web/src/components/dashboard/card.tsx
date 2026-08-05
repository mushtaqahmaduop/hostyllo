import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The dashboard card.
 *
 * One shape, used eleven times: 12px radius, 1px hairline, 13px padding, and
 * `bg-surface` — which is a step *brighter* than the canvas it sits on. That
 * brightness plus the hairline is the whole of its elevation. There is no
 * shadow, and adding one would flatten the ladder the rest of the system is
 * built on.
 *
 * Defined once because the alternative is eleven copies of the same five
 * utilities and a slow drift where three of them end up at 10px padding.
 */
export function Card({
  className,
  children,
  ...rest
}: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-xl border border-hairline bg-surface p-[13px]',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

/**
 * A card's title row, with an optional trailing link or control.
 *
 * The title is an `<h2>` — the page has one `<h1>` and eleven cards under it, so
 * this is the level that makes the screen navigable by heading for anyone using
 * a screen reader. The redesign styles it at 15px, which is a size, not a rank.
 */
export function CardTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <h2 className="flex-1 text-h3 font-semibold tracking-snug">{children}</h2>
      {action}
    </div>
  );
}

/** The "View all →" affordance in a card's title row. */
export function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      // Secondary text, not accent. The accent is spent on the screen's one
      // filled action; a "View all" on every card would spend it eleven times.
      className="flex shrink-0 items-center gap-[5px] whitespace-nowrap text-caption font-medium text-fg-secondary hover:text-fg"
    >
      {children}
      <ArrowRight className="size-[13px]" aria-hidden />
    </Link>
  );
}
