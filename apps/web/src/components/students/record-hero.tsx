import { Money } from '@/components/patterns/money';
import { formatAmount } from '@/lib/format';
import type { HeroPill, StudentDetail } from '@/lib/students/detail-contract';
import { cn } from '@/lib/utils';

/**
 * The record's hero and its four stat tiles.
 *
 * The design's hero carries a violet gradient wash behind the avatar. It is not
 * used: `docs/design/README.md` adopts the Claude system's flat-fill rule —
 * "no gradients, glows, washes or glassmorphism" — and elevation here is the
 * tonal step from `--surface` to `--surface-sunken` plus a hairline, which is
 * the one thing that file says to copy if you copy nothing else.
 *
 * The tiles are `PKR 0`, not an em dash, when a student has genuinely never paid:
 * zero collected is a fact the API measured, not a value it failed to supply.
 * The dash is reserved for absent data, which is why it appears in the panels
 * below and not here.
 */

const PILL_TONE: Record<HeroPill['tone'], string> = {
  neutral: 'border-hairline bg-surface-hover text-fg-secondary',
  attention: 'border-attention-border bg-attention-tint text-attention',
  negative: 'border-negative-border bg-negative-tint text-negative',
};

export function RecordHero({ student }: { student: StudentDetail }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-hairline bg-surface-sunken p-5">
        <div
          aria-hidden
          className="flex size-14 flex-none items-center justify-center rounded-xl border border-hairline bg-surface text-h3 font-medium text-fg-secondary"
        >
          {student.initials}
        </div>

        {/*
          The design prints the name inside this panel. It lives in the PageHeader
          instead, because that is where this app's `<h1>` is and a screen with two
          is a screen with a broken document outline. Same information, one level up;
          the panel keeps the avatar, the pills and the rent it is really for.
        */}
        <div className="min-w-[200px] flex-1">
          <ul className="flex flex-wrap gap-2">
            {student.pills.map((pill) => (
              <li
                key={pill.label}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-caption font-medium',
                  PILL_TONE[pill.tone],
                  pill.mono && 'font-mono',
                )}
              >
                {pill.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-none text-end">
          <p className="hs-eyebrow">Monthly rent</p>
          <p className="mt-1.5">
            <Money value={student.rentTotal} tier="hero" />
          </p>
          {/*
            The breakdown only appears when there is one. `messFee === null` is
            "mess not included" and gets that sentence; 0 is "included, zero-rated"
            and gets the breakdown showing a zero, because those are different
            facts about the same student (migration 014).
          */}
          <p className="mt-1 text-body-sm text-fg-tertiary">
            {student.messFee === null
              ? 'Mess not included'
              : `${formatAmount(student.rentOnly)} rent + ${formatAmount(student.messFee)} mess`}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        <Tile label="Total paid">
          <Money value={student.totalPaid} tier="ledger" className="text-h3" />
        </Tile>
        <Tile label="Outstanding" attention={student.outstanding > 0}>
          <Money value={student.outstanding} tier="ledger" className="text-h3" />
        </Tile>
        <Tile label="Join date">
          <span className="text-h3 tabular-nums">{student.joinDate}</span>
        </Tile>
        <Tile label="Payments made">
          <span className="text-h3 font-mono tabular-nums">{student.paymentsMade}</span>
        </Tile>
      </dl>
    </>
  );
}

/**
 * `attention` is the only colour on these tiles, and only on Outstanding, and
 * only when it is above zero — an amount somebody has to go and collect. Money
 * is otherwise plain text per `DESIGN_RULES.md`: "never green, never red. The
 * number is the headline."
 */
function Tile({
  label,
  attention,
  children,
}: {
  label: string;
  attention?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-surface-sunken p-4',
        attention ? 'border-attention-border' : 'border-hairline',
      )}
    >
      <dt className="hs-eyebrow">{label}</dt>
      <dd className="mt-2">{children}</dd>
    </div>
  );
}
