# Design authority

Three sources govern how Hostyllo looks. They do not all govern the same thing, and
where they disagree the order below decides. Settled with the owner on 2026-08-05;
do not re-litigate without him.

| # | Source | Governs | Does **not** govern |
|---|---|---|---|
| 1 | `handoff/DESIGN_RULES.md` + `handoff/README.md` | density, type scale, radius, spacing, screen composition, IA, per-screen behaviour, data conventions | — |
| 2 | `reference-anthropic-claude-design-system.html` | colour philosophy, elevation method, motion values, accent discipline | type scale, radius, density, fonts |
| 3 | `handoff/designs/*.dc.html` | exact per-element values for the screen it depicts | anything the two documents above state |

`docs/15_UI_SPEC_v1.md` is **retired** as a visual authority. Its §5 (layout), §9 (motion)
and §12 (accessibility) are still the only written record of those decisions and remain in
force; everything it says about colour, type and shape is dead.

## What was taken from the Claude design system, and what was not

The file is a teardown of Anthropic's *marketing* design language. It has no tables, no
forms, no filters, no pagination and no data density. Its own binding rules include "set
body copy in the serif at 20px", "use 24px radius on every card-level surface" and "don't
set body text in sans" — none of which survive contact with a rent ledger at 33px rows.
Its typefaces (Anthropic Sans / Serif / Mono) are Anthropic's brand faces and are not
ours to ship.

**Adopted** — the method, which is what makes it good:

- **Elevation is a tonal ladder, not a shadow.** Flat surface values stepped a few percent
  apart plus a 1px hairline. The source says if you copy one thing, copy this. Box-shadow
  survives in exactly one place: a modal over its overlay.
- **Warm neutrals.** Ivory and oat rather than the cool greys every other product reaches
  for. This is the single most visible difference and the reason we took the file at all.
- **No gradients, glows, washes or glassmorphism.** Flat solid fills only.
- **One chromatic voice, spent on one action per page**, and never on icons, hovers or
  decoration.
- Permanently visible inline link underlines; the 120 / 180 / 280ms motion set.

**Rejected**, with reasons:

- Serif body copy at 20px — a ledger row is 33px.
- 24px card radius — `DESIGN_RULES.md` caps radius at 12 and is authority #1 on shape.
- Anthropic's own typefaces — replaced by Geist and JetBrains Mono, which the handoff
  bundle already specifies.
- Clay `#d97757` as the accent — replaced by violet, see below.

## The one rule we knowingly break

The Claude system says: *"Don't introduce cool greys, blues, or anything outside the warm
earth family."* Our accent is violet `#7c3aed`, which is cool.

The owner chose to keep it. Violet is Hostyllo's brand and predates this decision, and a
warm neutral field with a single cool accent is a proven pairing — the warmth still does
the work, because it covers every surface while the accent covers one button per screen.
The rule is obeyed everywhere else: no cool greys, no blue-tinted surfaces, no second
chromatic voice.

## Theme default

`DESIGN_RULES.md` specifies dark-first. The owner chose **light** as the product default
on 2026-08-05. Both themes are fully built and the tonal ladder has a dark twin; only
which one ships as the default differs from the bundle.

## How these files are used

The `.dc.html` files are design references, not production code — open one in a browser
and it runs. `support.js` is their runtime and is not ported. When a screen is built, the
`.dc.html` supplies exact values and `HOSTIX-APP/renderer/src/modules/<screen>.js` supplies <!-- link-check-ignore -->
the business logic it must reproduce. (That path is in the separate HOSTIX-APP repository,
not this one — which is why the link checker is told to skip it.)
