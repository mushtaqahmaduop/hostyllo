import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';

import { ApiError } from '@/lib/api';
import { getStudentDetail } from '@/lib/students/detail-presenter';
import { canOperate, canRevealCnic } from '@/lib/session';
import { PageHeader } from '@/components/patterns/page-header';
import { EmptyState, ErrorState } from '@/components/patterns/states';
import { DetailPanel, DetailRowShell } from '@/components/students/record-panels';
import { PaymentHistory } from '@/components/students/payment-history';
import { RecordHero } from '@/components/students/record-hero';
import { Alert, AlertDescription } from '@/components/ui-kit/alert';
import { Button } from '@/components/ui-kit/button';
import { RevealCnic } from './reveal-cnic';

/**
 * The student record — `Students.dc.html`, the VIEW RECORD modal.
 *
 * Built as a route rather than the modal the design draws. `DESIGN_RULES.md` is
 * authority on IA and says to lift the proven IA from the desktop app; the modal
 * in the `.dc.html` is a property of the prototype's single-file runtime, not a
 * decision. A route is deep-linkable (a warden can send a colleague a student),
 * survives a reload, renders without JavaScript, and is what the roster's View
 * action already points at. A 1000px overlay carrying a full payment ledger is a
 * page wearing a modal's clothes.
 */

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const student = await getStudentDetail(id);
    return { title: student.name };
  } catch {
    // The page itself reports the failure properly; a title is not worth a second error path.
    return { title: 'Student' };
  }
}

export default async function StudentRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let student;
  try {
    student = await getStudentDetail(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    // A cross-tenant id is a 404 by design (RLS returns no row), so this is also the "not yours"
    // path — and it must look identical to a genuinely missing student, or the response becomes an
    // oracle for whether an id exists in someone else's hostel.
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) {
      return (
        <>
          <PageHeader title="Student" />
          <Alert tone="attention">
            <AlertDescription>
              Your role does not have access to student records. Ask the hostel owner to change it.
            </AlertDescription>
          </Alert>
        </>
      );
    }
    return (
      <>
        <PageHeader title="Student" />
        <ErrorState
          title="Couldn't load this student"
          body="Check your connection and try again."
          detail={error instanceof ApiError ? `${error.status} · ${error.message}` : String(error)}
          retryHref={`/students/${id}`}
        />
      </>
    );
  }

  const [mayWrite, mayReveal] = await Promise.all([canOperate(), canRevealCnic()]);

  /*
   * The CNIC row is assembled here rather than in the presenter because its value
   * is a component, not a string: revealing is an audited server action and the
   * control that triggers it has to live in the tree. Everything else in the
   * panel is text the presenter already owns.
   */
  const personal = student.personal;

  return (
    <>
      <Link
        href="/students"
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Students
      </Link>

      <PageHeader
        eyebrow={student.statusLabel}
        title={student.name}
        attention={Boolean(student.vacateDate)}
        actions={
          mayWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href={`/students/${student.id}/edit`}>
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Link>
              </Button>
              {student.active && (
                <Button asChild variant="primary">
                  <Link href={`/payments/new?studentId=${student.id}`}>Take payment</Link>
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* A student who has already left is not an error, but it is a state the operator must
          notice before they take money from someone who has moved out. */}
      {student.vacateDate && (
        <Alert tone="attention" className="mb-5">
          <AlertDescription>
            This student left on {student.vacateDate}. The record is kept for the ledger.
          </AlertDescription>
        </Alert>
      )}

      <RecordHero student={student} />

      <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <DetailPanel title="Personal information" rows={personal}>
          <DetailRowShell label="CNIC / ID">
            {/* Null means no CNIC was ever collected — a different fact from one held and
                hidden, and the one an operator has to act on. The API stopped masking both
                the same way; this renders the distinction. */}
            {!student.hasCnic || !student.maskedCnic ? (
              <span className="text-body-sm text-fg-tertiary">Not on record</span>
            ) : mayReveal ? (
              <RevealCnic studentId={student.id} masked={student.maskedCnic} />
            ) : (
              <span className="font-mono text-mono text-fg-secondary">{student.maskedCnic}</span>
            )}
          </DetailRowShell>
        </DetailPanel>

        <DetailPanel
          title="Room & accommodation"
          rows={student.room}
          empty="No room assigned yet."
        />
      </div>

      <div className="mt-4">
        {student.payments.length === 0 ? (
          <EmptyState
            title="No payments yet"
            body="Every payment recorded for this student will appear here, most recent month first."
            action={
              mayWrite && student.active
                ? { label: 'Take payment', href: `/payments/new?studentId=${student.id}` }
                : undefined
            }
          />
        ) : (
          <PaymentHistory student={student} />
        )}
      </div>
    </>
  );
}
