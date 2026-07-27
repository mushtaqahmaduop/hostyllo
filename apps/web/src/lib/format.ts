/**
 * Display formatting.
 *
 * Money is PKR everywhere in this product. The API returns NUMERIC columns coerced to JSON
 * numbers, so values arrive as numbers — but a string still slips through occasionally when a new
 * endpoint forgets the coercion, and `Number()` here keeps that from rendering as "80008000".
 */
export function formatPkr(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPct(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}
