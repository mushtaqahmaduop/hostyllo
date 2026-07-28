import { describe, it, expect } from 'vitest';
import { fmtPkr, fmtCnic, fmtPhone } from '../formatters.js';

/**
 * The grouping assertions here are the drift guard described in formatters.ts.
 *
 * `apps/web/src/lib/format.ts` implements the same rule independently, because the web app cannot
 * import this package (it pulls in `pg`). If either side is ever "corrected" to `en-PK` — which
 * looks right and is wrong — these exact-string assertions fail.
 */
describe('fmtPkr', () => {
  it('groups by lakh and crore, not in threes', () => {
    // The distinguishing case. en-PK would render "1,284,500" here.
    expect(fmtPkr(1284500)).toBe('PKR 12,84,500');
    expect(fmtPkr(125430)).toBe('PKR 1,25,430');
    expect(fmtPkr(100000)).toBe('PKR 1,00,000');
    expect(fmtPkr(12345678)).toBe('PKR 1,23,45,678');
  });

  it('leaves figures below a lakh ungrouped beyond the thousand', () => {
    expect(fmtPkr(8000)).toBe('PKR 8,000');
    expect(fmtPkr(800)).toBe('PKR 800');
  });

  it('never renders the banned symbols', () => {
    // §4.3: never `₨` (inconsistent glyph coverage), never `Rs.` — which is exactly what
    // Intl's currency style produces under en-PK.
    const out = fmtPkr(1284500);
    expect(out).not.toContain('₨');
    expect(out).not.toContain('Rs');
    expect(out.startsWith('PKR ')).toBe(true);
  });

  it('takes two decimals for receipts and reconciliation', () => {
    expect(fmtPkr(8000, 2)).toBe('PKR 8,000.00');
    expect(fmtPkr(1284500.5, 2)).toBe('PKR 12,84,500.50');
  });

  it('rounds to whole rupees by default', () => {
    expect(fmtPkr(8000.4)).toBe('PKR 8,000');
    expect(fmtPkr(8000.6)).toBe('PKR 8,001');
  });

  it('coerces the strings pg returns for NUMERIC columns', () => {
    // pg hands back NUMERIC as a string; a receipt built by concatenation would print "80008000".
    expect(fmtPkr('1284500')).toBe('PKR 12,84,500');
    expect(fmtPkr('8000.00', 2)).toBe('PKR 8,000.00');
  });

  it('degrades to zero rather than printing NaN on a document', () => {
    expect(fmtPkr(null)).toBe('PKR 0');
    expect(fmtPkr(undefined)).toBe('PKR 0');
    expect(fmtPkr('not a number')).toBe('PKR 0');
  });
});

describe('fmtCnic', () => {
  it('formats 13 digits into the national pattern', () => {
    expect(fmtCnic('3520112345671')).toBe('35201-1234567-1');
  });

  it('strips existing punctuation before formatting', () => {
    expect(fmtCnic('35201-1234567-1')).toBe('35201-1234567-1');
  });

  it('returns the input untouched when it is not 13 digits', () => {
    // Better a visibly odd value on screen than a confidently wrong one.
    expect(fmtCnic('12345')).toBe('12345');
  });
});

describe('fmtPhone', () => {
  it('converts a local 11-digit mobile to E.164', () => {
    expect(fmtPhone('03001234567')).toBe('+923001234567');
  });

  it('leaves anything else alone', () => {
    expect(fmtPhone('+923001234567')).toBe('+923001234567');
    expect(fmtPhone('1234')).toBe('1234');
  });
});
