import type { MonthPoint, MonthlySeries } from './contract';

/**
 * Turns the twelve-month series into something a chart can plot.
 *
 * Months with nothing to show are dropped rather than plotted as zero. `GET /dashboard/trend`
 * returns null for a future month nobody has billed, and a null is not a zero: plotting it
 * would draw the line to the floor for October, November and December every year, which reads
 * as a collapse in revenue rather than as a year that has not happened yet.
 */
export type FlatSeries = {
  labels: string[];
  collection: number[];
  expenses: number[];
  profit: number[];
  /** Per-point flag so a chart can mark billed-ahead months as projected-but-real. */
  isFutureBilled: boolean[];
  hasData: boolean;
};

export function flattenSeries(series: MonthlySeries, maxMonths?: number): FlatSeries {
  const shown = series.months.filter(hasAnyValue);
  const months = maxMonths ? shown.slice(Math.max(0, shown.length - maxMonths)) : shown;

  return {
    labels: months.map((m) => m.label),
    collection: months.map((m) => m.revenuePkr ?? 0),
    expenses: months.map((m) => (m.expensesPkr ?? 0) + (m.transfersPkr ?? 0)),
    profit: months.map((m) => (m.revenuePkr ?? 0) - (m.expensesPkr ?? 0) - (m.transfersPkr ?? 0)),
    isFutureBilled: months.map((m) => m.isFutureBilled),
    hasData: months.length > 0,
  };
}

function hasAnyValue(m: MonthPoint): boolean {
  return m.revenuePkr !== null || m.expensesPkr !== null || m.transfersPkr !== null;
}

/**
 * A chart axis that fits the data it is given.
 *
 * Both charts previously hardcoded `step = 2_000_000` and floored the axis at five or six of
 * those — a 10–12 million ceiling. That was invisible while the series was sample data in the
 * millions. Against a real hostel collecting PKR 11,000 a month, every line renders flat along
 * the bottom of a twelve-million axis and the chart says nothing at all.
 *
 * So the step is derived from the peak instead: the 1/2/5 ladder, which is what produces
 * gridlines a person reads without effort (10k, 20k, 50k, 100k…), and the axis lands on a round
 * multiple just above the data rather than on the data's own maximum.
 */
export function niceAxis(peak: number, targetLines = 5): { top: number; step: number } {
  if (!Number.isFinite(peak) || peak <= 0) return { top: targetLines, step: 1 };

  const rough = peak / targetLines;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;

  // The 1/2/5 ladder — the steps humans actually read.
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude;

  return { top: Math.ceil(peak / step) * step, step };
}
