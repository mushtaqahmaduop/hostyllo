import Link from 'next/link';

import { Money } from '@/components/patterns/money';
import { cn } from '@/lib/utils';

export type AttentionItem = {
  /** The count, which leads the row: "7 dues overdue". */
  count: number;
  /** Singular and plural in full — never "1 payment(s)". */
  singular: string;
  plural: string;
  /** Optional money at stake, right-aligned: `7 dues overdue · PKR 84,000`. */
  amount?: number | string | null;
  /** Where the row lands. Omitted when no screen exists yet — a dead link is worse than plain text. */
  href?: string;
};

/**
 * Needs-Attention panel — docs/15_UI_SPEC_v1.md §7.3.
 *
 * The counterweight to the hero, and the *only* place amber appears in bulk (§3.2). Everything
 * else on a dashboard is monochrome unless something is wrong, which is what makes this panel
 * readable from across a room.
 *
 * When it is empty it stays visible, with a brass rule and one sentence. Hiding it would save
 * space and cost the thing the panel is actually for: an operator needs to know the system
 * *checked* and found nothing, not merely that it is not showing them anything.
 */
export function NeedsAttention({
  items,
  className,
}: {
  items: AttentionItem[];
  className?: string;
}) {
  const live = items.filter((i) => i.count > 0);

  return (
    <section
      aria-label="Needs attention"
      data-state={live.length > 0 ? 'attention' : undefined}
      className={cn('hs-threshold rounded-lg border border-hairline bg-surface p-6', className)}
    >
      <p className="hs-eyebrow">Needs attention</p>

      {live.length === 0 ? (
        <div className="mt-4">
          <span className="hs-rule" aria-hidden />
          <p className="mt-3 text-body text-fg-secondary">Nothing needs attention today.</p>
        </div>
      ) : (
        <ul className="mt-4 grid list-none gap-px p-0">
          {live.map((item) => (
            <li key={item.singular}>
              <AttentionRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const body = (
    <>
      <span className="text-body">
        {/* Colour is never the only channel (§12): the count and the word carry the meaning, and
            amber is the emphasis on top of them rather than the message itself. */}
        <span className="font-semibold tabular-nums text-attention-text">{item.count}</span>{' '}
        {item.count === 1 ? item.singular : item.plural}
      </span>
      {item.amount != null && (
        <Money value={item.amount} tier="ledger" className="ms-auto text-fg-secondary" />
      )}
    </>
  );

  const shared =
    'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 transition-colors duration-fast ease-standard';

  /*
   * Linked only where a screen exists to land on. Maintenance and complaints have APIs but no UI
   * yet, so those rows stay plain text — §10's rule that a state must be honest applies to
   * affordances too, and a link that goes nowhere teaches the operator to stop trusting them.
   */
  return item.href ? (
    <Link href={item.href} className={cn(shared, 'text-fg hover:bg-attention-tint')}>
      {body}
    </Link>
  ) : (
    <div className={cn(shared, 'text-fg')}>{body}</div>
  );
}
