/**
 * Currency for *documents* — PDF receipts, emails, WhatsApp text.
 *
 * `en-IN`, not `en-PK`. Counter-intuitive for a Pakistani product, but it is the only one of the
 * two that groups by lakh/crore the way Pakistani business does. Measured on Node 20 / ICU:
 *
 *     en-PK → "1,284,500"   currency style → "Rs 1,284,500"
 *     en-IN → "12,84,500"   currency style → "PKR 12,84,500"
 *
 * The `currency` style is never used: it renders "Rs" under en-PK, which docs/15_UI_SPEC_v1.md
 * §4.3 bans outright (along with `₨`, for inconsistent glyph coverage). The prefix is written
 * literally instead.
 *
 * ⚠️ This deliberately duplicates the grouping rule in `apps/web/src/lib/format.ts`. It is not an
 * oversight: the web app cannot import this package, which pulls in `pg` and has no business in a
 * browser bundle. The two are kept honest by `formatters.test.ts`, which asserts the exact output
 * string — if either side drifts to `en-PK`, that test fails.
 *
 * The split differs by medium, and that is intentional. On screen the "PKR" prefix is a separate
 * element in caption type so the numerals carry the weight (§4.3); in a PDF or an SMS there is no
 * DOM to style, so prefix and digits are one string.
 */
const DOC_AMOUNT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const DOC_AMOUNT_2DP = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtPkr(amount: number | string | null | undefined, decimals: 0 | 2 = 0): string {
  const n = Number(amount ?? 0);
  // A receipt showing "PKR NaN" is worse than one showing zero, and the caller has no way to
  // recover mid-render — the row came from the database, so a non-numeric value is a bug upstream.
  if (!Number.isFinite(n)) return 'PKR 0';
  return `PKR ${decimals === 2 ? DOC_AMOUNT_2DP.format(n) : DOC_AMOUNT.format(n)}`;
}

export function fmtCnic(cnic: string): string {
  const digits = cnic.replace(/\D/g, '');
  if (digits.length !== 13) return cnic;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function fmtPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+92${digits.slice(1)}`;
  }
  return phone;
}