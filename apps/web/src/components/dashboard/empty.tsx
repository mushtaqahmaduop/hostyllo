import Link from 'next/link';

import { Card, CardTitle } from './card';

/**
 * What a dashboard widget shows when the tenant genuinely has none of this data.
 *
 * This component is the whole point of the dashboard rebuild. Every widget that previously had
 * no endpoint behind it drew representative-looking numbers instead — a room-type table reading
 * "2 Seater: 40 rooms" for a hostel with two rooms, a 32-tile seat map, seven fabricated
 * counters under "Today at a Glance". A single banner at the top of the page said "some figures
 * are illustrative" without saying which, which is not a disclosure so much as an alibi.
 *
 * An invented figure and a real one are indistinguishable once rendered. So there is no longer
 * any path from "the API returned nothing" to "draw a number": the presenter marks the section
 * `empty` and the widget renders this instead. A blank card that says why is worth more than a
 * plausible one that lies, because the reader can act on it — usually by following the link.
 */
export function EmptyCard({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <div className="flex flex-1 flex-col items-center justify-center gap-[10px] px-4 py-6 text-center">
        <p className="max-w-[34ch] text-body-sm leading-relaxed text-fg-tertiary">{body}</p>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="rounded-md border border-hairline-strong px-3 py-[5px] text-caption font-semibold text-fg-secondary transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-fg"
          >
            {actionLabel}
          </Link>
        )}
      </div>
    </Card>
  );
}
