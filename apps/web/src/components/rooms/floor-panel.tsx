import { formatAmount } from '@/lib/format';
import type { FloorSummary, RoomsView } from '@/lib/rooms/contract';

/**
 * The rail: where the space is.
 *
 * Two panels, both answering the placement question at a level the cards cannot
 * — which floor has room, and which specific rooms have a bed left.
 *
 * ── The design's other rail panels ───────────────────────────────────────────
 * **The occupancy donut** restates the Occupancy Rate KPI four inches above it,
 * in a form that is harder to read; §8 is explicit that charts are subordinate,
 * and one figure does not need two renderings.
 * **"Recent activity"** ("Room B-204 assigned · 2h ago") needs a room-events
 * table. Nothing writes one — bed assignment happens inside POST /students and
 * /rooms/shift and leaves an `audit_log` row, not a feed — so the timestamps
 * would be invented.
 * **The maintenance list** is not duplicated here: it is on the cards, attached
 * to the room it concerns, which is where a warden acts on it.
 */
export function FloorPanel({ view }: { view: RoomsView }) {
  return (
    <aside className="hidden w-[264px] shrink-0 flex-col gap-[11px] xl:flex">
      <section className="flex flex-col gap-[10px] rounded-xl border border-hairline bg-surface p-[13px]">
        <h2 className="text-eyebrow font-semibold uppercase tracking-wider text-fg-tertiary">
          By floor
        </h2>
        {view.floors.length === 0 ? (
          <p className="text-[12px] text-fg-tertiary">No rooms yet.</p>
        ) : (
          <ul className="flex flex-col gap-[10px]">
            {view.floors.map((floor) => (
              <FloorRow key={floor.label} floor={floor} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-[10px] rounded-xl border border-hairline bg-surface p-[13px]">
        <h2 className="text-eyebrow font-semibold uppercase tracking-wider text-fg-tertiary">
          Where there is space
        </h2>
        {view.vacancies.length === 0 ? (
          <p className="text-[12px] text-fg-tertiary">
            Every bed is taken. A new admission needs a bed freed or created first.
          </p>
        ) : (
          <ul className="flex flex-col gap-[8px]">
            {view.vacancies.map((room) => (
              <li key={room.id} className="flex items-center gap-[9px]">
                <span className="hs-num shrink-0 rounded-lg border border-hairline bg-surface-hover px-[7px] py-[2px] text-[11.5px] font-semibold text-fg">
                  {room.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-fg-tertiary">
                  {room.floor ?? 'Floor not recorded'}
                </span>
                <span className="hs-num shrink-0 text-[11.5px] font-semibold text-brand-text">
                  {room.freeBeds} free
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

function FloorRow({ floor }: { floor: FloorSummary }) {
  const filled = floor.totalBeds - floor.freeBeds;
  const pct = floor.totalBeds > 0 ? (filled / floor.totalBeds) * 100 : 0;

  return (
    <li>
      <div className="flex items-baseline justify-between gap-[8px]">
        <span className="min-w-0 truncate text-[12px] font-medium text-fg">{floor.label}</span>
        <span className="hs-num shrink-0 text-[11px] text-fg-tertiary">
          {formatAmount(floor.rooms)} {floor.rooms === 1 ? 'room' : 'rooms'}
        </span>
      </div>
      <div className="mt-[5px] h-[5px] overflow-hidden rounded-full bg-surface-hover">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <p className="hs-num mt-[4px] text-[10.5px] text-fg-tertiary">
        {filled} of {floor.totalBeds} beds filled
        {floor.freeBeds > 0 && ` · ${floor.freeBeds} free`}
      </p>
    </li>
  );
}
