import Link from 'next/link';
import { CircleCheckBig } from 'lucide-react';

import type { PendingPayment } from '@/lib/dashboard/contract';
import { formatAmount, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card, CardLink, CardTitle } from './card';

/** Initials for the row disc; two letters, from the first and last name parts. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const letters = [parts[0]?.[0], parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1]]
    .filter(Boolean)
    .join('');
  return letters.slice(0, 2).toUpperCase() || '?';
}

/**
 * The five oldest outstanding payments.
 *
 * Real rows from `GET /payments`. Each one links to the payment form with the
 * student pre-selected rather than marking itself collected in place: money
 * moving is not a UI toggle, it needs an amount, a method and a receipt number,
 * and a one-click "collected" that skipped those would put the ledger and the
 * cash box out of step.
 *
 * ── Colour ───────────────────────────────────────────────────────────────────
 * The initials disc is neutral on every row. It used to cycle through five
 * tints, which made a five-row list look like a five-category one — the tint was
 * carrying no meaning at all, which is the exact thing "pills default to grey"
 * exists to prevent.
 *
 * The status pill is grey too, except for Overdue: partial and unpaid are the
 * ordinary states of a rent ledger mid-month, and only an overdue row is a thing
 * somebody has to chase today. One coloured pill per card, at most.
 *
 * Amounts are plain text. A column of red numbers reads as an error state, and
 * every row here is normal business.
 */

const PILL: Record<PendingPayment['status'], string> = {
  Partial: 'bg-surface-hover text-fg-secondary',
  Unpaid: 'bg-surface-hover text-fg-secondary',
  Overdue: 'bg-attention-tint text-attention',
};
export function PendingPayments({
  rows,
  duesTotal,
  dueCount,
}: {
  rows: PendingPayment[];
  duesTotal: number;
  dueCount: number;
}) {
  return (
    <Card>
      <CardTitle action={<CardLink href="/payments?status=pending">View all</CardLink>}>
        Pending Payments
      </CardTitle>

      {rows.length > 0 ? (
        <>
          <div className="flex items-center gap-[10px] pb-1 pt-[13px] text-caption font-medium text-fg-secondary">
            <span className="flex-1">Student / Room</span>
            <span className="w-[84px] shrink-0">Due Date</span>
            <span className="w-[88px] shrink-0 text-end">Amount</span>
            <span className="w-[66px] shrink-0 text-center">Status</span>
          </div>

          <ul className="flex flex-1 list-none flex-col justify-around p-0">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/payments/new?student=${encodeURIComponent(row.name)}`}
                  className="flex items-center gap-[10px] rounded-lg py-[6px] text-fg transition-colors duration-instant ease-standard hover:bg-surface-hover hover:text-fg"
                >
                  <span
                    className="grid size-[26px] shrink-0 place-items-center rounded-full bg-surface-hover text-[10px] font-semibold text-fg-secondary"
                    aria-hidden
                  >
                    {initials(row.name)}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-body font-medium">{row.name}</span>
                    <span className="hs-num shrink-0 whitespace-nowrap text-body-sm text-fg-tertiary">
                      {row.room}
                    </span>
                  </span>
                  <span className="hs-num w-[84px] shrink-0 whitespace-nowrap text-body-sm text-fg-secondary">
                    {formatDate(row.dueDate)}
                  </span>
                  <span className="hs-num w-[88px] shrink-0 whitespace-nowrap text-end text-body font-semibold">
                    PKR {formatAmount(row.amount)}
                  </span>
                  <span className="flex w-[66px] shrink-0 justify-center">
                    <span
                      className={cn(
                        'whitespace-nowrap rounded-pill px-[8px] py-[2px] text-[10.5px] font-medium',
                        PILL[row.status],
                      )}
                    >
                      {row.status}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-[7px] px-5 py-[34px]">
          <CircleCheckBig className="size-[22px] text-positive" aria-hidden />
          <p className="text-body font-semibold">Nothing outstanding</p>
          <p className="hs-num text-center text-body-sm text-fg-tertiary">
            {duesTotal > 0
              ? `PKR ${formatAmount(duesTotal)} due across ${dueCount} payments`
              : 'Every payment for this month has been collected.'}
          </p>
        </div>
      )}
    </Card>
  );
}
