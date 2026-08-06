import type { SeatMap, SeatRoom, Sourced, Tone } from '@/lib/dashboard/contract';
import { Card, CardLink, CardTitle } from './card';
import { EmptyCard } from './empty';
import { toneBorder, toneColor, toneTint } from './tone';

/**
 * How a room is coloured.
 *
 * The first version painted this green / red / amber, which is what almost every occupancy grid
 * does. It is wrong twice over.
 *
 * The design rule is "semantic colour only when the state is actionable". A room with free
 * seats is not an achievement and a full room is not a fault — both are ordinary, and a wall of
 * red in a *full* hostel reads as a disaster when it is the best possible outcome.
 *
 * Second: free/full as green/red is precisely the pair the commonest form of colour blindness
 * cannot separate, on the one widget where the distinction is the entire point.
 *
 * So: a room with free seats takes the accent tint (it is the one you can act on — put someone
 * in it), a full room is the bare canvas. Every tile names its state in a `title`, and the
 * legend spells both out — colour is never the only carrier.
 *
 * ── These are real rooms ─────────────────────────────────────────────────────────────────────
 * This grid previously rendered a synthesised floor plan: "four floors of eight rooms, numbered
 * 101…408", 32 tiles regardless of what the hostel actually had. It now renders exactly the
 * rooms `GET /dashboard/seat-map` returns, in their own numbering, grouped by their own floors.
 */
const SPEC: Record<'hasFree' | 'full', { tone: Tone; word: string; bare?: boolean }> = {
  hasFree: { tone: 'brand', word: 'Has free seats' },
  full: { tone: 'neutral', word: 'Full', bare: true },
};

export function SeatAvailability({ seatMap }: { seatMap: Sourced<SeatMap> }) {
  if (seatMap.from === 'empty') {
    return (
      <EmptyCard
        title="Seat Availability"
        body="No rooms have been added yet. Once you add rooms, every one appears here with its live occupancy."
        actionHref="/rooms"
        actionLabel="Add rooms"
      />
    );
  }

  const { rooms, totals } = seatMap.data;

  // Group by the room's own floor. Rooms with no floor recorded fall into one unlabelled group
  // rather than being assigned a floor they do not have.
  const byFloor = new Map<string, SeatRoom[]>();
  for (const room of rooms) {
    const key = room.floor ?? '';
    const list = byFloor.get(key);
    if (list) list.push(room);
    else byFloor.set(key, [room]);
  }

  const stats = [
    { label: 'Rooms', value: totals.rooms },
    { label: 'Seats', value: totals.seats },
    { label: 'Free', value: totals.free },
  ];

  return (
    <Card>
      <CardTitle>Seat Availability</CardTitle>

      {/* Three plain figures on the sunken step of the ladder. No colour: they are counts, and
          none of them is good or bad on its own. */}
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

      <div className="flex flex-1 flex-col justify-center gap-[8px] overflow-y-auto">
        {[...byFloor.entries()].map(([floor, floorRooms]) => (
          <div key={floor || 'unassigned'} className="flex flex-col gap-[5px]">
            {floor && (
              <span className="text-eyebrow font-semibold uppercase tracking-wider text-fg-tertiary">
                {floor}
              </span>
            )}
            {/* auto-fill rather than a fixed column count: the grid takes as many rooms per row
                as the card is wide enough for, at any viewport. */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(38px,1fr))] gap-[5px]">
              {floorRooms.map((room) => {
                const spec = room.isFull ? SPEC.full : SPEC.hasFree;
                return (
                  <span
                    key={room.id}
                    title={`Room ${room.no} · ${room.occupied}/${room.capacity} filled · ${room.free} free`}
                    className="flex flex-col items-center justify-center gap-[1px] rounded-sm border px-1 py-[3px]"
                    style={{
                      background: spec.bare ? 'var(--hs-canvas)' : toneTint(spec.tone),
                      borderColor: spec.bare ? 'var(--hs-hairline)' : toneBorder(spec.tone),
                      color: spec.bare ? 'var(--hs-text-tertiary)' : toneColor(spec.tone),
                    }}
                  >
                    <span className="hs-num text-[10.5px] font-bold leading-none">{room.no}</span>
                    <span className="hs-num text-[9px] leading-none opacity-80">
                      {room.occupied}/{room.capacity}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-[13px] flex flex-wrap items-center gap-[13px]">
        {([SPEC.hasFree, SPEC.full] as const).map((spec) => (
          <span
            key={spec.word}
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
        ))}
        <span className="flex-1" />
        <CardLink href="/rooms">View Room Status</CardLink>
      </div>
    </Card>
  );
}
