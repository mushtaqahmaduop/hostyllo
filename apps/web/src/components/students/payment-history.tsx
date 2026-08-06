import { Money } from '@/components/patterns/money';
import { formatAmount } from '@/lib/format';
import type { PaymentRow, StudentDetail } from '@/lib/students/detail-contract';
import { cn } from '@/lib/utils';

/**
 * The student's full payment ledger.
 *
 * Columns follow the design's, minus its Actions column. Mark-paid, print-receipt,
 * edit and delete have no destination in the web app — there is no `/payments/[id]`
 * route — and four dead buttons per row is a row of controls that teach the
 * operator the screen is broken. The same call session 15 made on the roster.
 *
 * The Paid cell carries its own breakdown, ported from HOSTIX
 * `students.js:449-456`: the collected figure, then the admission fee, each extra
 * charge, and the concession beneath it. Without those lines a month showing
 * "14,500" against a rent of "8,000" looks like an error rather than a rent plus
 * a mess charge plus an admission fee.
 */

const CELL = 'px-[var(--hs-cell-pad-x)] py-[var(--hs-cell-pad-y)]';

const HEAD = cn(
  CELL,
  'whitespace-nowrap bg-surface-sunken text-start align-middle',
  'border-b border-hairline text-[11px] font-semibold uppercase tracking-eyebrow text-fg-tertiary',
);

/**
 * Only Pending carries colour, and only because it is the one row state that
 * means somebody still owes money. Paid and Partial are grey — Paid is most rows,
 * and Partial is already legible from the Unpaid column beside it.
 */
const STATUS_PILL: Record<string, string> = {
  paid: 'border-hairline bg-surface-hover text-fg-secondary',
  partial: 'border-hairline bg-surface-hover text-fg-secondary',
  pending: 'border-attention-border bg-attention-tint text-attention',
};

export function PaymentHistory({ student }: { student: StudentDetail }) {
  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline bg-surface-sunken px-4 py-3">
        <h2 className="hs-eyebrow flex-1">{student.historyLabel}</h2>
        <p className="text-body-sm text-fg-secondary">
          Paid <Money value={student.totalPaid} tier="ledger" />
        </p>
      </div>

      <div className="hs-scroll overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-[13.5px]">
          <caption className="sr-only">
            Every payment recorded for {student.name}, most recent month first.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={HEAD}>Month</th>
              <th scope="col" className={cn(HEAD, 'text-end')}>Monthly rent</th>
              <th scope="col" className={cn(HEAD, 'text-end')}>Concession</th>
              <th scope="col" className={cn(HEAD, 'text-end')}>Paid</th>
              <th scope="col" className={cn(HEAD, 'text-end')}>Unpaid</th>
              <th scope="col" className={HEAD}>Method</th>
              <th scope="col" className={HEAD}>Status</th>
              <th scope="col" className={HEAD}>Date</th>
            </tr>
          </thead>
          <tbody>
            {student.payments.map((p) => (
              <Row key={p.id} payment={p} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ payment }: { payment: PaymentRow }) {
  return (
    <tr className="hover:bg-surface-hover">
      <td className={cn(CELL, 'whitespace-nowrap border-b border-hairline font-medium')}>
        {payment.month}
      </td>
      <td className={cn(CELL, 'border-b border-hairline text-end')}>
        <Money value={payment.rent} tier="ledger" />
      </td>
      <td className={cn(CELL, 'border-b border-hairline text-end')}>
        {payment.concession > 0 ? (
          <span className="font-mono text-mono tabular-nums">
            −{formatAmount(payment.concession)}
          </span>
        ) : (
          <span className="text-fg-tertiary">—</span>
        )}
      </td>
      <td className={cn(CELL, 'border-b border-hairline text-end')}>
        <Money value={payment.paid} tier="ledger" />
        {payment.admissionFee > 0 && <SubLine>+{formatAmount(payment.admissionFee)} admission</SubLine>}
        {payment.extras.map((extra) => (
          <SubLine key={`${extra.label}-${extra.amount}`}>
            +{formatAmount(extra.amount)} {extra.label}
          </SubLine>
        ))}
      </td>
      <td className={cn(CELL, 'border-b border-hairline text-end')}>
        {payment.unpaid > 0 ? (
          <Money value={payment.unpaid} tier="ledger" />
        ) : (
          <span className="text-fg-tertiary">—</span>
        )}
      </td>
      <td className={cn(CELL, 'whitespace-nowrap border-b border-hairline')}>
        {payment.method ?? <span className="text-fg-tertiary">—</span>}
      </td>
      <td className={cn(CELL, 'border-b border-hairline')}>
        <span
          className={cn(
            'inline-block rounded-full border px-2 py-0.5 text-caption font-medium',
            STATUS_PILL[payment.status] ?? 'border-hairline bg-surface-hover text-fg-secondary',
          )}
        >
          {payment.statusLabel}
        </span>
      </td>
      <td className={cn(CELL, 'whitespace-nowrap border-b border-hairline tabular-nums text-fg-secondary')}>
        {payment.date ?? <span className="text-fg-tertiary">—</span>}
      </td>
    </tr>
  );
}

function SubLine({ children }: { children: React.ReactNode }) {
  return <span className="mt-0.5 block text-caption tabular-nums text-fg-tertiary">{children}</span>;
}
