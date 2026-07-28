'use client';

import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Label — docs/15_UI_SPEC_v1.md §7.7.
 *
 * Always above the field, never floating. Floating labels fail twice here: they break with Urdu,
 * and they vanish the moment a field has content, which is exactly when an operator re-reads the
 * form to check what they typed.
 *
 * 13px secondary — the label is the quieter half of the pair; the value the user entered is what
 * should read first (§3.2's three levels of grey).
 */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-body-sm font-medium text-fg-secondary select-none',
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
