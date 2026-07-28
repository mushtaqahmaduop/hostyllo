/**
 * Display formatting — the numeric doctrine, docs/15_UI_SPEC_v1.md §4.3.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * A deliberate correction to the spec, made once, here.
 *
 * §4.3 says: "`PKR 1,25,430` — Pakistani lakh/crore grouping via `Intl.NumberFormat('en-PK')`".
 * Those two halves contradict each other. Measured on Node 20 / ICU:
 *
 *     en-PK → "1,284,500"   currency → "Rs 1,284,500"
 *     en-IN → "12,84,500"   currency → "PKR 12,84,500"
 *
 * `en-PK` uses Western three-digit grouping, and its currency form renders the symbol as "Rs" —
 * which §4.3 bans in the very next bullet. `en-IN` is the locale that actually produces the lakh
 * grouping the spec asks for and prints in its own §5 mockup ("PKR 12,84,500").
 *
 * So: grouping comes from `en-IN`, and the currency style is not used at all. The digits are
 * formatted alone and the "PKR" prefix is rendered by the `<Money>` component in caption/tertiary
 * type (§4.3 "the numerals carry the weight"). That also settles the old CLAUDE.md rule about
 * never pairing `fmtPKR()` with a `pkr` span — the formatter no longer emits a symbol, so the two
 * cannot be doubled up.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

const GROUPED = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const GROUPED_2DP = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Coerce an API value to a number, or `null` when there is genuinely nothing to show.
 *
 * The API returns NUMERIC and COUNT columns as strings on some endpoints (see tasks/todo — the
 * `dashboard.ts` coercion gap), so `"11000.00"` has to survive the trip. `null` is preserved as
 * `null` rather than collapsing to 0, because §4.3 is explicit that zero and unknown are different
 * facts: a real zero renders `PKR 0`, an unknown renders an em dash.
 */
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** The em dash §4.3 requires for "unknown / not yet loaded". Never `0` as a placeholder. */
export const EM_DASH = '—';

/**
 * Grouped digits, no symbol. `decimals: 2` for invoices, receipts and reconciliation views;
 * zero decimals everywhere else (§4.3).
 */
export function formatAmount(
  value: number | string | null | undefined,
  { decimals = 0 }: { decimals?: 0 | 2 } = {},
): string {
  const n = toNumber(value);
  if (n === null) return EM_DASH;
  return decimals === 2 ? GROUPED_2DP.format(n) : GROUPED.format(n);
}

/**
 * Chart axes and sparkline labels only (§4.3): "abbreviate only above 10 lakh, never in a ledger
 * cell, never in an invoice". A rounded figure in a reconciliation view is a wrong figure.
 */
export function formatAmountCompact(value: number | string | null | undefined): string {
  const n = toNumber(value);
  if (n === null) return EM_DASH;
  const abs = Math.abs(n);
  if (abs < 1_000_000) return GROUPED.format(n);
  if (abs < 10_000_000) return `${(n / 100_000).toFixed(1)} lakh`;
  return `${(n / 10_000_000).toFixed(1)} crore`;
}

/** §4.3: percentages carry one decimal. `82.7%`, not `83%`. */
export function formatPct(value: number | string | null | undefined): string {
  const n = toNumber(value);
  if (n === null) return EM_DASH;
  return `${n.toFixed(1)}%`;
}

/**
 * §4.3 UI date: `05 Jul 2026`. Two-digit day so a column of dates aligns without the mono face.
 * `en-GB` is the locale that reliably produces that order and padding.
 */
const UI_DATE = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? UI_DATE.format(d) : EM_DASH;
}

/** §4.3 export/filter date: `2026-07-05`. Sortable as text, unambiguous across locales. */
export function formatDateIso(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? d.toISOString().slice(0, 10) : EM_DASH;
}

/**
 * §4.3: relative time only under 24 hours, "and always with an absolute `title` attribute".
 * Returns both halves so the caller cannot ship one without the other.
 */
export function formatRelative(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): { label: string; title: string } {
  const d = toDate(value);
  if (!d) return { label: EM_DASH, title: '' };

  const title = `${UI_DATE.format(d)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60_000);

  if (minutes < 0 || minutes >= 1440) return { label: UI_DATE.format(d), title };
  if (minutes < 1) return { label: 'just now', title };
  if (minutes < 60) return { label: `${minutes} minute${minutes === 1 ? '' : 's'} ago`, title };

  const hours = Math.floor(minutes / 60);
  return { label: `${hours} hour${hours === 1 ? '' : 's'} ago`, title };
}

/** The "Data as of 10:42 AM" stamp the sidebar and the stale banner both carry (§7.8, §10). */
export function formatClock(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return EM_DASH;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * §4.3: "Deltas always carry a baseline: `▲ 12.4% vs last month`. Arrow + colour + baseline, or
 * nothing." Returns `null` when there is no comparison to make, so a caller that has no baseline
 * renders nothing at all rather than a naked, meaningless percentage.
 *
 * `direction` is the raw movement. Whether up is good is the caller's business — expenses rising
 * is not a success — so this deliberately does not decide the colour.
 */
export function formatDelta(
  current: number | string | null | undefined,
  previous: number | string | null | undefined,
  baselineLabel: string,
): { label: string; direction: 'up' | 'down' | 'flat' } | null {
  const now = toNumber(current);
  const before = toNumber(previous);
  if (now === null || before === null || before === 0) return null;

  const pct = ((now - before) / Math.abs(before)) * 100;
  const direction = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—';

  return { label: `${arrow} ${Math.abs(pct).toFixed(1)}% vs ${baselineLabel}`, direction };
}
