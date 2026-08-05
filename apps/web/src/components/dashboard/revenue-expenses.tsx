import type { MonthlySeries } from '@/lib/dashboard/contract';
import { formatAmount } from '@/lib/format';
import { Card, CardTitle } from './card';
import { SERIES } from './tone';

const BAR_AREA = 192;

/**
 * Revenue against expenses, paired bars.
 *
 * The same two series the line chart above already draws, in the form that
 * answers a different question: the line says "which way is this going", the
 * paired bars say "how much of what came in went straight back out this month".
 * Reading that off two lines means measuring a gap by eye.
 *
 * A server component — no range control here. The line chart owns the range, and
 * two independent range pickers on one screen showing the same two series is a
 * way to make a dashboard contradict itself.
 */
export function RevenueExpenses({ series }: { series: MonthlySeries }) {
  const months = Math.min(7, series.labels.length);
  const from = series.labels.length - months;

  const labels = series.labels.slice(from);
  const revenue = series.collection.slice(from);
  const expenses = series.expenses.slice(from);

  const peak = Math.max(...revenue, ...expenses, 1);
  const step = 2_000_000;
  const top = Math.max(step * 5, Math.ceil((peak * 1.08) / (step * 5)) * step * 5);

  const height = (value: number) => `${Math.max(2, (value / top) * BAR_AREA).toFixed(0)}px`;

  return (
    <Card>
      <CardTitle>Revenue vs Expenses</CardTitle>

      <ul className="my-[12px] mb-2 flex list-none items-center justify-center gap-5 p-0">
        {[
          { label: 'Revenue', color: SERIES.subject },
          { label: 'Expenses', color: SERIES.compare },
        ].map((l) => (
          <li
            key={l.label}
            className="flex items-center gap-[7px] whitespace-nowrap text-body-sm font-medium text-fg-secondary"
          >
            <span className="size-[10px] shrink-0 rounded-[3px]" style={{ background: l.color }} aria-hidden />
            {l.label}
          </li>
        ))}
      </ul>

      <div className="flex flex-1 items-end gap-[9px]">
        <div className="flex h-[196px] shrink-0 flex-col justify-between">
          {[5, 4, 3, 2, 1, 0].map((i) => (
            <span key={i} className="hs-num text-eyebrow leading-none text-fg-tertiary">
              {i === 0 ? '0' : `${Math.round((top / 1_000_000 / 5) * i)}M`}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex h-[196px] items-end gap-[6px] border-b border-hairline">
            {labels.map((label, i) => (
              <div
                key={`${label}-${i}`}
                className="flex h-full min-w-0 flex-1 items-end justify-center gap-[3px]"
              >
                <div
                  title={`${label} revenue · PKR ${formatAmount(revenue[i])}`}
                  className="w-[44%] rounded-t-sm"
                  style={{ height: height(revenue[i]), background: SERIES.subject }}
                />
                <div
                  title={`${label} expenses · PKR ${formatAmount(expenses[i])}`}
                  className="w-[44%] rounded-t-sm"
                  style={{ height: height(expenses[i]), background: SERIES.compare }}
                />
              </div>
            ))}
          </div>

          <div className="mt-[7px] flex gap-[6px]">
            {labels.map((label, i) => (
              <span
                key={`${label}-${i}`}
                className="hs-num min-w-0 flex-1 text-center text-caption text-fg-secondary"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
