import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Button — docs/15_UI_SPEC_v1.md §7.5.
 *
 * Four variants, and only four. Primary is indigo because indigo means "you can act on this"
 * (§3.2), and there is at most one per view. Never a gradient, never a shadow on a primary — both
 * are on the §16 hard-NO list, and a shadow in particular reads as a marketing page's call to
 * action rather than an operator's control.
 *
 * Focus is left to the global `:focus-visible` rule in tokens.css (2px indigo ring, 2px offset).
 * shadcn's stock button sets `outline-none` and rebuilds the ring from a box-shadow; that is not
 * done here, because §12 requires one visible focus treatment everywhere and the token file is
 * where it belongs.
 */
const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md font-medium',
    // §9: background and border only. No transform, no scale on hover — the press below is the
    // system's single scale transform.
    'transition-[background-color,border-color,color] duration-instant ease-standard',
    'active:scale-[.98] active:duration-instant',
    'disabled:pointer-events-none disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary: 'bg-brand text-fg-on-brand hover:bg-brand-hover active:bg-brand-active',
        secondary:
          'border border-hairline-strong bg-surface text-fg hover:bg-surface-hover active:bg-surface-active',
        ghost: 'bg-transparent text-fg-secondary hover:bg-surface-hover hover:text-fg',
        /*
         * Red text on a surface, not a red slab. A destructive action in a table row or a toolbar
         * is a choice the user is considering, not one they have committed to — §7.5 reserves the
         * solid red fill for the confirm dialog, where the decision is actually being made.
         */
        destructive:
          'border border-hairline bg-surface text-negative-text hover:bg-negative-tint hover:border-negative/40',
        'destructive-solid': 'bg-negative text-fg-on-brand hover:opacity-90',
        /* Inline links inside prose. Underline on hover only, so ledger text stays quiet. */
        link: 'bg-transparent text-brand-text underline-offset-4 hover:underline',
      },
      size: {
        // §7.5 heights: 36 default, 32 compact/toolbar, 44 mobile. Padding 12/16.
        default: 'h-[var(--hs-control-h)] px-4 text-body',
        sm: 'h-[var(--hs-control-h-sm)] gap-1.5 px-3 text-body-sm',
        touch: 'h-[var(--hs-control-h-touch)] px-4 text-body',
        icon: 'size-[var(--hs-control-h)]',
        'icon-sm': 'size-[var(--hs-control-h-sm)]',
        'icon-touch': 'size-[var(--hs-control-h-touch)]',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Swaps the label for a spinner. The button keeps its width — see below. */
    loading?: boolean;
  };

function Button({
  className,
  variant = 'secondary',
  size = 'default',
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';

  /*
   * §7.5: "Loading state swaps the label for a spinner while preserving the button's width (no
   * layout shift)." The label stays in the DOM at zero opacity rather than being replaced, so the
   * button is still sized by its own text — a spinner-only button would collapse to ~36px and
   * shove everything beside it sideways at the exact moment the user is watching for a result.
   *
   * `asChild` skips it: the caller owns the rendered element and the wrapper spans would land
   * inside someone else's component.
   */
  if (asChild) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <button
      data-slot="button"
      data-loading={loading || undefined}
      disabled={disabled || loading}
      // The result is announced by the toast (§7.10); this keeps a screen reader from reading a
      // half-updated label while the request is in flight.
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>{children}</span>
      {loading && (
        <Loader2 className="absolute animate-spin motion-reduce:animate-none" aria-hidden />
      )}
    </button>
  );
}

export { Button, buttonVariants };
