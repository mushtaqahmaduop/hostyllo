import Link from 'next/link';

/**
 * Shared presentation primitives for the list screens.
 *
 * Extracted once there were three of them (students, payments, rooms) rather than up front — the
 * table, notice and pagination markup had been copied twice by then, which is the point at which
 * the duplication starts to drift instead of merely repeating.
 */

export function PageHeading({ title, meta }: { title: string; meta?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
      <h1 style={{ fontSize: 24, margin: 0, letterSpacing: '-0.02em' }}>{title}</h1>
      {meta && <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{meta}</span>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'teal' | 'amber' | 'red';
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>{label}</div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: tone ? `var(--${tone})` : 'var(--text)',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
      {hint && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>{hint}</div>}
    </div>
  );
}

export function StatGrid({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section
      aria-label={label}
      style={{
        display: 'grid',
        gap: 'var(--space-4)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        marginBottom: 'var(--space-6)',
      }}
    >
      {children}
    </section>
  );
}

export function Notice({ tone, children }: { tone: 'red' | 'amber' | 'muted'; children: React.ReactNode }) {
  const color = tone === 'muted' ? 'var(--text-muted)' : `var(--${tone})`;
  const background = tone === 'muted' ? 'var(--surface)' : `var(--${tone}-subtle)`;
  return (
    <div
      role={tone === 'muted' ? undefined : 'alert'}
      style={{ padding: 'var(--space-4)', background, color, borderRadius: 'var(--radius-md)' }}
    >
      {children}
    </div>
  );
}

/** Horizontal scroll lives on the wrapper, so a wide table never makes the page itself scroll. */
export function TableFrame({ children, minWidth = 640 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth }}>{children}</table>
    </div>
  );
}

export function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        padding: 'var(--space-3)',
        fontWeight: 600,
        color: 'var(--text-muted)',
        fontSize: 13,
        textAlign: align,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ padding: 'var(--space-3)', textAlign: align }}>{children}</td>;
}

const STATUS_TONE: Record<string, 'teal' | 'amber' | 'red' | 'muted'> = {
  paid: 'teal',
  partial: 'amber',
  pending: 'red',
  void: 'muted',
  active: 'teal',
  vacant: 'muted',
  occupied: 'teal',
  maintenance: 'amber',
  inactive: 'muted',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'muted';
  const color = tone === 'muted' ? 'var(--text-muted)' : `var(--${tone})`;
  const background = tone === 'muted' ? 'var(--surface-2)' : `var(--${tone}-subtle)`;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px var(--space-2)',
        borderRadius: 'var(--radius-full)',
        background,
        color,
        fontSize: 13,
        // Status is also carried by the text itself, never by colour alone.
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  );
}

/**
 * Offset pagination rendered as links, so pages are shareable and the browser back button works.
 * `params` carries the current filters forward — losing them on page 2 is a classic annoyance.
 */
export function Pagination({
  basePath,
  params,
  offset,
  shown,
  total,
  pageSize,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  offset: number;
  shown: number;
  total: number;
  pageSize: number;
}) {
  if (total <= pageSize) return null;

  const href = (nextOffset: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (nextOffset > 0) q.set('offset', String(nextOffset));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const style: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--border-2)',
    borderRadius: 'var(--radius-md)',
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
  };

  const atStart = offset === 0;
  const atEnd = offset + shown >= total;

  return (
    <nav
      aria-label="Pagination"
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}
    >
      {atStart ? (
        <span aria-disabled="true" style={{ ...style, color: 'var(--text-disabled)' }}>
          Previous
        </span>
      ) : (
        <Link href={href(offset - pageSize)} style={{ ...style, color: 'var(--text)' }}>
          Previous
        </Link>
      )}
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        {total === 0 ? 0 : offset + 1}–{offset + shown} of {total}
      </span>
      {atEnd ? (
        <span aria-disabled="true" style={{ ...style, color: 'var(--text-disabled)' }}>
          Next
        </span>
      ) : (
        <Link href={href(offset + pageSize)} style={{ ...style, color: 'var(--text)' }}>
          Next
        </Link>
      )}
    </nav>
  );
}
