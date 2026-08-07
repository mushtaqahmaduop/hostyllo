import { CreditCard, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The KPI strip both ledger screens wear.
 *
 * Shared for the reason `status-tabs.tsx` is shared: the payments ledger and the
 * rooms board are two clicks apart and carry the same object, and a card that
 * differs by a padding step between them is the kind of thing an owner sees
 * without being able to name. Structural typing again — each screen's own `Kpi`
 * satisfies `KpiItem`, and neither knows about the other.
 *
 * Icons come in as a map from the caller rather than living here, because the
 * icon is the one part that is genuinely per-screen. Everything else — the
 * neutral icon tile, the figure, the note beneath it — is fixed, which is the
 * point of a shared card.
 *
 * ── Two rules baked in ───────────────────────────────────────────────────────
 * Every icon is the same neutral grey. `DESIGN_RULES.md` bans a per-card hue and
 * it is the right ban: when all of them are coloured, none is emphasised. The
 * only element allowed colour is the note, and only because up and down genuinely
 * mean better and worse there.
 *
 * There are no sparklines. Both designs draw one per card from
 * `Math.sin(i * .8 + seed)`; a sine wave is not anybody's history. The dashboard's
 * cards do carry them, from `/dashboard/trend`, which returns real months.
 */

export type KpiTone = 'positive' | 'negative' | 'neutral';

export type KpiItem = {
  id: string;
  label: string;
  /** Pre-formatted digits. The `PKR` prefix is this component's business (§4.3). */
  value: string;
  currency: boolean;
  /** A delta with its baseline, or a plain description when there is nothing to compare. */
  note: string;
  noteTone: KpiTone;
};

const NOTE_TONE: Record<KpiTone, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-fg-tertiary',
};

export function KpiStrip({
  kpis,
  icons,
  className,
}: {
  kpis: KpiItem[];
  icons: Record<string, LucideIcon>;
  className?: string;
}) {
  if (kpis.length === 0) return null;

  return (
    <div
      className={cn(
        'grid shrink-0 grid-cols-2 gap-[11px] md:grid-cols-3',
        kpis.length >= 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4',
        className,
      )}
    >
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} Icon={icons[kpi.id] ?? CreditCard} />
      ))}
    </div>
  );
}

function KpiCard({ kpi, Icon }: { kpi: KpiItem; Icon: LucideIcon }) {
  return (
    <article className="flex flex-col rounded-xl border border-hairline bg-surface px-[13px] py-[12px]">
      <div className="flex items-center gap-[8px]">
        <span className="grid size-[26px] shrink-0 place-items-center rounded-md bg-surface-hover text-fg-secondary">
          <Icon className="size-[14px]" aria-hidden />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-eyebrow font-semibold uppercase tracking-wider text-fg-tertiary">
          {kpi.label}
        </h3>
      </div>

      <p className="hs-num mt-[9px] truncate text-figure font-semibold tracking-tight text-fg">
        {/* The symbol in caption type beside the numerals, never inside the
            formatter (§4.3): the digits carry the weight, and a prefix that lives
            in one place cannot be doubled by a formatter emitting its own. */}
        {kpi.currency && <span className="text-caption font-normal text-fg-tertiary">PKR </span>}
        {kpi.value}
      </p>

      {/* Any ▲/▼ lives inside the note string — `formatDelta` owns arrow, figure
          and baseline together, so there is no second arrow to keep in sync. */}
      <p className={cn('hs-num mt-[4px] truncate text-caption font-medium', NOTE_TONE[kpi.noteTone])}>
        {kpi.note}
      </p>
    </article>
  );
}
