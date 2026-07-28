import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Page header — docs/15_UI_SPEC_v1.md §5.
 *
 * Carries the Threshold Rule: a 2px indigo bar on the leading edge, turning amber when the page
 * holds something a human must act on. §2 calls this "the product's one memorable device: you
 * learn to scan the left edge of the screen for trouble." It is on the leading edge — logical, not
 * left — so it mirrors correctly in Urdu (§13).
 *
 * The title is Newsreader at 30/36: the one place an editorial serif appears in the chrome, and
 * the reason a HOSTYLLO screen reads as a financial report rather than an admin panel.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  attention,
  className,
}: {
  /** Section or scope: `PAYMENTS`, `JULY 2026`. Optional — not every page needs one. */
  eyebrow?: string;
  title: string;
  /** One sentence at most. If it needs two, it belongs in the page, not the header. */
  description?: string;
  /** §7.5: at most one primary button per view. Everything else is secondary or ghost. */
  actions?: React.ReactNode;
  /** Turns the threshold bar amber. */
  attention?: boolean;
  className?: string;
}) {
  return (
    <header
      data-state={attention ? 'attention' : undefined}
      className={cn('hs-threshold mb-8 flex flex-wrap items-start gap-x-6 gap-y-3', className)}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="hs-eyebrow mb-1">{eyebrow}</p>}
        <h1 className="font-display text-display font-normal tracking-snug text-fg">{title}</h1>
        {description && (
          // 72ch measure (§4.2). A full-width sentence across a 1440px canvas is unreadable.
          <p className="mt-2 max-w-[72ch] text-body text-fg-secondary">{description}</p>
        )}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  );
}
