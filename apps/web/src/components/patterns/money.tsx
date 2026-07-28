import { formatAmount, formatPct, EM_DASH } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Money — docs/15_UI_SPEC_v1.md §4.3, the three numeric tiers in one component.
 *
 * "PKR" is a separate span in caption type and tertiary grey, never part of the formatted string:
 * the currency is context the reader already has, and the numerals are the information. The spec
 * bans both `₨` (inconsistent glyph coverage across the fonts and printers this product meets)
 * and `Rs.`, which is why the formatter deliberately never uses `Intl`'s currency style —
 * see lib/format.ts for the measurement behind that.
 */
export function Money({
  value,
  tier = 'inline',
  decimals = 0,
  className,
}: {
  value: number | string | null | undefined;
  /**
   * `ledger` — table cells, mono, aligned on the end edge.
   * `inline` — a figure inside a sentence, sans with tabular digits.
   * `hero`   — the one figure per screen. Use `<HeroFigure>` instead; it adds the count-up.
   */
  tier?: 'ledger' | 'inline' | 'hero';
  /** Two decimals in invoices, receipts and reconciliation. Zero in KPIs and lists (§4.3). */
  decimals?: 0 | 2;
  className?: string;
}) {
  const digits = formatAmount(value, { decimals });

  // Unknown is not zero. An em dash says "we don't have this", which is a different and more
  // honest statement than "PKR 0" — and the operator acts differently on each.
  if (digits === EM_DASH) {
    return <span className={cn('text-fg-tertiary tabular-nums', className)}>{EM_DASH}</span>;
  }

  return (
    <span
      className={cn(
        'tabular-nums whitespace-nowrap',
        tier === 'ledger' && 'font-mono text-mono',
        tier === 'hero' && 'font-sans text-hero font-medium tracking-tight',
        className,
      )}
    >
      <span
        className={cn(
          'me-1 font-sans font-normal text-fg-tertiary',
          tier === 'hero' ? 'text-h3' : 'text-caption',
        )}
      >
        PKR
      </span>
      {digits}
    </span>
  );
}

/**
 * A bare number in a sentence — counts, bed numbers, student totals (§4.3 Tier 3).
 * Tabular because any number that can update must not make the text around it jitter.
 */
export function Num({
  value,
  className,
}: {
  value: number | string | null | undefined;
  className?: string;
}) {
  const digits = formatAmount(value);
  return (
    <span
      className={cn(
        'tabular-nums',
        digits === EM_DASH ? 'text-fg-tertiary' : 'font-medium',
        className,
      )}
    >
      {digits}
    </span>
  );
}

/**
 * A percentage, one decimal (§4.3).
 *
 * `zeroIsNeutral` exists because of §3.2's sharpest rule: "Green is never a background for a zero.
 * Zero occupancy renders in tertiary, not green." A hostel with nobody in it is not a success, and
 * the reference dashboards that paint it green are lying to the operator about their own business.
 */
export function Pct({
  value,
  className,
}: {
  value: number | string | null | undefined;
  className?: string;
}) {
  const n = Number(value ?? NaN);
  const isZero = Number.isFinite(n) && n === 0;
  return (
    <span className={cn('tabular-nums', isZero && 'text-fg-tertiary', className)}>
      {formatPct(value)}
    </span>
  );
}
