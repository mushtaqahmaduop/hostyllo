import type { Tone } from '@/lib/dashboard/contract';

/**
 * Tone → CSS custom property.
 *
 * Returned as `var(--hs-…)` strings rather than Tailwind class names because
 * most of the places a tone is used are values, not classes: an SVG `stroke`, a
 * `stroke-dasharray` segment colour, the background of a seat cell whose state
 * is only known at runtime. Tailwind cannot generate a class for a colour it has
 * not seen in source, so `bg-${tone}-tint` compiles to nothing — silently, which
 * is the worst kind of nothing.
 *
 * Where the tone *is* static and known at author time, use the Tailwind utility
 * (`text-attention`, `bg-brand-tint`) instead. This is for the dynamic half.
 */

const BASE: Record<Tone, string> = {
  neutral: 'var(--hs-text-secondary)',
  brand: 'var(--hs-brand-text)',
  attention: 'var(--hs-attention)',
  negative: 'var(--hs-negative)',
  info: 'var(--hs-info)',
  positive: 'var(--hs-positive)',
};

const TINT: Record<Tone, string> = {
  neutral: 'var(--hs-surface-hover)',
  brand: 'var(--hs-brand-tint)',
  attention: 'var(--hs-attention-tint)',
  negative: 'var(--hs-negative-tint)',
  info: 'var(--hs-info-tint)',
  positive: 'var(--hs-positive-tint)',
};

const BORDER: Record<Tone, string> = {
  neutral: 'var(--hs-hairline)',
  brand: 'var(--hs-brand-border)',
  attention: 'var(--hs-attention-border)',
  negative: 'var(--hs-negative-border)',
  info: 'var(--hs-info-border)',
  positive: 'var(--hs-positive-border)',
};

/** The stroke, the glyph, the text sitting on `toneTint`. */
export function toneColor(tone: Tone): string {
  return BASE[tone];
}

/** The soft fill behind an icon, a pill, a seat cell. */
export function toneTint(tone: Tone): string {
  return TINT[tone];
}

/** The hairline around a tinted pill or tile. */
export function toneBorder(tone: Tone): string {
  return BORDER[tone];
}

/**
 * The five-stop violet ramp, light → dark.
 *
 * For slices that are magnitudes of *one* thing: shares of a single collection
 * total, room types within one inventory. One hue, so it is a ramp and not a
 * rainbow, and adjacent slices still separate because the stops are two steps
 * apart.
 */
export const RAMP = [
  'var(--hs-ramp-1)',
  'var(--hs-ramp-2)',
  'var(--hs-ramp-3)',
  'var(--hs-ramp-4)',
  'var(--hs-ramp-5)',
] as const;

/**
 * Chart series. Violet carries the subject, warm neutral carries whatever it is
 * being compared against, light violet carries a genuine third line.
 *
 * The handoff bundle's instruction, verbatim: violet + neutral greys, "except
 * where a chart legend genuinely needs a second series colour".
 */
export const SERIES = {
  subject: 'var(--hs-series-1)',
  compare: 'var(--hs-series-2)',
  third: 'var(--hs-series-3)',
} as const;
