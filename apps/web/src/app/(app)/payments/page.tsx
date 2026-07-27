import { api, ApiError } from '@/lib/api';
import { redirect } from 'next/navigation';
import { formatPkr, formatDate } from '@/lib/format';
import { Notice, PageHeading, Pagination, Stat, StatGrid, StatusBadge, TableFrame, Td, Th } from '@/components/ui';

export const metadata = { title: 'Payments · Hostyllo' };

/** GET /payments — API spec Module 4. Money arrives as strings; formatPkr coerces. */
type Payment = {
  paymentId: string;
  studentId: string;
  studentName: string;
  roomNumber: string | null;
  paymentMonth: string;
  totalDuePkr: number | string;
  amountPaidPkr: number | string;
  unpaidPkr: number | string;
  status: string;
  paymentMethod: string | null;
  paymentDate: string | null;
};

type PaymentList = { payments: Payment[]; total: number };

type Summary = {
  month: string;
  revenuePkr: number | string;
  pendingPkr: number | string;
  paidCount: number | string;
  partialCount: number | string;
  pendingCount: number | string;
};

const PAGE_SIZE = 25;
const STATUSES = ['paid', 'partial', 'pending', 'void'] as const;

/** The API takes `month` as YYYY-MM; this is also the default the summary uses. */
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; offset?: string }>;
}) {
  const { month: rawMonth, status, offset: rawOffset } = await searchParams;
  const month = rawMonth || currentMonth();
  const offset = Math.max(0, Number(rawOffset ?? 0) || 0);

  const listParams = new URLSearchParams({ month, limit: String(PAGE_SIZE), offset: String(offset) });
  if (status) listParams.set('status', status);

  let list: PaymentList;
  let summary: Summary | null = null;

  try {
    // The summary is a separate aggregate over the whole month, not the page — fetched alongside
    // so the header totals do not change as the user pages through.
    [list, summary] = await Promise.all([
      api<PaymentList>(`/payments?${listParams.toString()}`),
      api<Summary>(`/payments/summary?month=${month}`).catch(() => null),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 403) {
      return <Notice tone="amber">Your role does not have access to payments.</Notice>;
    }
    return <Notice tone="red">{error instanceof ApiError ? error.message : 'Could not load payments.'}</Notice>;
  }

  return (
    <>
      <PageHeading title="Payments" meta={`${list.total} for ${month}`} />

      {summary && (
        <StatGrid label="Month summary">
          <Stat label="Collected" value={formatPkr(summary.revenuePkr)} tone="teal" />
          <Stat
            label="Outstanding"
            value={formatPkr(summary.pendingPkr)}
            tone={Number(summary.pendingPkr) > 0 ? 'amber' : undefined}
          />
          <Stat label="Paid in full" value={String(Number(summary.paidCount ?? 0))} />
          <Stat label="Partial" value={String(Number(summary.partialCount ?? 0))} />
          <Stat label="Unpaid" value={String(Number(summary.pendingCount ?? 0))} />
        </StatGrid>
      )}

      {/* GET form: filters live in the URL, so a month view can be bookmarked or shared, and the
          back button behaves. No JavaScript required to change month or status. */}
      <form
        method="GET"
        style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}
      >
        <label htmlFor="month" style={srOnly}>
          Month
        </label>
        <input id="month" type="month" name="month" defaultValue={month} style={controlStyle} />

        <label htmlFor="status" style={srOnly}>
          Status
        </label>
        <select id="status" name="status" defaultValue={status ?? ''} style={controlStyle}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <button type="submit" style={{ ...controlStyle, background: 'var(--gold)', color: '#0b0e14', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          Apply
        </button>
      </form>

      {list.payments.length === 0 ? (
        <Notice tone="muted">
          No payments recorded for {month}
          {status ? ` with status “${status}”` : ''}.
        </Notice>
      ) : (
        <TableFrame minWidth={780}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
              <Th>Student</Th>
              <Th>Room</Th>
              <Th align="right">Due</Th>
              <Th align="right">Paid</Th>
              <Th align="right">Unpaid</Th>
              <Th>Status</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody>
            {list.payments.map((p) => {
              const unpaid = Number(p.unpaidPkr ?? 0);
              const voided = p.status === 'void';
              return (
                <tr
                  key={p.paymentId}
                  style={{
                    borderTop: '1px solid var(--border)',
                    // A voided payment still counts for the audit trail but must not read as live
                    // money; dimming it is the cheapest way to say so without hiding the row.
                    opacity: voided ? 0.55 : 1,
                  }}
                >
                  <Td>{p.studentName}</Td>
                  <Td>{p.roomNumber ?? '—'}</Td>
                  <Td align="right">{formatPkr(p.totalDuePkr)}</Td>
                  <Td align="right">{formatPkr(p.amountPaidPkr)}</Td>
                  <Td align="right">
                    <span style={{ color: unpaid > 0 && !voided ? 'var(--red)' : 'var(--text-muted)' }}>
                      {formatPkr(unpaid)}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td>{formatDate(p.paymentDate)}</Td>
                </tr>
              );
            })}
          </tbody>
        </TableFrame>
      )}

      <Pagination
        basePath="/payments"
        params={{ month, status }}
        offset={offset}
        shown={list.payments.length}
        total={list.total}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}

const controlStyle: React.CSSProperties = {
  padding: 'var(--space-3)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border-2)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 16,
  minHeight: 44,
};

/** Labels stay in the accessibility tree even where the control is self-evident visually. */
const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};
