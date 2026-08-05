'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import type { MonthlySeries, RangeKey } from '@/lib/dashboard/contract';
import { formatAmount } from '@/lib/format';
import { Card, CardTitle } from './card';
import { SERIES } from './tone';

const RANGES: Array<{ key: RangeKey; label: string; months: number }> = [
  { key: 'this-year', label: 'This Year', months: 7 },
  { key: 'last-6', label: 'Last 6 Months', months: 6 },
  { key: 'last-12', label: 'Last 12 Months', months: 12 },
];

const W = 500;
const H = 180;

/**
 * Collection, expenses and profit over time.
 *
 * A client component solely so the range control works. The series arrives
 * complete — twelve months of it — and the range slices what is already here
 * rather than refetching, so switching range is instant and costs no request.
 *
 * Three lines rather than a stacked area: profit is a *difference* between the
 * other two, and stacking would draw it as a third quantity sitting on top of
 * them, which is the wrong mental model and adds up to double the real money.
 */
export function MonthlyOverview({ series }: { series: MonthlySeries }) {
  const [range, setRange] = useState<RangeKey>('this-year');
  const active = RANGES.find((r) => r.key === range) ?? RANGES[0];

  const from = Math.max(0, series.labels.length - active.months);
  const labels = series.labels.slice(from);
  const collection = series.collection.slice(from);
  const expenses = series.expenses.slice(from);
  const profit = series.profit.slice(from);

  // The axis tops out at a round multiple above the tallest series, so the grid
  // lines land on readable numbers instead of on the data's own maximum.
  const peak = Math.max(...collection, ...expenses, 1);
  const step = 2_000_000;
  const top = Math.max(step * 6, Math.ceil((peak * 1.2) / (step * 6)) * step * 6);

  const path = (values: number[]) =>
    values
      .map((v, i) => {
        const x = values.length === 1 ? 0 : (i * W) / (values.length - 1);
        const y = H - (v / top) * (H - 10);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  const dots = (values: number[], color: string) =>
    values.map((v, i) => ({
      key: `${color}-${i}`,
      x: values.length === 1 ? 0 : (i * W) / (values.length - 1),
      y: H - (v / top) * (H - 10),
      color,
    }));

  /*
   * Violet is the subject, warm neutral is what it is measured against, light
   * violet is the difference between them. Not green/red/violet: expenses are
   * not a failure and profit is not a success, they are the two halves of an
   * ordinary month, and painting them as verdicts is the thing the design rules
   * spend the most words banning.
   */
  const seriesSpec = [
    { label: 'Collection (PKR)', color: SERIES.subject, values: collection },
    { label: 'Expenses (PKR)', color: SERIES.compare, values: expenses },
    { label: 'Profit (PKR)', color: SERIES.third, values: profit },
  ];

  const latest = collection.length - 1;

  function cycleRange() {
    const i = RANGES.findIndex((r) => r.key === range);
    setRange(RANGES[(i + 1) % RANGES.length].key);
  }

  return (
    <Card>
      <CardTitle
        action={
          <button
            type="button"
            onClick={cycleRange}
            className="flex h-[var(--hs-control-h-sm)] shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-hairline-strong bg-surface px-[11px] text-[12px] font-medium transition-colors duration-instant ease-standard hover:bg-surface-hover"
          >
            {active.label}
            <ChevronDown className="size-[13px] text-fg-tertiary" aria-hidden />
          </button>
        }
      >
        Monthly Overview
      </CardTitle>

      <ul className="my-[12px] mb-[6px] flex list-none items-center justify-center gap-[22px] p-0">
        {seriesSpec.map((s) => (
          <li
            key={s.label}
            className="flex items-center gap-[7px] whitespace-nowrap text-body-sm font-medium text-fg-secondary"
          >
            <svg width="18" height="8" className="block shrink-0" aria-hidden>
              <line x1="1" y1="4" x2="17" y2="4" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="9" cy="4" r="3.2" fill={s.color} />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>

      <div className="flex flex-1 gap-[9px]">
        <div className="flex h-[180px] shrink-0 flex-col justify-between">
          {[6, 5, 4, 3, 2, 1, 0].map((i) => (
            <span key={i} className="hs-num text-eyebrow leading-none text-fg-tertiary">
              {i === 0 ? '0' : `${Math.round((top / 1_000_000 / 6) * i)}M`}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block h-[180px] w-full overflow-visible"
            role="img"
            aria-label={`Collection, expenses and profit over ${labels.length} months. Latest collection PKR ${formatAmount(collection[latest])}, expenses PKR ${formatAmount(expenses[latest])}, profit PKR ${formatAmount(profit[latest])}.`}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const y = (i * (H - 10)) / 6 + 5;
              return (
                <line
                  key={i}
                  x1="0"
                  x2={W}
                  y1={y}
                  y2={y}
                  stroke="var(--hs-chart-grid)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            {/* The one area fill on the page, under the collection line only —
                three filled areas would obscure each other completely. */}
            <polygon
              points={`${path(collection)} ${W},${H} 0,${H}`}
              fill="var(--hs-chart-hero)"
            />

            {seriesSpec.map((s) => (
              <polyline
                key={s.label}
                points={path(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {seriesSpec
              .flatMap((s) => dots(s.values, s.color))
              .map((d) => (
                <circle
                  key={d.key}
                  cx={d.x}
                  cy={d.y}
                  r="3.4"
                  fill={d.color}
                  stroke="var(--hs-surface)"
                  strokeWidth="1.6"
                />
              ))}
          </svg>

          <div className="mt-[9px] flex justify-between">
            {labels.map((label, i) => (
              <span key={`${label}-${i}`} className="hs-num text-caption text-fg-secondary">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
