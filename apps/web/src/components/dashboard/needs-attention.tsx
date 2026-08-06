import Link from 'next/link';
import { CalendarX2, Megaphone, MessageSquareWarning, Wrench, type LucideIcon } from 'lucide-react';

import type { AttentionIcon, AttentionItem, Sourced } from '@/lib/dashboard/contract';
import { Card, CardTitle } from './card';
import { EmptyCard } from './empty';

const ICONS: Record<AttentionIcon, LucideIcon> = {
  cancellation: CalendarX2,
  notice: Megaphone,
  maintenance: Wrench,
  complaint: MessageSquareWarning,
};

/**
 * Real obligations waiting on a decision.
 *
 * ── What this replaces ───────────────────────────────────────────────────────────────────────
 * This card was "Upcoming Reminders", and it was the purest case of the problem the dashboard
 * rebuild exists to fix: there is no reminders table, no reminders endpoint and no reminders
 * concept anywhere in the domain. The rows were invented wholesale — a plausible-looking list
 * of dated obligations that corresponded to nothing, on the card an operator would most
 * reasonably treat as their to-do list.
 *
 * Rather than keep an empty shell where a fiction was, the slot now shows things the tenant
 * genuinely has to deal with, both of which are real rows in real tables:
 *
 *   · cancellations awaiting confirmation — these hold a bed occupied until someone decides,
 *     which is exactly the kind of thing that quietly costs money if it sits
 *   · notices that have not expired
 *
 * Nothing here is coloured beyond the tone the presenter assigns, and a cancellation is
 * `attention` because someone must act on it — that is the design rules' bar for colour, and
 * this clears it where a reminder never did.
 */
export function NeedsAttention({ attention }: { attention: Sourced<AttentionItem[]> }) {
  if (attention.from === 'empty') {
    return (
      <EmptyCard
        title="Needs Attention"
        body="Nothing is waiting on you — no pending cancellations and no active notices."
      />
    );
  }

  return (
    <Card>
      <CardTitle>Needs Attention</CardTitle>

      <ul className="mt-[10px] flex flex-1 list-none flex-col gap-[2px] p-0">
        {attention.data.map((item) => {
          const Icon = ICONS[item.icon];
          const row = (
            <span className="flex w-full items-center gap-[10px] py-[6px]">
              <span className="grid size-[26px] shrink-0 place-items-center rounded-md bg-surface-hover text-fg-secondary">
                <Icon className="size-[14px]" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body text-fg">{item.title}</span>
                <span className="truncate text-caption text-fg-tertiary">{item.when}</span>
              </span>
            </span>
          );

          return (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="-mx-1 flex rounded-md px-1 transition-colors duration-fast ease-standard hover:bg-surface-hover"
                >
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
