import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';

import { ApiError } from '@/lib/api';
import { canOperate } from '@/lib/session';
import { getRosterView } from '@/lib/students/presenter';
import { Pagination } from '@/components/patterns/pagination';
import { EmptyState, FilteredEmptyState, ErrorState } from '@/components/patterns/states';
import { RosterTable } from '@/components/students/roster-table';
import { RosterToolbar } from '@/components/students/roster-toolbar';
import { Alert, AlertDescription } from '@/components/ui-kit/alert';

export const metadata = { title: 'Students' };

/**
 * The Students roster — the owner's redesign, `docs/design/handoff/designs/Students.dc.html`.
 *
 * Toolbar, then a ten-column table that scrolls inside its own frame, then
 * numbered pagination. `getRosterView` owns every figure: the tab counts, the
 * rent + mess arithmetic and the result line all come out of the one request
 * that fetched the rows, so no two of them can disagree.
 *
 * ── Where the screen's actions live ─────────────────────────────────────────
 * The sketch puts "Add Student" and "Add Payment" in the app header. They are in
 * the toolbar instead: the header is a client component shared by every route,
 * and threading a server-rendered button into it means a portal that only
 * appears after hydration — which would leave the screen's primary action
 * missing from the first paint and absent entirely without JavaScript. Same two
 * buttons, same order, same one-filled-button rule, twelve pixels lower.
 */
export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    sort?: string;
    dir?: string;
    offset?: string;
    added?: string;
  }>;
}) {
  const query = await searchParams;
  const mayWrite = await canOperate();

  let view;
  try {
    view = await getRosterView(query);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 403) {
      // A viewer or chain manager hitting a guard they do not pass. Say so
      // plainly rather than showing an empty table, which would read as "this
      // hostel has no students".
      return (
        <Alert tone="attention">
          <AlertDescription>
            Your role does not have access to the student list. Ask the hostel owner to change it.
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <ErrorState
        title="Couldn't load students"
        body="Check your connection and try again."
        detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
        retryHref="/students"
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {query.added && (
        // Named rather than "Student added": the warden has just typed a name
        // and wants to see it echoed back — it confirms the right record was
        // created.
        <Alert tone="positive" className="mb-3 shrink-0">
          <AlertDescription>
            {view.rows.find((s) => s.id === query.added)?.name ?? 'The student'} was admitted.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-end gap-[8px]">
        <Link
          href="/payments/new"
          className="inline-flex h-[var(--hs-control-h)] items-center rounded-lg border border-hairline bg-surface px-[15px] text-[13px] font-medium text-fg transition-colors duration-fast ease-standard hover:bg-surface-hover"
        >
          Add payment
        </Link>
        {mayWrite && (
          // The one filled button on this screen. Flat violet — the rules ban
          // the sketch's three-stop gradient on UI chrome.
          <Link
            href="/students/new"
            className="inline-flex h-[var(--hs-control-h)] items-center gap-[7px] rounded-lg bg-brand px-[15px] text-[13px] font-semibold text-fg-on-brand transition-colors duration-fast ease-standard hover:bg-brand-hover"
          >
            <Plus className="size-4" aria-hidden />
            Add student
          </Link>
        )}
      </div>

      <RosterToolbar view={view} />

      {view.rows.length === 0 ? (
        view.narrowed ? (
          <FilteredEmptyState what="students" clearHref="/students?tab=all" />
        ) : (
          <EmptyState
            title="No students yet"
            body="Add your first student to start tracking rooms, rent and dues."
            action={mayWrite ? { label: 'Add student', href: '/students/new' } : undefined}
          />
        )
      ) : (
        <RosterTable view={view} />
      )}

      <Pagination
        basePath="/students"
        params={{
          q: view.q || undefined,
          tab: view.tab === 'active' ? undefined : view.tab,
          sort: view.sort === 'room' ? undefined : view.sort,
          dir: view.dir === 'asc' ? undefined : view.dir,
        }}
        offset={view.offset}
        shown={view.rows.length}
        total={view.total}
        pageSize={view.pageSize}
      />
    </div>
  );
}
