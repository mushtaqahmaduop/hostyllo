import Link from 'next/link';
import { Wrench } from 'lucide-react';

import { formatAmount } from '@/lib/format';
import type { RoomCard as Room, RoomStatus } from '@/lib/rooms/contract';
import { cn } from '@/lib/utils';

/**
 * One room.
 *
 * Number and type, the floor/beds line, the rent, an occupancy bar, then the
 * people in it. The card is the screen: a warden's question is spatial, and
 * seeing which rooms have space answers it faster than any table of counts.
 *
 * ── What the design puts here that this does not ─────────────────────────────
 * **Amenities** (Wi-Fi, AC, attached bath, TV, balcony) — five icons per card,
 * and the schema has no amenity column, no join table, nothing. The design
 * derives them from capacity: four beds gets you a balcony. That is a decoration
 * that reads as a fact, and a warden would place a student on it.
 * **The QR label button** has no destination — no label rendering exists.
 * **"Reserved" and "Cleaning"** are covered in the contract: no schema, no tab.
 */

const STATUS_PILL: Record<RoomStatus, string> = {
  // Vacant is the one that gets the accent: on a board whose entire purpose is
  // finding space, the room with space is the actionable one. `DESIGN_RULES.md`
  // spends colour on the actionable state, and this screen's is the empty room —
  // the exact inverse of the ledger, where the empty cell is the problem.
  vacant: 'border-brand-border bg-brand-tint text-brand-text',
  occupied: 'border-hairline bg-surface-hover text-fg-secondary',
  full: 'border-hairline bg-surface-hover text-fg-secondary',
  maintenance: 'border-attention-border bg-attention-tint text-attention',
  inactive: 'border-hairline bg-surface-hover text-fg-tertiary',
};

export function RoomCard({ room }: { room: Room }) {
  return (
    <article
      className={cn(
        'flex flex-col gap-[10px] rounded-xl border border-hairline bg-surface p-[13px]',
        // No hover-lift. §16.6 names translateY plus a growing shadow as the
        // single most template-looking effect there is; the border does the work.
        'transition-colors duration-fast ease-standard hover:border-hairline-strong',
        room.status === 'inactive' && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-[7px]">
        <h2 className="hs-num shrink-0 text-[16px] font-semibold tracking-tight text-fg">
          {room.number}
        </h2>
        {room.roomTypeLabel && (
          <span className="shrink-0 rounded-full border border-hairline bg-surface-hover px-[7px] py-[2.5px] text-[10px] font-semibold text-fg-secondary">
            {room.roomTypeLabel}
          </span>
        )}
        <span className="min-w-[2px] flex-1" />
        <span
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full border px-[8px] py-[2.5px] text-[10px] font-semibold',
            STATUS_PILL[room.status],
          )}
        >
          {room.statusLabel}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-[10px] text-[11.5px]">
        <span className="whitespace-nowrap text-fg-tertiary">
          Floor <b className="font-medium text-fg">{room.floor ?? 'not recorded'}</b>
        </span>
        <span className="hs-num whitespace-nowrap text-fg-tertiary">
          <b className="font-medium text-fg">
            {room.occupiedBeds}/{room.totalBeds}
          </b>{' '}
          {room.totalBeds === 1 ? 'bed' : 'beds'}
        </span>
      </div>

      {/* Only when the two disagree. On a card where they agree, saying so twice
          is noise; where they differ it is the difference between a bed a
          student can be put in and a number typed on a form. */}
      {room.capacityNote && (
        <p className="text-[10.5px] leading-[1.35] text-fg-tertiary">{room.capacityNote}</p>
      )}

      <div className="flex items-baseline justify-between gap-[10px]">
        <span className="text-[11.5px] text-fg-tertiary">Monthly rent</span>
        <span className="hs-num whitespace-nowrap text-[14px] font-semibold text-fg">
          <span className="text-[11px] font-normal text-fg-tertiary">PKR </span>
          {formatAmount(room.rent)}
        </span>
      </div>

      {room.occupancyPct !== null && (
        <div>
          <div
            className="h-[5px] overflow-hidden rounded-full bg-surface-hover"
            role="img"
            aria-label={`${room.occupiedBeds} of ${room.totalBeds} beds occupied`}
          >
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${room.occupancyPct}%` }}
            />
          </div>
          <p className="hs-num mt-[4px] text-end text-[10px] text-fg-tertiary">
            {Math.round(room.occupancyPct)}%
          </p>
        </div>
      )}

      {/* The people. This is what the card is for — a bed count says a room is
          half full, a name says who to ask about the other half. */}
      <div className="flex min-h-[52px] flex-col gap-[7px]">
        {room.occupants.length > 0 ? (
          room.occupants.map((occupant) => (
            <div key={occupant.studentId} className="flex items-center gap-[8px]">
              <span
                aria-hidden
                className="grid size-[26px] shrink-0 place-items-center rounded-full border border-hairline bg-surface-hover text-[10px] font-semibold text-fg-secondary"
              >
                {occupant.initials}
              </span>
              <span className="min-w-0 flex-1">
                <Link
                  href={`/students/${occupant.studentId}`}
                  className="block truncate text-[11.5px] font-medium leading-[1.25] text-fg hover:text-brand-text"
                >
                  {occupant.name}
                </Link>
                <span className="block truncate text-[10px] leading-[1.3] text-fg-tertiary">
                  {occupant.course ?? 'Course not recorded'}
                </span>
              </span>
              {occupant.unpaid > 0 && (
                <span className="hs-num shrink-0 whitespace-nowrap rounded-full border border-negative-border bg-negative-tint px-[7px] py-[3px] text-[9.5px] font-semibold text-negative">
                  PKR {formatAmount(occupant.unpaid)} due
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-[6px] rounded-lg border border-dashed border-hairline-strong bg-surface-sunken px-[8px] py-[12px]">
            <span className="text-center text-[11px] text-fg-tertiary">
              {room.totalBeds === 0 ? 'No beds configured' : 'No students assigned'}
            </span>
          </div>
        )}
      </div>

      {/* A real open request, with its own title — not a note keyed to the room
          number. `maintenance_requests.room_id` is what this reads. */}
      {room.openMaintenance > 0 && (
        <p className="flex items-start gap-[6px] rounded-lg border border-attention-border bg-attention-tint px-[9px] py-[7px] text-[10.5px] leading-[1.35] text-attention">
          <Wrench className="mt-[1px] size-[12px] shrink-0" aria-hidden />
          <span className="min-w-0">
            {room.maintenanceTitle ?? 'Maintenance request open'}
            {room.maintenancePriority && (
              <span className="font-semibold"> · {room.maintenancePriority}</span>
            )}
            {room.openMaintenance > 1 && (
              <span className="text-fg-tertiary"> · +{room.openMaintenance - 1} more</span>
            )}
          </span>
        </p>
      )}
    </article>
  );
}
