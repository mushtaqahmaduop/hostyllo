import { CalendarDays, ClipboardCheck, Users, Zap, type LucideIcon } from 'lucide-react';

import type { Reminder, ReminderIcon } from '@/lib/dashboard/contract';
import { formatAmount } from '@/lib/format';
import { Card, CardLink, CardTitle } from './card';

const ICONS: Record<ReminderIcon, LucideIcon> = {
  calendar: CalendarDays,
  clipboard: ClipboardCheck,
  meeting: Users,
  bolt: Zap,
};

/**
 * What is coming up — dated obligations, not tasks.
 *
 * Each row carries an amount or a tag, never both: an amount is money the hostel
 * owes or is owed, a tag is a place. Putting both on one row makes the eye
 * compare a room number against a rupee figure.
 *
 * Icons are the same neutral as everywhere else, tags are grey, and amounts are
 * plain text. The one exception the design rules allow is a genuinely actionable
 * state, and `tone` is kept on the contract for that — but a rent reminder due
 * tomorrow is a reminder, not an alarm, so today nothing here is coloured.
 */
export function UpcomingReminders({ reminders }: { reminders: Reminder[] }) {
  return (
    <Card>
      <CardTitle action={<CardLink href="/dashboard">View all</CardLink>}>
        Upcoming Reminders
      </CardTitle>

      <ul className="mt-2 flex flex-1 list-none flex-col justify-around p-0">
        {reminders.map((reminder) => {
          const Icon = ICONS[reminder.icon];
          return (
            <li
              key={reminder.id}
              className="flex items-center gap-[11px] border-b border-hairline py-[7px] last:border-b-0"
            >
              <span className="grid size-[30px] shrink-0 place-items-center rounded-md bg-surface-hover text-fg-secondary">
                <Icon className="size-[15px]" aria-hidden />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium leading-[1.35]">
                  {reminder.title}
                </span>
                <span className="hs-num block truncate text-body-sm leading-[1.45] text-fg-tertiary">
                  {reminder.when}
                </span>
              </span>

              <span className="shrink-0 text-end">
                {reminder.amount !== null && (
                  <span className="hs-num whitespace-nowrap text-body font-semibold">
                    PKR {formatAmount(reminder.amount)}
                  </span>
                )}
                {reminder.tag && (
                  <span className="inline-block whitespace-nowrap rounded-pill bg-surface-hover px-[8px] py-[2px] text-[10.5px] font-medium text-fg-secondary">
                    {reminder.tag}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
