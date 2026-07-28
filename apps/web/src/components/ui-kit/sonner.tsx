'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';

/**
 * Toasts — docs/15_UI_SPEC_v1.md §7.10.
 *
 * Bottom-right, 4s, one at a time with the rest queued. `richColors` is deliberately off: the spec
 * asks for a quiet neutral surface with a green dot, not a green banner — a full-width coloured
 * slab for "Payment recorded" spends the same visual budget as a failed transaction, and §3.2
 * only lets colour mean one thing at a time.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position="bottom-right"
      duration={4000}
      // "One at a time (queue the rest)." Three stacked toasts is a notification centre, and an
      // operator recording six payments in a row should see six confirmations in sequence, not a
      // pile that obscures the form underneath.
      visibleToasts={1}
      closeButton
      icons={{
        // The status dot, not an icon. Colour plus the word in the message body — §12's "colour is
        // never the only channel" — without a second focal point competing with the text.
        success: <span aria-hidden className="size-2 rounded-full bg-positive" />,
        error: <span aria-hidden className="size-2 rounded-full bg-negative" />,
        warning: <span aria-hidden className="size-2 rounded-full bg-attention" />,
        info: <span aria-hidden className="size-2 rounded-full bg-fg-tertiary" />,
      }}
      style={
        {
          '--normal-bg': 'var(--hs-surface-raised)',
          '--normal-text': 'var(--hs-text-primary)',
          '--normal-border': 'var(--hs-hairline)',
          '--border-radius': 'var(--hs-radius-lg)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

/**
 * The two call sites that matter, wrapped so the §7.10 rules cannot be forgotten at a call site.
 *
 * `notify.failure` never auto-dismisses and takes a retry action: a toast that vanishes after four
 * seconds is the wrong place to report that a payment did not save, because the one user who most
 * needs to see it is the one who already looked away.
 *
 * Copy rule (§14): the toast matches the button that triggered it — "Record payment" →
 * "Payment recorded".
 */
const notify = {
  success: (message: string) => toast.success(message),
  failure: (message: string, retry?: { label: string; onClick: () => void }) =>
    toast.error(message, { duration: Infinity, action: retry }),
};

export { Toaster, notify };
