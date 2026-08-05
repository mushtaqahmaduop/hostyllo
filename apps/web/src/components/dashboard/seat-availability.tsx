import type { SeatMap, SeatState, Tone } from '@/lib/dashboard/contract';
import { Card, CardLink, CardTitle } from './card';
import { toneBorder, toneColor, toneTint } from './tone';

/**
 * How a room's state is coloured.
 *
 * The first version painted this green / red / amber, which is what the mock
 * shows and what almost every occupancy grid does. It is wrong twice over.
 *
 * The design rule is "semantic colour only when the state is actionable". A free
 * room is not an achievement and an occupied room is not a fault — both are
 * ordinary, and a wall of red rooms in a *full* hostel reads as a disaster when
 * it is the best possible outcome. Only maintenance is a thing somebody has to
 * go and do, so only maintenance takes a colour.
 *
 * Second: free/occupied as green/red is precisely the pair the commonest form of
 * colour blindness cannot separate, on the one widget where the distinction is
 * the entire point.
 *
 * So: occupied is the accent tint (the normal, expected state), free is the bare
 * canvas, maintenance is attention. Every cell also names its state in a
 * `title`, and the legend spells out all three — colour is never the only
 * carrier.
 */
const STATE: Record<SeatState, { tone: Tone; word: string; bare?: boolean }> = {
  free: { tone: 'neutral', word: 'Free', bare: true },
  occupied: { tone: 'brand', word: 'Occupied' },
  maintenance: { tone: 'attention', word: 'Maintenance' },
};

const ORDER: SeatState[] = ['free', 'occupied', 'maintenance'];

export function SeatAvailability({ seatMap }: { seatMap: SeatMap }) {
  const stats: Array<{ label: string; value: number }> = [
    { label: 'Total', value: seatMap.totals.total },
    { label: 'Free', value: seatMap.totals.free },
    { label: 'Filled', value: seatMap.totals.filled },
  ];

  return (
    <Card>
      <CardTitle>Seat Availability</CardTitle>

      {/* Three plain figures on the sunken step of the ladder. No colour: they
          are counts, and none of them is good or bad on its own. */}
      <div className="my-[10px] grid grid-cols-3 gap-[9px]">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-[2px] rounded-lg border border-hairline bg-canvas px-2 py-[6px]"
          >
            <span className="hs-num text-h2 font-bold leading-[1.1] tracking-tight">{s.value}</span>
            <span className="text-eyebrow font-semibold uppercase tracking-wider text-fg-tertiary">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-[6px]">
        {seatMap.floors.map((rooms, floor) => (
          <div key={floor} className="grid grid-cols-8 gap-[5px]">
            {rooms.map((room) => {
              const spec = STATE[room.state];
              return (
                <span
                  key={room.no}
                  title={`Room ${room.no} · ${spec.word}`}
                  className="hs-num flex h-[22px] items-center justify-center rounded-sm border text-[10.5px] font-medium"
                  style={{
                    background: spec.bare ? 'var(--hs-canvas)' : toneTint(spec.tone),
                    borderColor: spec.bare ? 'var(--hs-hairline)' : toneBorder(spec.tone),
                    color: spec.bare ? 'var(--hs-text-tertiary)' : toneColor(spec.tone),
                  }}
                >
                  {room.no}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-[13px] flex items-center gap-[13px]">
        {ORDER.map((state) => {
          const spec = STATE[state];
          return (
            <span
              key={state}
              className="flex items-center gap-[6px] whitespace-nowrap text-caption text-fg-secondary"
            >
              <span
                className="size-[9px] shrink-0 rounded-sm border"
                style={{
                  background: spec.bare ? 'var(--hs-canvas)' : toneTint(spec.tone),
                  borderColor: spec.bare ? 'var(--hs-hairline-strong)' : toneBorder(spec.tone),
                }}
                aria-hidden
              />
              {spec.word}
            </span>
          );
        })}
        <span className="flex-1" />
        <CardLink href="/rooms">View Room Status</CardLink>
      </div>
    </Card>
  );
}
