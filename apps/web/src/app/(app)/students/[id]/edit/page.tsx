import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { ApiError } from '@/lib/api';
import { getStudentEditValues } from '@/lib/students/detail-presenter';
import { canOperate } from '@/lib/session';
import { PageHeader } from '@/components/patterns/page-header';
import { ErrorState } from '@/components/patterns/states';
import { Alert, AlertDescription } from '@/components/ui-kit/alert';
import { Button } from '@/components/ui-kit/button';
import { EditStudentForm } from './edit-form';

export const metadata = { title: 'Edit student' };

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Checked before the fetch: a viewer who cannot save should be told so, not shown a filled-in
  // form that fails at the end.
  if (!(await canOperate())) {
    return (
      <>
        <PageHeader title="Edit student" />
        <Alert tone="attention">
          <AlertDescription>
            Your role cannot edit students. Ask the hostel owner to change it.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  let values;
  try {
    values = await getStudentEditValues(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    // A cross-tenant id returns no row under RLS, so 404 is also the "not yours" path — and it has
    // to look identical to a missing student or the response tells you which ids exist elsewhere.
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <>
        <PageHeader title="Edit student" />
        <ErrorState
          title="Couldn't load this student"
          body="Check your connection and try again."
          detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
          retryHref={`/students/${id}/edit`}
        />
      </>
    );
  }

  return (
    <>
      <Link
        href={`/students/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {values.name}
      </Link>

      <PageHeader
        eyebrow="Edit"
        title={values.name}
        description="Room changes go through Shift room, so the rent and any pending payments move with the student."
        actions={
          <Button asChild variant="ghost">
            <Link href={`/students/${id}`}>Cancel</Link>
          </Button>
        }
      />

      <EditStudentForm values={values} />
    </>
  );
}
