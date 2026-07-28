import { PageHeader } from '@/components/patterns/page-header';
import { EmptyState } from '@/components/patterns/states';

/**
 * Reached for both a student who does not exist and one belonging to another hostel — RLS returns
 * no row either way, and the wording keeps it that way rather than confirming an id exists
 * somewhere the viewer cannot see.
 */
export default function NotFound() {
  return (
    <>
      <PageHeader title="Student not found" />
      <EmptyState
        title="No student with that reference"
        body="Nobody with that reference is in this hostel. They may have been removed."
        action={{ label: 'Back to students', href: '/students' }}
      />
    </>
  );
}
