import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Input — docs/15_UI_SPEC_v1.md §7.7.
 *
 * Height 36, radius 6, hairline border. Focus is the global 2px indigo ring at 2px offset from
 * tokens.css — not rebuilt here as a box-shadow, so every focusable thing in the product looks
 * the same (§12).
 *
 * `numeric` switches the field to the mono face: §4.3 Tier 2 covers currency, CNIC, phone and
 * receipt numbers, and a 13-digit CNIC typed into a proportional font is genuinely harder to
 * check against the card in the operator's hand.
 */
function Input({
  className,
  type,
  numeric,
  ...props
}: React.ComponentProps<'input'> & { numeric?: boolean }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-[var(--hs-control-h)] w-full min-w-0 rounded-md border border-hairline bg-surface px-3',
        'text-body text-fg placeholder:text-fg-tertiary',
        'transition-[border-color] duration-instant ease-standard',
        'hover:border-hairline-strong',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // §7.7: the error state replaces the helper text and reddens the border. The message that
        // explains the fix is the FormField's job — this is only the field's own signal.
        'aria-invalid:border-negative',
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-body-sm file:font-medium file:text-fg",
        numeric && 'font-mono text-mono tabular-nums',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
