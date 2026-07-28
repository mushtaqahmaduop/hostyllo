'use client';

import * as React from 'react';

import { Money } from '@/components/patterns/money';
import { Separator } from '@/components/ui-kit/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui-kit/tooltip';
import { formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * KPI hero panel — docs/15_UI_SPEC_v1.md §7.1, and the load-bearing piece of §2 Law 1.
 *
 * One hero figure per screen. Not four cards of equal weight — a row of same-sized tiles has no
 * hierarchy, so the eye has to read all of them to find the one that matters. The supporting
 * figures live in a single hairline-separated strip beneath, which is a strip and not four cards
 * precisely so they cannot compete.
 */
export function HeroPanel({
  eyebrow,
  value,
  format = 'money',
  definition,
  delta,
  children,
  className,
}: {
  /** e.g. `COLLECTED · JULY 2026`. The eyebrow says what the figure is; the figure is just money. */
  eyebrow: string;
  value: number | string | null | undefined;
  /**
   * Almost every hero in this product is money, which is why that is the default. Rooms is the
   * exception — there the question is beds, not cash — and a screen whose hero is a percentage
   * should still be the same component, so the count-up, the tooltip and the type treatment do
   * not get reimplemented once per unit.
   */
  format?: 'money' | 'percent';
  /**
   * §1's best idea, stolen from the Lead Tracker reference: "every derived metric shows its
   * definition on hover". Operators argue about what "collected" means — whether it includes
   * advance rent, whether a voided receipt is deducted — and the UI is meant to settle that
   * argument rather than restate it.
   */
  definition?: string;
  /** Never a naked ▲12%. `formatDelta()` returns null when there is no baseline to state. */
  delta?: { label: string; direction: 'up' | 'down' | 'flat' } | null;
  /** The supporting strip — `<StatStrip>`. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <section
        aria-label={eyebrow}
        className={cn(
          'hs-threshold rounded-lg border border-hairline bg-surface p-6',
          className,
        )}
      >
        <p className="hs-eyebrow">{eyebrow}</p>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          {definition ? (
            <Tooltip>
              <TooltipTrigger
                // A button, not a bare span: §12 requires the definition to be reachable by
                // keyboard, and a hover-only tooltip is invisible to anyone who does not use a
                // mouse — which on this product includes anyone working from a phone.
                type="button"
                className="cursor-help text-start"
              >
                <HeroFigure value={value} format={format} />
              </TooltipTrigger>
              <TooltipContent side="bottom">{definition}</TooltipContent>
            </Tooltip>
          ) : (
            <HeroFigure value={value} format={format} />
          )}

          {delta && (
            <span
              className={cn(
                'text-body-sm tabular-nums',
                // Direction is not sentiment. Money collected rising is good; expenses rising is
                // not — so the caller says what a rise means and this only renders it.
                delta.direction === 'flat' ? 'text-fg-tertiary' : 'text-fg-secondary',
              )}
            >
              {delta.label}
            </span>
          )}
        </div>

        {children && (
          <>
            <Separator className="my-5" />
            {children}
          </>
        )}
      </section>
    </TooltipProvider>
  );
}

/**
 * §9, step 3 of the first-paint choreography: the figure counts up from zero over 560ms, once per
 * session — not on every client-side navigation back to the dashboard, which would turn a
 * signature moment into a tic.
 *
 * Tabular figures are what make this safe to animate at all: with proportional digits the number
 * changes width on almost every frame and drags the delta beside it back and forth. `prefers-
 * reduced-motion` renders the final value immediately (§9 hard limits).
 */
function HeroFigure({
  value,
  format,
}: {
  value: number | string | null | undefined;
  format: 'money' | 'percent';
}) {
  const target = Number(value ?? NaN);
  // A percentage counting up to 82.7 in whole steps looks like a progress bar, not a figure, so
  // only money animates. Percentages render at their value immediately.
  const animatable = format === 'money' && Number.isFinite(target) && target !== 0;

  const [display, setDisplay] = React.useState<number | null>(animatable ? 0 : null);

  React.useEffect(() => {
    if (!animatable) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const alreadyRan = window.sessionStorage.getItem(SESSION_KEY) === '1';

    if (reduced || alreadyRan) {
      setDisplay(null);
      return;
    }
    window.sessionStorage.setItem(SESSION_KEY, '1');

    let frame = 0;
    const start = performance.now();
    // Matches --hs-dur-count. Read from the stylesheet rather than restated, so the token stays
    // the single place the duration is defined (§16.17).
    const duration =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hs-dur-count')) || 560;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out: fast off the mark, settling into the final value rather than snapping to it.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(t >= 1 ? null : Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [animatable, target]);

  if (format === 'percent') {
    return (
      <span
        className={cn(
          'font-sans text-hero font-medium tracking-tight tabular-nums',
          Number(value ?? NaN) === 0 && 'text-fg-tertiary',
        )}
      >
        {formatPct(value)}
      </span>
    );
  }

  // `display === null` means "show the real value" — including the case where it is genuinely
  // zero, which must render `PKR 0` and never an em dash (§4.3).
  return <Money value={display === null ? value : display} tier="hero" />;
}

const SESSION_KEY = 'hs:hero-counted';
