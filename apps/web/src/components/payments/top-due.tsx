import Link from 'next/link';

import { formatAmount } from '@/lib/format';
import type { TopDueRow } from '@/lib/payments/contract';

/**
 * The rail: who owes the most this month.
 *
 * ── Why this is the only panel in the rail ───────────────────────────────────
 * The design's rail carries six: a methods donut, a trend chart, an ageing
 * breakdown, this list, an activity feed and four quick actions. Five of them
 * cannot be built honestly today, and each for its own reason:
 *
 *  · **Ageing (0–30 / 31–60 / 61–90 / 90+)** needs a per-payment age. Rent is
 *    billed monthly and there is no `due_date` column, so the only age available
 *    is "how many months back the billed month is" — turning that into a
 *    day-bucketed chart invents a precision the data does not have, and an owner
 *    would reasonably read "61–90 days" as a fact about a date.
 *  · **Trend and the methods donut** already exist on the dashboard, drawn from
 *    `/dashboard/trend` and `/dashboard/payment-methods`. Month-scoped versions
 *    of those endpoints do not exist, and a second copy fed by different figures
 *    is how two screens start disagreeing about the same month.
 *  · **The activity feed** would restate the rows already on screen, and its
 *    timestamps ("28 Jul · 09:20 AM") need a payment-events table nothing writes.
 *  · **Quick actions** — Generate Month Report, Send WhatsApp Reminders, Record
 *    Bulk Collection, Reconcile Bank Statement — have no destination between
 *    them. WhatsApp is Phase 2, and the other three have no endpoint at all.
 *
 * What is left is real, and is the question the panel was always answering:
 * `GET /payments/defaulters` sorts by outstanding, so this is the top of that
 * list with a way into it.
 */
export function TopDue({ rows, month }: { rows: TopDueRow[]; month: string }) {
  return (
    <aside className="hidden w-[264px] shrink-0 flex-col gap-[11px] rounded-xl border border-hairline bg-surface p-[13px] xl:flex">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-eyebrow font-semibold uppercase tracking-wider text-fg-tertiary">
          Highest dues
        </h2>
        <Link
          href={`/payments/defaulters?month=${month}`}
          className="text-[11.5px] font-medium text-brand-text hover:underline"
        >
          See all
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-[12px] text-fg-tertiary">
          Nobody owes anything for this month. Every row is settled.
        </p>
      ) : (
        <ol className="flex flex-col gap-[9px]">
          {rows.map((row, index) => (
            <li key={row.studentId} className="flex items-center gap-[9px]">
              <span
                aria-hidden
                className="hs-num grid size-[22px] shrink-0 place-items-center rounded-md bg-surface-hover text-[11px] font-semibold text-fg-tertiary"
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <Link
                  href={`/students/${row.studentId}`}
                  className="block truncate text-[12.5px] font-medium text-fg hover:text-brand-text"
                >
                  {row.studentName}
                </Link>
                <span className="hs-num block text-[10.5px] text-fg-tertiary">
                  {row.room ?? 'No room'}
                </span>
              </span>
              <span className="hs-num shrink-0 text-[12px] font-semibold text-negative">
                {formatAmount(row.unpaid)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
