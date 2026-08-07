import {
  AlertCircle,
  ArrowLeftRight,
  BarChart3,
  Clock,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';

import type { DeltaTone, Kpi } from '@/lib/payments/contract';

/**
 * The ledger's five KPI cards.
 *
 * Same card as the dashboard's, one row of five instead of six, because it is the
 * same object doing the same job and an owner moves between the two screens all
 * day. What is different is the foot: these cards have no sparkline. The design
 * draws one on each, generated from a sine wave; there is no per-metric monthly
 * series behind collected / outstanding / pending / count / average to draw a
 * real one from, and the delta beneath the figure already says the movement in
 * words. A decorative line pretending to be history on a money screen is the one
 * thing this rebuild exists to stop.
 *
 * Every icon is the same neutral grey. `DESIGN_RULES.md` bans a per-card hue
 * outright, and it is the right ban: when all five are coloured, none is
 * emphasised. The only thing on a card allowed colour is the delta, and only
 * because up and down genuinely mean better and worse there.
 */

const ICONS: Record<string, LucideIcon> = {
  collected: CreditCard,
  outstanding: AlertCircle,
  pending: Clock,
  transactions: ArrowLeftRight,
  average: BarChart3,
};

const NOTE_TONE: Record<DeltaTone, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-fg-tertiary',
};

export function KpiStrip({ kpis }: { kpis: Kpi[] }) {
  if (kpis.length === 0) return null;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-[11px] md:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = ICONS[kpi.id] ?? CreditCard;

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
            formatter (§4.3): the digits carry the weight, and a prefix that
            lives in one place cannot be doubled up by a formatter that emits
            its own. */}
        {kpi.currency && <span className="text-caption font-normal text-fg-tertiary">PKR </span>}
        {kpi.value}
      </p>

      {/* The ▲/▼ lives inside the note string — `formatDelta` owns arrow, figure
          and baseline together, so there is no second arrow to keep in sync. */}
      <p
        className={`hs-num mt-[4px] truncate text-caption font-medium ${NOTE_TONE[kpi.noteTone]}`}
      >
        {kpi.note}
      </p>
    </article>
  );
}
