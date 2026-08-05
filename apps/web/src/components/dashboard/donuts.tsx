import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { BedSegment, MethodSlice, RoomTypeSlice } from '@/lib/dashboard/contract';
import { formatAmount } from '@/lib/format';
import { Card, CardTitle } from './card';
import { RAMP, toneColor } from './tone';

/**
 * One donut, drawn as stacked `stroke-dasharray` arcs on concentric circles.
 *
 * Arcs rather than `<path>` wedges because a stroked circle needs no arc-flag
 * trigonometry and cannot produce the degenerate wedge a 100%-of-one-slice case
 * gives you with `A` commands. The rotation puts twelve o'clock at the start.
 *
 * `segments` must already be ordered; each one's offset is the running total of
 * everything before it.
 */
function Donut({
  segments,
  radius = 39,
  strokeWidth = 14,
  size,
  track,
  children,
}: {
  segments: Array<{ key: string; value: number; color: string }>;
  radius?: number;
  strokeWidth?: number;
  size: number;
  /** Draws an unfilled remainder ring behind the arcs. */
  track?: boolean;
  children: React.ReactNode;
}) {
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90" style={{ width: size, height: size }} aria-hidden>
        {track && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--hs-chart-track)"
            strokeWidth={strokeWidth}
          />
        )}
        {segments.map((s) => {
          const fraction = s.value / total;
          const arc = (
            <circle
              key={s.key}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${(circumference * fraction).toFixed(2)} ${circumference.toFixed(2)}`}
              strokeDashoffset={(-circumference * offset).toFixed(2)}
            />
          );
          offset += fraction;
          return arc;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** Occupancy by room type — magnitudes of one thing, so one violet ramp. */
export function RoomTypeCard({ types }: { types: RoomTypeSlice[] }) {
  const rooms = types.reduce((sum, t) => sum + t.rooms, 0);
  const full = types.reduce((sum, t) => sum + t.roomsFull, 0);

  return (
    <Card>
      <CardTitle>Occupancy by Room Type</CardTitle>

      <div className="mt-[13px] flex flex-1 items-center gap-[14px]">
        <Donut
          size={112}
          radius={40}
          strokeWidth={13}
          track
          segments={types.map((t, i) => ({
            key: t.label,
            value: t.rooms,
            color: RAMP[i % RAMP.length],
          }))}
        >
          <span className="hs-num text-[18px] font-bold leading-[1.1] tracking-tight">
            {full}/{rooms}
          </span>
          <span className="text-caption leading-[1.35] text-fg-secondary">Rooms Full</span>
        </Donut>

        <ul className="flex min-w-0 flex-1 list-none flex-col gap-[9px] p-0">
          {types.map((t, i) => (
            <li key={t.label} className="flex min-w-0 flex-col gap-1">
              <span className="flex items-baseline gap-2 whitespace-nowrap text-body-sm">
                <span className="shrink-0 font-medium">{t.label}</span>
                <span className="flex-1" />
                <span className="hs-num shrink-0 text-fg-tertiary">
                  {t.seatsFree} of {t.seats} free
                </span>
                <span className="hs-num shrink-0 font-medium text-fg-secondary">· {t.fullPct}% full</span>
              </span>
              <span className="block h-1 overflow-hidden rounded-full bg-surface-hover">
                <span
                  className="block h-1 rounded-full"
                  style={{ width: `${t.fullPct}%`, background: RAMP[i % RAMP.length] }}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/**
 * Collection by payment method.
 *
 * The violet ramp again, not five distinct hues. Cash, Bank and JazzCash are not
 * five different *kinds* of thing — they are five shares of one number, the same
 * relationship the room-type donut shows. Five hues here would say the methods
 * carry meaning they do not, and would put a second, third and fourth chromatic
 * voice on a page that is allowed one.
 *
 * The ramp is ordered largest share first, so the darkest stop is the biggest
 * slice and the donut reads without consulting the legend.
 */
export function MethodCard({ methods }: { methods: MethodSlice[] }) {
  const total = methods.reduce((sum, m) => sum + m.amount, 0);
  const ordered = [...methods].sort((a, b) => b.amount - a.amount);

  return (
    <Card>
      <CardTitle>Collection by Payment Method</CardTitle>

      <div className="mt-[13px] flex flex-1 items-center gap-[14px]">
        <Donut
          size={118}
          segments={ordered.map((m, i) => ({
            key: m.label,
            value: m.amount,
            color: RAMP[RAMP.length - 1 - (i % RAMP.length)],
          }))}
        >
          <span className="hs-num text-body-sm font-semibold leading-[1.2]">PKR</span>
          <span className="hs-num text-[13px] font-bold leading-[1.25] tracking-tight">
            {formatAmount(total)}
          </span>
          <span className="text-eyebrow leading-[1.35] text-fg-tertiary">Total</span>
        </Donut>

        <ul className="flex min-w-0 flex-1 list-none flex-col gap-[9px] p-0">
          {ordered.map((m, i) => (
            <li key={m.label} className="flex items-center gap-2 whitespace-nowrap text-body-sm">
              <span
                className="size-[9px] shrink-0 rounded-sm"
                style={{ background: RAMP[RAMP.length - 1 - (i % RAMP.length)] }}
                aria-hidden
              />
              <span className="shrink-0 font-medium">{m.label}</span>
              <span className="flex-1" />
              <span className="hs-num shrink-0 text-fg-secondary">
                {total > 0 ? ((m.amount / total) * 100).toFixed(1) : '0.0'}% ({formatAmount(m.amount)})
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** Bed occupancy — occupied / vacant / under maintenance. */
export function BedOccupancyCard({ segments }: { segments: BedSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const occupied = segments.find((s) => s.label === 'Occupied')?.value ?? 0;

  return (
    <Card>
      <CardTitle>Bed Occupancy Overview</CardTitle>

      <div className="mt-[13px] flex flex-1 items-center gap-[14px]">
        <Donut
          size={118}
          track
          segments={segments.map((s) => ({
            key: s.label,
            value: s.value,
            color: toneColor(s.tone),
          }))}
        >
          {/* A zero here renders as a plain figure, never as a success — an empty
              hostel is not good news, and green would say it was. */}
          <span className="hs-num text-[21px] font-bold leading-[1.1] tracking-tight">
            {total > 0 ? `${((occupied / total) * 100).toFixed(1)}%` : '—'}
          </span>
          <span className="text-caption leading-[1.35] text-fg-secondary">Occupied</span>
          <span className="hs-num text-caption leading-[1.35] text-fg-tertiary">
            {occupied} / {total}
          </span>
        </Donut>

        <ul className="flex min-w-0 flex-1 list-none flex-col gap-[11px] p-0">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2 whitespace-nowrap text-body-sm">
              <span
                className="size-[9px] shrink-0 rounded-sm"
                style={{ background: toneColor(s.tone) }}
                aria-hidden
              />
              <span className="flex-1 truncate">{s.label}</span>
              <span className="hs-num shrink-0 font-medium">{s.value}</span>
              <span className="hs-num w-[50px] shrink-0 text-end text-fg-tertiary">
                ({total > 0 ? ((s.value / total) * 100).toFixed(1) : '0.0'}%)
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Secondary: outlined, neutral text. The screen's one filled action lives
          in Quick Actions, and a second filled button would break the rule the
          whole colour system rests on. */}
      <Link
        href="/rooms"
        className="mt-3 flex h-9 shrink-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-md border border-hairline bg-surface text-[12.5px] font-medium text-fg transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-fg"
      >
        View Floor Plans
        <ArrowRight className="size-[14px]" aria-hidden />
      </Link>
    </Card>
  );
}
