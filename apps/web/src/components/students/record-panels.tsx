import type { DetailRow } from '@/lib/students/detail-contract';
import { cn } from '@/lib/utils';

/**
 * The two side-by-side detail panels: Personal information, Room & accommodation.
 *
 * A definition list rather than a table — these are label/value pairs, not rows
 * of a dataset, and a screen reader should announce them as such.
 *
 * The design colours each panel's heading differently (violet for Personal,
 * green for Room, amber for the history below). Not reproduced: one accent,
 * spent on one action per screen, and a heading is not an action. Headings are
 * the shared eyebrow treatment, which is what tells the eye they are peers.
 */
export function DetailPanel({
  title,
  rows,
  empty,
  children,
}: {
  title: string;
  rows: DetailRow[];
  /** Shown instead of the list when there is nothing to list. */
  empty?: string;
  /**
   * Rows whose value is a component rather than a string — the CNIC reveal is
   * the only one so far. They go through `DetailRowShell` so they sit on the same
   * baseline and hairline as the text rows; the alternative was writing this
   * markup a second time on the page, which is how two panels that look alike
   * start drifting apart.
   */
  children?: React.ReactNode;
}) {
  const bare = rows.length === 0 && !children;

  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
      <h2 className="hs-eyebrow border-b border-hairline bg-surface-sunken px-4 py-3">{title}</h2>

      {bare ? (
        <p className="px-4 py-8 text-center text-body-sm text-fg-tertiary">{empty}</p>
      ) : (
        <dl className="px-4">
          {rows.map((row) => (
            <DetailRowShell key={row.label} label={row.label}>
              <span
                className={cn(
                  'break-words text-body-sm font-medium',
                  row.mono && 'font-mono text-mono',
                  row.absent && 'font-normal text-fg-tertiary',
                )}
              >
                {row.value}
              </span>
            </DetailRowShell>
          ))}
          {children}
        </dl>
      )}
    </section>
  );
}

/** One label/value line. Exported so a component-valued row matches a text one exactly. */
export function DetailRowShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-hairline py-2.5 last:border-0">
      <dt className="flex-none text-body-sm text-fg-tertiary">{label}</dt>
      <dd className="text-end">{children}</dd>
    </div>
  );
}
