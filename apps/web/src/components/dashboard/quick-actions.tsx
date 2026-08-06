import Link from 'next/link';
import {
  CreditCard,
  FileText,
  MessageCircle,
  MessageSquareWarning,
  Receipt,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardTitle } from './card';

type Action = {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * The one accented tile on the screen.
   *
   * Accent-tinted rather than accent-*filled*: the dashboard is a reading
   * screen, and a solid violet block on a card of six shortcuts outshouts the
   * eleven figures that are the actual point of the page. The filled violet is
   * reserved for the pages that have a real primary action in their header —
   * Students' "Add Student", Payments' "Add Payment".
   */
  primary?: boolean;
  ready: boolean;
};

/**
 * Six shortcuts, one of them primary.
 *
 * "Add Student" is the filled violet tile and nothing else is, which is the one
 * rule that survived from the v1 spec unchanged: one primary action per screen.
 * Recording a payment is the more frequent job, but it is reachable from the
 * Pending Payments card two panels over, where the student is already named.
 *
 * Unbuilt destinations render as inert tiles rather than links, for the same
 * reason the sidebar does it — the grid keeps its designed shape and nobody
 * lands on a 404.
 */
const ACTIONS: Action[] = [
  { label: 'Add Student', href: '/students/new', icon: UserPlus, primary: true, ready: true },
  { label: 'Add Payment', href: '/payments/new', icon: CreditCard, ready: true },
  { label: 'Add Expense', href: '/expenses/new', icon: Receipt, ready: false },
  { label: 'Add Complaint', href: '/complaints/new', icon: MessageSquareWarning, ready: false },
  { label: 'Maintenance', href: '/maintenance', icon: Wrench, ready: false },
  { label: 'Generate Report', href: '/reports', icon: FileText, ready: false },
];

export function QuickActions() {
  return (
    <Card>
      <CardTitle>Quick Actions</CardTitle>

      <div className="mt-[13px] grid flex-1 auto-rows-fr grid-cols-3 gap-[10px]">
        {ACTIONS.map((action) => {
          const tile = (
            <>
              <action.icon
                className="size-[17px]"
                style={{ color: action.primary ? 'var(--hs-brand-text)' : undefined }}
                aria-hidden
              />
              <span className="max-w-full truncate text-center text-caption font-medium leading-[1.2]">
                {action.label}
              </span>
            </>
          );

          const shape =
            'flex flex-col items-center justify-center gap-[7px] rounded-lg border px-[5px] py-[11px]';

          if (!action.ready) {
            return (
              <span
                key={action.label}
                title={`${action.label} — not built yet`}
                className={cn(shape, 'cursor-default border-hairline bg-surface text-fg-disabled')}
              >
                {tile}
              </span>
            );
          }

          return (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                shape,
                'transition-colors duration-fast ease-standard',
                action.primary
                  ? 'border-brand-border bg-brand-tint text-brand-text hover:text-brand-text'
                  : 'border-hairline bg-surface text-fg-secondary hover:bg-surface-hover hover:text-fg',
              )}
            >
              {tile}
            </Link>
          );
        })}
      </div>

      {/*
       * Inert: there is no WhatsApp integration behind it. Drawn because the
       * redesign puts it here and it is how a Pakistani hostel actually chases
       * rent, so its absence is a gap worth seeing rather than hiding.
       */}
      <button
        type="button"
        disabled
        title="WhatsApp reminders — not built yet"
        className="mt-[10px] flex h-10 w-full shrink-0 cursor-not-allowed items-center justify-center gap-[9px] whitespace-nowrap rounded-lg border border-hairline-strong bg-surface text-body font-medium text-fg-disabled"
      >
        <MessageCircle className="size-[17px]" aria-hidden />
        WhatsApp Reminders
      </button>
    </Card>
  );
}
