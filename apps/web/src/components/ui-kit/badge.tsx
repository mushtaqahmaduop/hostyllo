import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Badge / status pill — docs/15_UI_SPEC_v1.md §7.6.
 *
 * Small radius, not a pill: `rounded-full` on a text badge is the consumer-template tell, and §6
 * reserves the full radius for avatars and status dots. Tint background with solid text, never a
 * saturated slab.
 */
const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap',
    'rounded-sm px-2 py-1.5 text-eyebrow font-semibold uppercase tracking-wide',
    '[&>svg]:pointer-events-none [&>svg]:size-3',
  ],
  {
    variants: {
      tone: {
        /* The default. Most states are not events — they are just the state. */
        neutral: 'bg-surface-sunken text-fg-secondary',
        /* Money confirmed, and nothing else (§3.2). */
        positive: 'bg-positive-tint text-positive-text',
        /* A human must act. If a screen shows more than ~6 of these, group them instead (§3.2). */
        attention: 'bg-attention-tint text-attention-text',
        /* Failed or cancelled — not merely unpaid. */
        negative: 'bg-negative-tint text-negative-text',
        /* Occupied, selected, in-scope: the indigo "this is live" state. */
        brand: 'bg-brand-tint text-brand-text',
        /* Editorial / held. Non-interactive by definition. */
        accent: 'bg-accent-tint text-accent',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

function Badge({
  className,
  tone = 'neutral',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
  );
}

/**
 * The fixed status vocabulary (§7.6) — "do not invent new statuses".
 *
 * Keys are the values the API actually returns; the label is what the operator reads. Where the
 * domain has a status the spec's list does not name, it is mapped onto an existing *tone* rather
 * than given a new colour, so the palette stays closed:
 *
 *   `partial` and `pending` are money still owed but not yet late — neutral "Due", not amber.
 *     Amber is spent on overdue only; if every unpaid invoice were amber the colour would stop
 *     meaning "act now" by the second of the month.
 *   `void` reads as Refunded's neighbour: reversed, nothing to chase, neutral.
 *
 * Colour is never the only channel (§12) — every pill carries its word.
 */
const STATUS: Record<string, { label: string; tone: NonNullable<VariantProps<typeof badgeVariants>['tone']> }> = {
  // Money
  paid: { label: 'Paid', tone: 'positive' },
  partial: { label: 'Partial', tone: 'neutral' },
  pending: { label: 'Due', tone: 'neutral' },
  due: { label: 'Due', tone: 'neutral' },
  overdue: { label: 'Overdue', tone: 'attention' },
  failed: { label: 'Failed', tone: 'negative' },
  refunded: { label: 'Refunded', tone: 'neutral' },
  void: { label: 'Void', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'negative' },

  // Beds and rooms
  occupied: { label: 'Occupied', tone: 'brand' },
  vacant: { label: 'Vacant', tone: 'neutral' },
  reserved: { label: 'Reserved', tone: 'accent' },
  maintenance: { label: 'Maintenance', tone: 'attention' },

  // Records
  active: { label: 'Active', tone: 'neutral' },
  inactive: { label: 'Inactive', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'neutral' },
};

/**
 * An unknown status renders its own raw value in neutral rather than being swallowed. A new status
 * shipped by the API should look unstyled and obvious, not silently identical to "Active".
 */
function StatusBadge({ status, className }: { status: string; className?: string }) {
  const known = STATUS[status?.toLowerCase()];
  return (
    <Badge tone={known?.tone ?? 'neutral'} className={className}>
      {known?.label ?? status}
    </Badge>
  );
}

export { Badge, StatusBadge, badgeVariants };
