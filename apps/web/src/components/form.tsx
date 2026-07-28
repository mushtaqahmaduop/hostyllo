'use client';

import { useFormStatus } from 'react-dom';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui-kit/button';
import { Alert, AlertDescription } from '@/components/ui-kit/alert';
import { cn } from '@/lib/utils';

/**
 * Form primitives — docs/15_UI_SPEC_v1.md §7.7.
 *
 * Every control is a real `<input>`/`<select>` inside a real `<form>`. That is a deliberate
 * constraint, not a shortcut: a warden on a slow phone in a hostel corridor gets a working form
 * before the JavaScript bundle arrives, and the Server Action handles the submission either way.
 * Anything that needs client state (the room→bed dependency, the live balance) opts in explicitly.
 *
 * This is also why these are hand-rolled rather than shadcn's `Form`, which is built on
 * react-hook-form and does not exist until JS does. The shadcn *primitives* supply appearance; the
 * behaviour stays server-first.
 *
 * Labels sit above their field and never float: §7.7 rules floating labels out because they break
 * with Urdu and vanish exactly when the operator re-reads the form to check what they typed.
 */

const CONTROL =
  'w-full h-[var(--hs-control-h)] rounded-md border border-hairline bg-surface px-3 text-body text-fg ' +
  'placeholder:text-fg-tertiary transition-[border-color] duration-instant ease-standard ' +
  'hover:border-hairline-strong aria-invalid:border-negative ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const LABEL = 'mb-2 flex items-baseline gap-2 text-body-sm font-medium text-fg-secondary';

/**
 * §7.7: "Required marked with the word 'Required', not an asterisk."
 *
 * An asterisk is a convention that has to be learned, and its legend is usually somewhere the user
 * is not looking. The word costs eight characters and needs no legend.
 */
function LabelRow({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className={LABEL}>
      <span className="text-fg">{label}</span>
      {required && <span className="text-caption font-normal text-fg-tertiary">Required</span>}
    </label>
  );
}

export function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  placeholder,
  hint,
  error,
  inputMode,
  min,
  step,
  autoFocus,
  numeric,
}: {
  label: string;
  name: string;
  // `month` is unsupported in Safari and degrades to a text box there, which is why every screen
  // using it also states the expected `YYYY-MM` format rather than relying on the picker.
  type?: 'text' | 'tel' | 'email' | 'number' | 'date' | 'month';
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  hint?: string;
  /** §7.7: the error replaces the helper text and must explain the fix, never "Invalid input". */
  error?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  min?: number;
  step?: string;
  autoFocus?: boolean;
  /** §4.3 Tier 2 — currency, CNIC, phone and receipt numbers get the mono face. */
  numeric?: boolean;
}) {
  const messageId = hint || error ? `${name}-message` : undefined;

  return (
    <div>
      <LabelRow htmlFor={name} label={label} required={required} />
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        inputMode={inputMode}
        min={min}
        step={step}
        autoFocus={autoFocus}
        aria-describedby={messageId}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, numeric && 'font-mono text-mono tabular-nums')}
      />
      {(error || hint) && (
        <p
          id={messageId}
          className={cn('mt-1.5 text-body-sm', error ? 'text-negative-text' : 'text-fg-tertiary')}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  name,
  required,
  defaultValue,
  children,
  hint,
  error,
  onChange,
  value,
  disabled,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  onChange?: (value: string) => void;
  value?: string;
  disabled?: boolean;
}) {
  const messageId = hint || error ? `${name}-message` : undefined;

  return (
    <div>
      <LabelRow htmlFor={name} label={label} required={required} />
      <div className="relative">
        {/*
          A native <select>, not shadcn's Radix one. Radix's Select renders a custom listbox that
          needs JavaScript and does not submit with the form when it is absent — and on Android the
          native control opens the OS picker, which is bigger, faster and already familiar. This is
          the case where the platform beats the design system.
        */}
        <select
          id={name}
          name={name}
          required={required}
          defaultValue={defaultValue}
          value={value}
          disabled={disabled}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          aria-describedby={messageId}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL, 'appearance-none pe-10')}
        >
          {children}
        </select>
        {/* An icon rather than an inline SVG data-URI: `currentColor` follows the theme switch,
            which a background-image with a baked-in hex cannot do (§16.17). */}
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary"
        />
      </div>
      {(error || hint) && (
        <p
          id={messageId}
          className={cn('mt-1.5 text-body-sm', error ? 'text-negative-text' : 'text-fg-tertiary')}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

/** Two columns on a wide screen, one on a phone — the layout the whole product is designed at. */
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
      {children}
    </div>
  );
}

export function FieldSet({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-6 rounded-lg border border-hairline bg-surface p-6">
      <legend className="hs-eyebrow px-2">{legend}</legend>
      {/* §5 vertical rhythm: 16px between groups inside a card. Owned here rather than by each
          child, so a fieldset with one grid and a fieldset with three space identically. */}
      <div className="mt-4 grid gap-4">{children}</div>
    </fieldset>
  );
}

/**
 * Submit button that disables itself while the action is in flight.
 *
 * `useFormStatus` reads the state of the enclosing form, which is why this is its own component —
 * a hook cannot see a form it is rendered alongside. Without it, an impatient double-tap on a slow
 * connection sends the request twice; for `POST /payments` the idempotency key makes that harmless,
 * but `POST /students` has no such protection and would create a duplicate student.
 *
 * The button keeps its width while loading (§7.5), so the form does not twitch at the moment the
 * operator is watching for a result.
 */
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" loading={pending}>
      {children}
    </Button>
  );
}

/**
 * Failure message from a Server Action.
 *
 * §10: the error states what happened and what to do, and §14 forbids apologising or being vague.
 * `role="alert"` (via the Alert primitive) announces it without the user having to go hunting —
 * the form does not move or scroll on failure, so there is otherwise nothing to notice.
 */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert tone="negative" className="mb-6">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
