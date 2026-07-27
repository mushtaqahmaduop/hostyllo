'use client';

import { useFormStatus } from 'react-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Form primitives shared by the write flows.
 *
 * Every control is a real `<input>`/`<select>` inside a real `<form>`. That is a deliberate
 * constraint, not a shortcut: a warden on a slow phone in a hostel corridor gets a working form
 * before the JavaScript bundle arrives, and the Server Action handles the submission either way.
 * Anything that needs client state (the room→bed dependency, the live balance) opts in explicitly.
 *
 * This is also why these are hand-rolled rather than shadcn's `Form`, which is built on
 * react-hook-form and does not exist until JS does. The shadcn *primitives* are used for
 * appearance; the behaviour stays server-first.
 *
 * Sizes are not arbitrary — `text-base` (16px) is the threshold below which iOS Safari zooms the
 * viewport on focus, and `min-h-11` (44px) is the WCAG 2.5.8 target size. Both matter here more
 * than on the read screens, because this is the part of the product used one-handed while standing.
 */

const CONTROL =
  'w-full min-h-11 rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-base text-text ' +
  'placeholder:text-text-muted transition-colors duration-150 hover:border-text-disabled ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const LABEL = 'mb-2 block text-sm font-semibold text-text';
const HINT = 'mt-1 text-[13px] text-text-muted';

export function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  placeholder,
  hint,
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
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  min?: number;
  step?: string;
  autoFocus?: boolean;
  numeric?: boolean;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={name} className={LABEL}>
        {label}
        {!required && <span className="font-normal text-text-muted"> (optional)</span>}
      </label>
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
        aria-describedby={hintId}
        className={cn(CONTROL, numeric && 'tabular')}
      />
      {hint && (
        <p id={hintId} className={HINT}>
          {hint}
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
  onChange?: (value: string) => void;
  value?: string;
  disabled?: boolean;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={name} className={LABEL}>
        {label}
      </label>
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
        aria-describedby={hintId}
        className={cn(CONTROL, 'appearance-none bg-[right_0.75rem_center] bg-no-repeat pr-10')}
        style={{
          // Inline because the arrow has to follow `currentColor` through a theme switch, which a
          // static background-image URL in a stylesheet cannot do.
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")",
        }}
      >
        {children}
      </select>
      {hint && (
        <p id={hintId} className={HINT}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** Two columns on a wide screen, one on a phone — the layout the whole product is designed at. */
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">{children}</div>;
}

export function FieldSet({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-6 rounded-lg border border-border bg-surface p-4 lg:p-5">
      <legend className="px-2 text-[13px] font-semibold uppercase tracking-[0.04em] text-text-muted">
        {legend}
      </legend>
      {children}
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
 */
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-md px-5 text-base font-semibold shadow-sm',
        'transition-colors duration-150',
        pending
          ? 'cursor-progress bg-surface-3 text-text-muted'
          : 'bg-gold text-on-gold hover:bg-gold-hover active:bg-gold-active',
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? 'Saving…' : children}
    </button>
  );
}

/**
 * Failure message from a Server Action.
 *
 * `role="alert"` so a screen reader announces it without the user having to go hunting — the form
 * does not move or scroll on failure, so there is otherwise nothing to notice.
 */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-md bg-red-subtle p-3 text-[15px] text-red"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
