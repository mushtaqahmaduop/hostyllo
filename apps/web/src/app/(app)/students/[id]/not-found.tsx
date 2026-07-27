import Link from 'next/link';
import { Notice, PageHeading } from '@/components/ui';

/**
 * Reached for both a student who does not exist and one belonging to another hostel — RLS returns
 * no row either way, and the wording keeps it that way rather than confirming an id exists
 * somewhere the viewer cannot see.
 */
export default function NotFound() {
  return (
    <>
      <PageHeading title="Student not found" />
      <Notice tone="muted">
        No student with that reference is in this hostel. They may have been removed.
      </Notice>
      <p className="mt-4">
        <Link href="/students">← Back to students</Link>
      </p>
    </>
  );
}
