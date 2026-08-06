import {
  AlertCircle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  CreditCard,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { Kpi } from '@/lib/dashboard/contract';
import { toneColor, SERIES } from './tone';

const ICONS: Record<string, LucideIcon> = {
  students: Users,
  revenue: Wallet,
  expenses: ArrowLeftRight,
  fund: CreditCard,
  dues: AlertCircle,
  maintenance: Wrench,
};

/**
 * Row 1 — six KPI cards.
 *
 * Six across, not three: this is a glance strip, and the six figures are the
 * ones a hostel owner checks before doing anything else. Each card is
 * icon + label / figure / note / sparkline, top to bottom, so the eye can read a
 * whole row of figures without re-finding the baseline.
 *
 * ── Every icon is the same neutral ────────────────────────────────────────────
 * The earlier version tinted each one to its own hue — six icons, six colours.
 * `DESIGN_RULES.md` bans exactly that: "one neutral icon colour for all
 * stat-card icons. No rainbow icons." It is the right ban. Colour on all six
 * carries no information, because when everything is coloured nothing is
 * emphasised; it just makes the strip look like a toy. The one thing on a card
 * that may take colour is the delta note, and only because up and down genuinely
 * mean good and bad there.
 */
export function KpiStrip({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = ICONS[kpi.id] ?? Wallet;
  const Arrow = kpi.direction === 'up' ? ArrowUp : ArrowDown;

  return (
    <article className="flex min-h-[126px] flex-col overflow-hidden rounded-xl border border-hairline bg-surface">
      <div className="flex items-center gap-[9px] px-[13px] pt-[13px]">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-hover text-fg-secondary">
          <Icon className="size-4" aria-hidden />
        </span>
        <h3 className="min-w-0 flex-1 text-eyebrow font-semibold uppercase leading-[1.35] tracking-wider text-fg-tertiary">
          {kpi.label}
        </h3>
      </div>

      <div className="px-[13px] pt-[9px]">
        <p className="hs-num truncate text-figure font-bold tracking-tight">{kpi.value}</p>
        <p
          className="mt-1 flex items-center gap-1 overflow-hidden whitespace-nowrap text-caption font-medium"
          style={{ color: toneColor(kpi.noteTone) }}
        >
          {kpi.direction !== 'none' && <Arrow className="size-3 shrink-0" aria-hidden />}
          <span className="hs-num truncate">{kpi.note}</span>
        </p>
      </div>

      <div className="min-h-2 flex-1" />
      <Sparkline points={kpi.spark} />
    </article>
  );
}

/**
 * The 32px trend line across the foot of a KPI card.
 *
 * Violet, on every card — it is the same series (this metric over time) six
 * times, so it is one colour six times. `preserveAspectRatio="none"` lets it
 * stretch to whatever the grid column turns out to be, and
 * `vector-effect="non-scaling-stroke"` stops that stretch from also stretching
 * the 1.5px stroke into a wedge.
 *
 * Purely decorative, so it is hidden from assistive tech: the movement it shows
 * is already stated in words by the note directly above it.
 */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <div className="h-8" />;

  const min = Math.min(...points);
  const max = Math.max(...points);
  // A flat series would divide by zero; draw it down the middle instead.
  const span = max - min || 1;

  const coords = points.map((v, i) => {
    const x = (i * 200) / (points.length - 1);
    const y = 30 - ((v - min) / span) * 26;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox="0 0 200 34"
      preserveAspectRatio="none"
      className="block h-8 w-full"
      aria-hidden
      focusable="false"
    >
      <polygon points={`${coords.join(' ')} 200,34 0,34`} fill="var(--hs-chart-hero)" />
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={SERIES.subject}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
