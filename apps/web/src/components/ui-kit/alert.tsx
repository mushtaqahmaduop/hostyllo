import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Alert — the inline banner for §10's error, offline and stale states.
 *
 * Tinted surface with a hairline, never a saturated slab: §3.2 allows colour on the leading bar,
 * the badge and a low-alpha background, and nothing else. The tone carries the leading threshold
 * bar so the eye finds it by scanning the left edge (§2), the same way it finds everything else
 * that needs attention.
 */
const alertVariants = cva(
  [
    'hs-threshold relative grid w-full grid-cols-[0_1fr] items-start gap-y-1',
    'rounded-lg border py-3 pe-4 text-body',
    "has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5",
  ],
  {
    variants: {
      tone: {
        neutral: 'border-hairline bg-surface text-fg',
        attention: 'border-transparent bg-attention-tint text-attention-text',
        negative: 'border-transparent bg-negative-tint text-negative-text',
        positive: 'border-transparent bg-positive-tint text-positive-text',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

function Alert({
  className,
  tone = 'neutral',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      /*
       * `alert` interrupts a screen reader, which is right for a failure and wrong for a
       * confirmation. A positive banner is announced politely as a `status`; a neutral one is
       * ordinary prose and announces nothing.
       */
      role={tone === 'negative' || tone === 'attention' ? 'alert' : tone === 'positive' ? 'status' : undefined}
      // §2: the bar turns amber wherever the section holds something a human must act on.
      data-state={tone === 'attention' ? 'attention' : undefined}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('col-start-2 min-h-4 font-semibold', className)}
      {...props}
    />
  );
}

/**
 * §10: an error states what failed and the next step. A raw error code never goes in the user's
 * face — put it behind a "Details" disclosure for support.
 */
function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn('col-start-2 grid justify-items-start gap-1 text-body-sm opacity-90', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
