'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Eye } from 'lucide-react';

import { Button } from '@/components/ui-kit/button';
import { revealCnic, type RevealState } from './actions';

const INITIAL: RevealState = { cnic: null, error: null };

/**
 * CNIC reveal control.
 *
 * The number is masked until asked for, because every reveal writes an audit row naming the user
 * who asked. Showing it by default would make that log meaningless — it would record "everyone who
 * opened the page" rather than "who deliberately looked".
 *
 * Mono, per §4.3 Tier 2: a 13-digit identity number is checked digit by digit against the card in
 * someone's hand, and a proportional font makes that measurably harder.
 */
export function RevealCnic({ studentId, masked }: { studentId: string; masked: string }) {
  const [state, formAction] = useActionState(revealCnic, INITIAL);

  if (state.cnic) {
    return (
      <div>
        <span className="font-mono text-mono text-fg">{state.cnic}</span>
        <p className="mt-1 text-caption text-fg-tertiary">This reveal was recorded in the audit log.</p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="studentId" value={studentId} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-mono text-fg-secondary">{masked}</span>
        <RevealButton />
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-body-sm text-negative-text">
          {state.error}
        </p>
      )}
    </form>
  );
}

function RevealButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" loading={pending}>
      <Eye className="size-4" aria-hidden />
      Reveal
    </Button>
  );
}
