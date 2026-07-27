'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, Eye, Loader2 } from 'lucide-react';
import { revealCnic, type RevealState } from './actions';

const INITIAL: RevealState = { cnic: null, error: null };

/**
 * CNIC reveal control.
 *
 * The number is masked until asked for, because every reveal writes an audit row naming the user
 * who asked. Showing it by default would make that log meaningless — it would record "everyone who
 * opened the page" rather than "who deliberately looked".
 */
export function RevealCnic({ studentId, masked }: { studentId: string; masked: string }) {
  const [state, formAction] = useActionState(revealCnic, INITIAL);

  if (state.cnic) {
    return (
      <div>
        <span className="tabular text-text">{state.cnic}</span>
        <p className="mt-1 text-[13px] text-text-muted">This reveal was recorded in the audit log.</p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="studentId" value={studentId} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="tabular text-text-muted">{masked}</span>
        <RevealButton />
      </div>
      {state.error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-[13px] text-red">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}
    </form>
  );
}

function RevealButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border-2 px-3 text-sm font-medium text-text transition-colors duration-150 hover:border-gold hover:text-gold disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      {pending ? 'Revealing…' : 'Reveal'}
    </button>
  );
}
