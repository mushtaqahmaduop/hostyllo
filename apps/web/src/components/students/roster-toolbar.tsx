import Link from 'next/link';
import { Download, Search } from 'lucide-react';

import { SORT_LABEL, type RosterView } from '@/lib/students/contract';
import { StatusTabs } from './status-tabs';

/**
 * The roster toolbar: search, status tabs, export, and the line that says what
 * you are looking at.
 *
 * ── On the search field ──────────────────────────────────────────────────────
 * A plain GET form. The query lands in the URL, so it survives a refresh, is
 * shareable, works with the back button and needs no JavaScript — and on a
 * hostel's connection it is one request rather than one per keystroke.
 *
 * The placeholder names the fields that are genuinely searched. The redesign's
 * own copy offers "ID, CNIC, email, floor" as well, and none of those four can
 * work today: there is no student ID column in the schema, email and floor are
 * not in the query, and CNIC is encrypted with a random IV per value, so its
 * ciphertext cannot be matched with ILIKE by anything, ever. A search box that
 * lists a field it silently ignores is worse than one that lists fewer — the
 * operator types a CNIC, gets nothing, and concludes the student is not there.
 */
export function RosterToolbar({ view }: { view: RosterView }) {
  const exportParams = new URLSearchParams({ tab: view.tab, sort: view.sort, dir: view.dir });
  if (view.q) exportParams.set('q', view.q);

  return (
    <div className="mb-3 flex shrink-0 flex-col gap-[11px]">
      {/* Wraps rather than declaring a min-width: the table below scrolls
          sideways inside its own frame, and a toolbar that scrolled with it
          would take the search box off screen exactly when a wide ledger is
          being read. */}
      <div className="flex flex-wrap items-center gap-[11px]">
        <form method="GET" action="/students" className="flex min-w-[260px] flex-1">
          {/* The tab, sort and direction ride along as hidden fields: a search
              must not silently drop the filter the operator already chose. */}
          {view.tab !== 'active' && <input type="hidden" name="tab" value={view.tab} />}
          {view.sort !== 'room' && <input type="hidden" name="sort" value={view.sort} />}
          {view.dir !== 'asc' && <input type="hidden" name="dir" value={view.dir} />}

          <div className="flex h-[var(--hs-control-h)] w-full items-center gap-[9px] rounded-xl border border-hairline bg-surface px-[13px] focus-within:border-hairline-strong">
            <Search className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={view.q}
              aria-label="Search students by name, father's name, phone, room or course"
              placeholder="Name, father, phone, room, course…"
              className="h-full w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-tertiary"
            />
          </div>
          {/* Enter submits; this exists for anyone who cannot press it. */}
          <button type="submit" className="sr-only">
            Search
          </button>
        </form>

        <StatusTabs tabs={view.tabs} />

        {/*
         * Export is one button, not the redesign's CSV + PDF pair. CSV is real —
         * it pages the whole filtered list server-side and streams a file. A PDF
         * of a roster needs a document renderer nothing on the web side has, and
         * a dead second button inside the same group would read as a broken
         * feature rather than an absent one.
         */}
        <Link
          href={`/students/export?${exportParams.toString()}`}
          prefetch={false}
          className="flex h-[var(--hs-control-h)] shrink-0 items-center gap-[7px] whitespace-nowrap rounded-xl border border-hairline bg-surface px-[14px] text-[12.5px] font-medium text-fg-secondary transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-fg"
        >
          <Download className="size-4" aria-hidden />
          Export CSV
        </Link>
      </div>

      <div className="flex items-center gap-[10px]">
        <span className="hs-num text-body-sm text-fg-secondary">{view.resultLabel}</span>
        <span className="h-[14px] w-px bg-hairline" aria-hidden />
        <span className="text-body-sm text-fg-tertiary">
          Sorted by{' '}
          <b className="font-medium text-fg-secondary">
            {SORT_LABEL[view.sort]} {view.dir === 'asc' ? 'ascending' : 'descending'}
          </b>
        </span>
      </div>
    </div>
  );
}
