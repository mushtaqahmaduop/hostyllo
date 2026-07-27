import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Shared presentation primitives for the list screens.
 *
 * These sit a layer above `components/ui-kit/*` (shadcn): the kit provides unopinionated pieces,
 * and this file is where Hostyllo's opinions live — how a KPI reads, what a status colour means,
 * how money is aligned. Screens import from here so a change to "what a stat card looks like"
 * happens once.
 */

export function PageHeading({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-2">
      {/* 28px/700 — spec §3 "Page Title". */}
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em]">{title}</h1>
      {meta && <span className="text-sm text-text-muted">{meta}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

const STAT_TONE = {
  teal: 'text-teal',
  amber: 'text-amber',
  red: 'text-red',
  gold: 'text-gold',
} as const;

export function Stat({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof STAT_TONE;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm transition-colors duration-150 hover:border-border-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[13px] text-text-muted">{label}</div>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      {/* `tabular` is DM Mono with tabular figures (spec §3): a column of amounts lines up digit
          for digit, so two numbers can be compared by shape without reading either in full. */}
      <div className={cn('tabular text-2xl font-semibold tracking-[-0.01em]', tone && STAT_TONE[tone])}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[13px] text-text-muted">{hint}</div>}
    </div>
  );
}

export function StatGrid({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section
      aria-label={label}
      className="mb-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]"
    >
      {children}
    </section>
  );
}

const NOTICE_TONE = {
  red: 'bg-red-subtle text-red',
  amber: 'bg-amber-subtle text-amber',
  teal: 'bg-teal-subtle text-teal',
  muted: 'bg-surface text-text-muted border border-border',
} as const;

export function Notice({
  tone,
  children,
}: {
  tone: 'red' | 'amber' | 'muted' | 'teal';
  children: React.ReactNode;
}) {
  return (
    <div
      // `alert` interrupts, which is right for a failure and wrong for a confirmation — a success
      // banner is announced politely by `status` instead, and muted notices are ordinary prose.
      role={tone === 'muted' ? undefined : tone === 'teal' ? 'status' : 'alert'}
      className={cn('rounded-md p-4 text-[15px]', NOTICE_TONE[tone])}
    >
      {children}
    </div>
  );
}

/**
 * A link styled as the primary action on a list screen.
 *
 * A link, not a button, because every write flow in this app is its own addressable page — which
 * means it opens in a new tab, survives a refresh mid-form, and needs no JavaScript to reach.
 */
export function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md bg-gold px-4 text-[15px] font-semibold text-on-gold shadow-sm transition-colors duration-150 hover:bg-gold-hover active:bg-gold-active"
    >
      {children}
    </Link>
  );
}

/**
 * A plain GET search form.
 *
 * No debounced typeahead: the query lands in the URL, so a search survives a refresh, can be
 * bookmarked or shared, works with the back button, and needs no JavaScript. On a flaky connection
 * that is also one request instead of one per keystroke.
 */
export function SearchForm({
  defaultValue,
  label,
  placeholder = 'Search name or phone',
  autoFocus,
}: {
  defaultValue?: string;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <form method="GET" className="mb-5 flex gap-2">
      <div className="relative flex-1">
        <SearchIcon />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue ?? ''}
          placeholder={placeholder}
          aria-label={label}
          autoFocus={autoFocus}
          className="min-h-11 w-full rounded-md border border-border-2 bg-surface-2 py-2 pl-10 pr-3 text-base text-text placeholder:text-text-muted transition-colors duration-150 hover:border-text-disabled"
        />
      </div>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center rounded-md bg-gold px-4 font-semibold text-on-gold shadow-sm transition-colors duration-150 hover:bg-gold-hover active:bg-gold-active"
      >
        Search
      </button>
    </form>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** A quiet inline link used inside table rows for the row's primary action. */
export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center whitespace-nowrap px-3 font-medium text-gold transition-colors duration-150 hover:text-gold-hover"
    >
      {children}
    </Link>
  );
}

/** Horizontal scroll lives on the wrapper, so a wide table never makes the page itself scroll. */
export function TableFrame({ children, minWidth = 640 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-[15px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-3 py-3 text-[13px] font-semibold text-text-muted',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  numeric,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  numeric?: boolean;
}) {
  return (
    <td className={cn('px-3 py-3', align === 'right' ? 'text-right' : 'text-left', numeric && 'tabular')}>
      {children}
    </td>
  );
}

/** Zebra-free rows with a hover tint — quieter than striping, and it survives the theme switch. */
export function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-border transition-colors duration-150 hover:bg-surface-2">{children}</tr>;
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

const BADGE_TONE = {
  teal: 'bg-teal-subtle text-teal',
  amber: 'bg-amber-subtle text-amber',
  red: 'bg-red-subtle text-red',
  muted: 'bg-surface-2 text-text-muted',
} as const;

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'muted';
  return (
    <span
      className={cn(
        // Status is also carried by the word itself, never by colour alone.
        'inline-block rounded-full px-2 py-0.5 text-[13px] font-medium capitalize',
        BADGE_TONE[tone],
      )}
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

  const base =
    'inline-flex min-h-11 items-center rounded-md border border-border-2 px-3 transition-colors duration-150';
  const atStart = offset === 0;
  const atEnd = offset + shown >= total;

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center gap-3">
      {atStart ? (
        <span aria-disabled="true" className={cn(base, 'text-text-disabled')}>
          Previous
        </span>
      ) : (
        <Link href={href(offset - pageSize)} className={cn(base, 'text-text hover:bg-surface-2')}>
          Previous
        </Link>
      )}
      <span className="tabular text-sm text-text-muted">
        {total === 0 ? 0 : offset + 1}–{offset + shown} of {total}
      </span>
      {atEnd ? (
        <span aria-disabled="true" className={cn(base, 'text-text-disabled')}>
          Next
        </span>
      ) : (
        <Link href={href(offset + pageSize)} className={cn(base, 'text-text hover:bg-surface-2')}>
          Next
        </Link>
      )}
    </nav>
  );
}
