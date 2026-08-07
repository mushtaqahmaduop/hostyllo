import { Search } from 'lucide-react';

import type { RoomsView } from '@/lib/rooms/contract';
import { StatusTabs } from '@/components/patterns/status-tabs';

/**
 * The board's toolbar: search, status tabs, and the line that says what you are
 * looking at.
 *
 * A plain GET form, like the roster's and the ledger's — the query lands in the
 * URL, survives a refresh, and works with the back button and without JavaScript.
 *
 * The design's three dropdowns (floor, type, capacity) are not here. Floor and
 * type are already searchable by typing them, and the tabs carry the state
 * filter; a dropdown per column on a board of a few dozen cards is chrome that
 * costs a row of height and answers nothing the search box does not. If a hostel
 * ever has enough rooms for that to stop being true, the endpoint gains real
 * filters first.
 */
export function RoomsToolbar({ view }: { view: RoomsView }) {
  return (
    <div className="mb-3 flex shrink-0 flex-col gap-[11px]">
      <div className="flex flex-wrap items-center gap-[11px]">
        <form method="GET" action="/rooms" className="flex min-w-[260px] flex-1">
          <div className="flex h-[var(--hs-control-h)] w-full items-center gap-[9px] rounded-xl border border-hairline bg-surface px-[13px] focus-within:border-hairline-strong">
            <Search className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={view.q}
              aria-label="Search rooms by number, floor, type or occupant"
              placeholder="Room number, floor, type, occupant…"
              className="h-full w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-tertiary"
            />
          </div>
          <button type="submit" className="sr-only">
            Search
          </button>
        </form>

        <StatusTabs tabs={view.tabs} label="Filter rooms by state" />
      </div>

      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="hs-num text-body-sm text-fg-secondary">{view.resultLabel}</span>
        <span className="h-[14px] w-px bg-hairline" aria-hidden />
        {/* The screen's actual question, answered in the toolbar before any card
            is read: is there anywhere to put somebody. */}
        <span className="text-body-sm text-fg-tertiary">
          {view.freeBeds > 0 ? (
            <>
              <b className="hs-num font-medium text-fg-secondary">{view.freeBeds}</b> bed
              {view.freeBeds === 1 ? '' : 's'} free across the hostel
            </>
          ) : (
            'Every bed is taken'
          )}
        </span>
      </div>
    </div>
  );
}
