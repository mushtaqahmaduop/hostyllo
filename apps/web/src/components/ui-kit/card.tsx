import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Card — docs/15_UI_SPEC_v1.md §6.
 *
 * Flat on the canvas with a hairline border: elevation `e0`, where "90% of the UI lives". Shadows
 * are reserved for things that genuinely float (menus, dialogs, toasts), and the hover-lift is on
 * the §16 hard-NO list — `translateY` plus a growing shadow is the single most template-looking
 * effect there is.
 *
 * `threshold` opts the card into the signature leading-edge bar (§2). Set `data-state="attention"`
 * on it to turn that bar amber when the card holds something a human must act on.
 */
function Card({
  className,
  threshold,
  ...props
}: React.ComponentProps<'div'> & { threshold?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex flex-col rounded-lg border border-hairline bg-surface text-fg',
        threshold && 'hs-threshold',
        className,
      )}
      {...props}
    />
  );
}

/* §5 vertical rhythm: 16 inside cards, 8 from a label to its value. */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex items-start justify-between gap-4 p-4 has-[+[data-slot=card-content]]:pb-0',
        className,
      )}
      {...props}
    />
  );
}

/** §4.2: a card title is `h2` in the scale — 20/28 Geist 600. Max three sizes per card. */
function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('text-h2 font-semibold text-fg', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-body-sm text-fg-secondary', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-action" className={cn('shrink-0', className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-4', className)} {...props} />;
}

/** A footer is separated by a hairline, never by a tinted bar — structure comes from rules (§2). */
function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center gap-3 border-t border-hairline p-4', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
