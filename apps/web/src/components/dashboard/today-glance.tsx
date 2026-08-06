import {
  BadgeCheck,
  CreditCard,
  LogIn,
  LogOut,
  MessageSquareWarning,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { GlanceItem, Sourced } from '@/lib/dashboard/contract';
import { Card, CardTitle } from './card';
import { EmptyCard } from './empty';

const ICONS: Record<string, LucideIcon> = {
  checkins: LogIn,
  checkouts: LogOut,
  admissions: UserPlus,
  received: CreditCard,
  complaints: MessageSquareWarning,
  maintenance: Wrench,
  approvals: BadgeCheck,
};

/**
 * Seven counters for today — the shift-handover list.
 *
 * A list, not seven tiles: these are heterogeneous facts read top to bottom, and
 * a grid would imply they are comparable quantities.
 *
 * Nothing here is coloured. The icons are the same neutral as the KPI strip's,
 * and the money figure is plain text like every other money figure in the
 * product — "money is always plain text, never green, never red" is the design
 * rules' flattest statement, and PKR 1,56,500 collected today is not a verdict.
 * The `tone` on each item is carried in the contract for the day a row genuinely
 * needs to shout; today none of them does.
 *
 * ── These were fabricated ────────────────────────────────────────────────────────────────────
 * Every counter here used to be a constant — 2 check-ins, 1 check-out, 3 admissions, 4
 * complaints — on a tenant that had none of them. They now come from `GET /dashboard/today`,
 * and when the whole day is genuinely quiet the widget says so rather than printing seven
 * zeros, which reads as broken rather than calm.
 */
export function TodayGlance({ glance }: { glance: Sourced<GlanceItem[]> }) {
  if (glance.from === 'empty') {
    return (
      <EmptyCard
        title="Today at a Glance"
        body="Nothing has happened today yet — no check-ins, admissions, payments or new requests."
      />
    );
  }

  return (
    <Card>
      <CardTitle>Today at a Glance</CardTitle>

      <ul className="mt-[10px] flex flex-1 list-none flex-col justify-between p-0">
        {glance.data.map((item) => {
          const Icon = ICONS[item.id] ?? BadgeCheck;
          return (
            <li key={item.id} className="flex items-center gap-[10px] py-[5px]">
              <span className="grid size-[26px] shrink-0 place-items-center rounded-md bg-surface-hover text-fg-secondary">
                <Icon className="size-[14px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate text-body text-fg-secondary">{item.label}</span>
              <span className="hs-num shrink-0 whitespace-nowrap text-body font-semibold">
                {item.value}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
