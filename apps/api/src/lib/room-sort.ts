/**
 * Ordering rooms the way a hostel manager reads them.
 *
 * `rooms.number` is TEXT (migration 002) because real hostels number rooms
 * `101`, `B-101`, `G-4` and `Annexe 2`. Ordering that column directly is
 * therefore a *lexical* sort, which puts `#14` ahead of `#2` and `#101` ahead
 * of `#9` — and the redesigned screens both print "Sorted by Room ascending"
 * over the result, which a manager reads as numeric.
 *
 * `docs/design/handoff/DESIGN_RULES.md`: "Tables sort by room number ascending,
 * numerically (#2 before #14)." `Payments.dc.html` implements exactly that, in
 * two parts — `a.block.localeCompare(b.block) || a.roomNum - b.roomNum` — and
 * this is that comparator in SQL.
 *
 * Two keys, in this order:
 *
 *   1. the block: everything before the first digit, so `A-201` sorts before
 *      `B-101` and rooms stay grouped by wing rather than interleaved by number.
 *      A hostel numbering rooms plainly (`101`, `102`) has `''` for every row,
 *      so the key is inert and the sort falls straight through to the number.
 *   2. the number: every digit in the label, read as an integer.
 *
 * `[0-9]` rather than `\d` on purpose: this fragment is interpolated into a
 * template literal, where a lone backslash is one careless edit away from being
 * eaten by the JS parser before Postgres ever sees it.
 *
 * A room label carrying no digits at all (`Annexe`) yields NULL from key 2 and
 * lands at the end under NULLS LAST, beside the students who have no room —
 * which is where an unnumbered room belongs on a ledger sorted by number.
 */

/** The block prefix: `B-101` → `B-`, `101` → `''`. */
export function roomBlockSort(alias = 'r'): string {
  return `regexp_replace(${alias}.number, '[0-9].*$', '')`;
}

/** The numeric part: `B-101` → 101, `Annexe` → NULL. */
export function roomNumberSort(alias = 'r'): string {
  return `NULLIF(regexp_replace(${alias}.number, '[^0-9]', '', 'g'), '')::bigint`;
}

/**
 * Both keys as one ORDER BY fragment, without a direction.
 *
 * The caller appends `ASC`/`DESC` and `NULLS LAST` to each — which is why this
 * returns the pair rather than a finished clause: a descending room sort has to
 * reverse both keys, and a fragment that baked in `ASC` would silently sort the
 * block ascending under a descending header.
 */
export function roomSortKeys(alias = 'r'): [string, string] {
  return [roomBlockSort(alias), roomNumberSort(alias)];
}
