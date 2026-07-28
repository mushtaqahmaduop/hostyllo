# HOSTYLLO — UI/UX System Specification
### Phase 2 · Frontend. Authoritative design contract for Claude Code agents.
Version 1.0 · Owner: Zeerak Hostix

---

## 0. How an agent uses this document

**Rules of engagement (hard):**

1. This file is the single source of truth for visual decisions. If a PRD and this file disagree on *appearance*, this file wins. If they disagree on *behaviour*, the PRD wins.
2. Never introduce a raw hex, px font-size, duration, or shadow into a component. Only `var(--hs-*)` tokens from `tokens.css`. A hardcoded colour is a build failure.
3. Never add a new token without adding it to `tokens.css` **and** its dark-mode counterpart in the same commit.
4. Before declaring any screen complete, run §17 Definition of Done.
5. Read §16 (hard NO list) before generating any dashboard. Most of what a model produces by default for "enterprise dashboard" is on that list.

---

## 1. Reference audit — what the 16 dashboards actually teach

The references split into two groups. Being blunt: about 60% of them are the exact look we must not ship. They are what a template marketplace sells, not what an operator trusts with their money.

**Kill list — patterns present in the references, banned here:**

| Pattern seen | Where | Why it's banned |
|---|---|---|
| Full-bleed gradient KPI cards (purple/orange/teal/pink in a row) | HRPro, POSAdmin | Colour spent on decoration. When everything is coloured, nothing signals urgency. |
| Flat saturated colour tiles for zero-values ("0 Occupancy" in green) | HotelPro ERP | Colour lies about state. A zero is not a success. |
| Emoji in headings (👋 🔥 ⭐) | Lynk, Nexora, POSAdmin, HRPro | Reads consumer/hobby. Kills enterprise trust instantly. |
| Donut-chart soup — 3+ donuts per screen | School Attendance, Lead Tracker, Marketing | Donuts are the worst encoding for comparison. Max **one** per screen, only for part-to-whole with ≤5 slices. |
| Every KPI card with its own coloured circular icon | Lead Tracker, School Attendance | 7 icons = 7 competing focal points = no hierarchy. |
| Rainbow categorical charts (8+ hues) | School Attendance, Marketing | Hue must carry meaning. Sequential data gets a ramp, not a rainbow. |
| A card per metric, 6 across | Intact ERP, Lead Tracker | Fragments the eye. One hero + a hairline-separated strip instead. |
| Bevel/glassmorphic floating cards over a gradient blob | Nexora landing | Marketing-page vocabulary leaking into an operator tool. |

**Keep list — genuinely good, steal these:**

| Pattern | Source | Adopt as |
|---|---|---|
| Formula footnote in the chrome ("Win Rate = Won / (Won + Lost)") | Lead Tracker | **Every derived metric shows its definition on hover.** Occupancy, collection rate, dues ageing — operators argue about these numbers; the UI must settle the argument. |
| "Data as of / Last refresh" stamp pinned in the sidebar | Lead Tracker, SalesPro | Mandatory. Multi-tenant SaaS over patchy Pakistani connectivity **must** state data freshness. |
| Goal progress bar with remaining amount stated | SalesPro | Reuse for monthly collection target. |
| Dense sortable ledger table with status column | AthleteX, Marketing | Correct. Tables are the primary surface for hostel ops, not charts. |
| Single restrained accent on a quiet neutral field | SalesPro sidebar | Closest reference to our target. |
| Comparison baseline on every delta ("vs Apr 1 – Apr 30") | Lead Tracker | Mandatory on every trend indicator. A naked ▲12% is meaningless. |

**Verdict:** the reference set's centre of gravity is *consumer-analytics-template*. HOSTYLLO's target is a different genre: a **ledger** that happens to have charts. Design for the person who will be blamed if the money is wrong.

---

## 2. Design thesis

> **"The register, not the report."**

A hostel manager opens HOSTYLLO to answer four questions in under five seconds: *Did money come in? Who owes me? Is any room empty? What breaks today?* Everything else is a drill-down.

**Editorial-finance**, carried by four laws:

**Law 1 — One hero figure per screen.** Dashboard hero is **Total Collected (this month)** set in a large tabular figure with a hairline-separated supporting strip beneath it. No competing card sizes.

**Law 2 — Colour is a siren, not a paint.** The interface is graphite, off-white and indigo. Amber `#F59E0B` appears **only** where a human must act (overdue dues, expiring leases, failed payments, pending approvals). Red only for destructive/failed. Green only for confirmed money received. If a screen has no problems, it is essentially monochrome. This is the single most important rule in the document, and it's the one that separates us from every reference image above.

**Law 3 — Hairlines over shadows.** Structure comes from 1px rules and spacing. Elevation is reserved for things that genuinely float (menus, dialogs, toasts).

**Law 4 — Numbers are typography.** Currency, counts and IDs get their own type treatment, alignment and formatting doctrine (§4.4). Numbers never reflow, never jitter, always align on the decimal.

**Signature element — the Threshold Rule.**
Derived from the Aperture-O logo (indigo ring, doorway, amber threshold). Every primary surface — page header, hero panel, active nav item, table section header — carries a **2px vertical indigo bar on its leading edge**, which turns amber when that section contains an action-required state. It is the product's one memorable device: you learn to scan the left edge of the screen for trouble. Used nowhere else. Never horizontal, never decorative.

---

## 3. Colour system

Full token values live in `tokens.css`. This section is the **law of use**.

### 3.1 Palette identity

| Role | Light | Dark | Notes |
|---|---|---|---|
| Brand / primary | `#4F46E5` | `#7C86F1` fills use `#5B54E8` | Indigo. Interactive + brand only. |
| Action-required | `#8A6A2E` text on `#FEF6E7` | `#F5C563` text on `rgba(245,158,11,.14)` | Amber family. **Never** for "info". |
| Positive (money in) | `#047857` | `#34D399` | Paid, confirmed, checked-in. |
| Negative (destructive/failed) | `#B91C1C` | `#F87171` | Failed payment, delete, cancelled. |
| Canvas | `#F7F7F8` | `#0B0B0F` | |
| Surface | `#FFFFFF` | `#131318` | |
| Hairline | `#E4E4E7` | `#26262E` | |
| Accent (editorial) | `#8A6A2E` | `#C9A96E` | Aged brass. Section eyebrows, ledger rules, empty-state marks. Not interactive. |

### 3.2 Usage laws

- **Indigo = "you can act on this."** Buttons, links, focus rings, active nav, selected rows. Never a background for informational cards.
- **Amber = "a human must act."** Badge, left threshold bar, row tint at 6% alpha, sidebar count. If a screen shows more than ~6 amber elements at once, that's a product problem — surface a grouped "12 items need attention" banner instead of 12 amber badges.
- **Green is never a background for a zero.** Zero occupancy renders in `--hs-text-tertiary`, not green.
- **Grey has three levels of speech**: `text-primary` (the value), `text-secondary` (the label), `text-tertiary` (the metadata). A screen with only two greys reads flat; four reads muddy.
- **Never colour an entire card.** Tint at most the leading bar, the badge, and a 6%-alpha row background.

### 3.3 Dark mode doctrine

Dark mode is a first-class theme, not an inverted stylesheet.

1. **No pure black, no pure white.** Canvas `#0B0B0F`, brightest text `#F4F4F6`. Pure white text on near-black causes halation on the cheap TN panels common in Pakistani hostel offices.
2. **Elevation inverts.** In light mode, higher = more shadow. In dark mode, higher = **lighter surface** (`--hs-surface` → `--hs-surface-raised`) with shadow near-zero.
3. **Saturated brand colours lift.** Indigo 500 fails contrast on dark; dark mode promotes text/icon indigo to `#7C86F1` and keeps fills at `#5B54E8`.
4. **Status tints become alpha, not solids.** Light mode uses solid pale tints; dark mode uses `rgba(colour, .12–.16)` over the surface so it never looks like a sticker.
5. **Charts re-grid.** Gridlines drop to `--hs-hairline`, series get the dark-mode ramp, and any white chart backgrounds are eliminated (a common failure — check exported SVG/canvas fills).
6. **Images and receipts get a `--hs-surface-inverse` mat** so scanned CNICs/receipts don't glow.

**Theme switching:** `class="dark"` on `<html>`, three states (`light` / `dark` / `system`), persisted per user server-side and mirrored to a cookie so SSR renders the right theme. Blocking inline script in `<head>` sets the class before paint. **Zero flash is a Definition-of-Done item.** Add `<meta name="color-scheme" content="light dark">` and set `color-scheme` in CSS so native scrollbars/form controls follow.

---

## 4. Typography

### 4.1 Families (all self-hosted — CSP forbids external font CDNs)

| Role | Family | Why |
|---|---|---|
| Display — page titles, hero figure, empty-state headlines | **Newsreader** (variable, OFL) | Editorial serif with optical sizing. Used with restraint: never below 20px, never for UI chrome. Gives the "financial report" register that a pure-sans dashboard can't. |
| UI / body — everything else | **Geist Sans** (variable, OFL) | Neutral, excellent at 12–14px, wide weight range, real tabular figures. Deliberately not Inter — Inter is the default tell on every template above. |
| Data / ledger — table numerics, IDs, receipt numbers, CNIC, timestamps | **JetBrains Mono** (variable, OFL) | Already in the brand system. Fixed advance width = perfect column alignment. |
| Urdu (locale `ur-PK`) | **Noto Naskh Arabic** | Naskh, not Nastaliq: Nastaliq's slanted baseline breaks table row rhythm. Nastaliq permitted only in printed receipt templates. |

Subset to `latin` + `latin-ext` (+ `arabic` for the Urdu bundle), `font-display: swap`, preload only the two weights used above the fold (Geist 400/500). Total font budget: **≤ 180 KB** on first paint.

### 4.2 Type scale (1.200 minor-third, 14px UI base)

| Token | Size / line-height | Family · weight · tracking | Use |
|---|---|---|---|
| `--hs-type-hero` | 48 / 52 | Geist 500 · −0.02em · tnum | The one hero figure |
| `--hs-type-display` | 30 / 36 | Newsreader 400 · −0.01em | Page title |
| `--hs-type-h1` | 24 / 32 | Geist 600 · −0.01em | Section title |
| `--hs-type-h2` | 20 / 28 | Geist 600 | Card title |
| `--hs-type-h3` | 16 / 24 | Geist 600 | Sub-section |
| `--hs-type-body` | 14 / 20 | Geist 400 | Default UI text |
| `--hs-type-body-sm` | 13 / 18 | Geist 400 | Dense tables, secondary |
| `--hs-type-caption` | 12 / 16 | Geist 400 | Metadata, timestamps |
| `--hs-type-eyebrow` | 11 / 16 | Geist 600 · +0.08em · UPPERCASE | Section eyebrows only |
| `--hs-type-mono` | 13 / 20 | JetBrains Mono 400 · tnum | Ledger cells, IDs |
| `--hs-type-mono-sm` | 12 / 16 | JetBrains Mono 400 | Audit log, codes |

**Rules:** max **three** sizes per card, **two** weights per screen (400 + 600; 500 only for the hero). Never set body below 13px, never centre a paragraph, never justify. Measure caps at 72ch.

### 4.3 The numeric doctrine (this is the premium tell)

Three tiers, applied without exception:

- **Tier 1 — Hero figure.** Geist Sans 500, `font-variant-numeric: tabular-nums`, tracking −0.02em. Sans, not mono: mono at 48px reads like a terminal, sans with tabular figures reads like money.
- **Tier 2 — Ledger.** JetBrains Mono, tabular, **right-aligned**, decimal-aligned. All currency, quantities, IDs, receipt numbers, CNIC, phone numbers, dates in table cells.
- **Tier 3 — Inline.** Geist Sans with `tnum` enabled globally on `.hs-num`. Any number inside a sentence.

**Non-negotiables**
- `font-variant-numeric: tabular-nums` is **globally on** for every number-bearing element. Proportional digits in a live-updating figure cause visible jitter — the fastest way to look cheap.
- **Currency:** `PKR 1,25,430` — Pakistani lakh/crore grouping via `Intl.NumberFormat('en-PK')`. Use the existing `fmtPKR()` helper. Never `fmtPKR()` and a `pkr` span together (existing CLAUDE.md rule).
- **Symbol treatment:** `PKR` set in `--hs-type-caption`, `--hs-text-tertiary`, as a superscript-aligned prefix; the numerals carry the weight. Never render `₨` (inconsistent glyph coverage) and never `Rs.`
- **Zero ≠ empty.** A real zero renders `PKR 0`; unknown/not-yet-loaded renders `—` in `--hs-text-tertiary`. Never `0` as a placeholder.
- **Deltas** always carry a baseline: `▲ 12.4% vs last month`. Arrow + colour + baseline, or nothing.
- **Large figures abbreviate only above 10 lakh**, and only in chart axes and sparkline labels — never in a ledger cell, never in an invoice.
- **Percentages:** one decimal (`82.7%`). **Currency:** zero decimals in KPIs and lists, two decimals in invoices, receipts and reconciliation views.
- **Dates:** `05 Jul 2026` in UI, `2026-07-05` in exports/filters, relative (`2 hours ago`) only under 24h and always with an absolute `title` attribute.

---

## 5. Space, grid, layout

**Base unit 4px.** Steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Nothing off-scale.

**App shell**
```
┌──────────┬──────────────────────────────────────────────────┐
│ SIDEBAR  │ TOPBAR  56px — tenant switcher · search · theme   │
│ 264px    ├──────────────────────────────────────────────────┤
│ (72px    │ PAGE HEADER  — eyebrow / title / actions          │
│ collapsed│  ▌ 2px indigo threshold bar on leading edge       │
│ )        ├──────────────────────────────────────────────────┤
│          │ CONTENT  12-col · 24px gutter · max 1440px        │
│          │                                                  │
│ ────────  │  ┌─ HERO PANEL (cols 1–8) ─┐ ┌ NEEDS ACTION ─┐  │
│ Data as  │  │  PKR 12,84,500           │ │ 7 overdue     │  │
│ of ...   │  │  ─────────────────────── │ │ 3 expiring    │  │
└──────────┴──────────────────────────────────────────────────┘
```

- Sidebar: 264 / 72 collapsed, collapse state persisted. Sidebar background is `--hs-surface-sunken`, **not** a dark slab in light mode (the SalesPro/Lead-Tracker dark-rail look fights our dark theme).
- Page gutters: 32 (≥1280), 24 (768–1279), 16 (<768).
- Max content width 1440. Tables may extend full width with sticky first column.
- **Primary design target: 1366×768.** Design and screenshot-check at this size first, not 1920. A large share of Pakistani hostel offices run 1366×768 laptops; a dashboard that needs scrolling to see the hero has failed.
- Vertical rhythm: 32 between major sections, 24 between cards, 16 inside cards, 8 label→value.
- Two density modes: **Comfortable** (row 52px) and **Compact** (row 40px), user-selectable, persisted. Ledger-heavy pages default to Compact.

---

## 6. Radius, borders, elevation

| Token | Value | Use |
|---|---|---|
| `--hs-radius-sm` | 4px | Badges, tags, checkboxes |
| `--hs-radius-md` | 6px | Buttons, inputs, selects |
| `--hs-radius-lg` | 8px | Cards, panels, table containers |
| `--hs-radius-xl` | 12px | Dialogs, sheets, popovers |
| `--hs-radius-full` | 999px | Avatars, status dots only |

Restrained radii read enterprise; 16–24px radii read consumer. Never mix more than two radii in one composition.

**Elevation (four levels, that's all):**
- `e0` — flat on canvas, hairline border. Default for cards. **90% of the UI lives here.**
- `e1` — hover on interactive cards, dropdowns. Light: `0 1px 2px rgba(11,11,15,.06), 0 1px 3px rgba(11,11,15,.04)`.
- `e2` — popovers, menus, date pickers.
- `e3` — dialogs, command palette, drawers.

Dark mode: shadows are near-invisible; elevation is conveyed by surface lightness + a `--hs-hairline-strong` border. Never use a coloured glow as elevation.

---

## 7. Component specifications

Build on **shadcn/ui + Radix** primitives, restyled entirely from tokens. Do not ship shadcn defaults.

### 7.1 KPI hero panel
One per dashboard. Structure: eyebrow (`COLLECTED · JULY 2026`) → hero figure → delta with baseline → hairline → 3–4 supporting stats in a single row separated by 1px vertical rules. Not four separate cards. Hover on the figure reveals its formula tooltip.

### 7.2 Stat strip (supporting metrics)
Label above value, `text-secondary` label / `text-primary` value, separated by vertical hairlines, no icons, no card borders, no colour unless action-required. Max 4 per strip.

### 7.3 Needs-Attention panel
The counterweight to the hero, top-right. Amber threshold bar. Grouped list: `7 dues overdue · PKR 84,000` → each row links to a filtered table. This panel is the **only** place amber appears in bulk. If empty: brass rule + "Nothing needs attention today." Do not hide it — a visible empty state builds trust.

### 7.4 Data table (the workhorse)
- Sticky header, sticky first column, hairline row dividers, **no zebra striping** (zebra + status tints = mud).
- Row height per density mode. Hover: `--hs-surface-hover`, 120ms.
- Numeric columns right-aligned mono; text left; status centre-less (left-aligned badge).
- Sortable headers with a persistent sort indicator; multi-sort via shift-click on ledger views.
- Selection: checkbox column, selected row gets a **2px indigo leading bar** + 4% indigo tint.
- Action-required rows get a 2px amber leading bar + 6% amber tint. Never a full red row.
- Row actions in a right-aligned kebab menu, revealed on hover/focus, always keyboard-reachable.
- Pagination: server-side, page size 25/50/100, plus a total count. Infinite scroll is banned in ledger views (breaks reconciliation).
- Empty, loading (skeleton rows matching real row height), error, and filtered-to-zero states are four *different* states with four different copies.

### 7.5 Buttons
| Variant | Light | Use |
|---|---|---|
| Primary | Indigo fill, white text | One per view. |
| Secondary | Surface + hairline border | Common actions. |
| Ghost | Transparent, text-secondary | Toolbar, table actions. |
| Destructive | Red text on surface; solid red **only** in the confirm dialog | |

Heights: 36 (default), 32 (compact/toolbar), 44 (mobile). Padding 12/16. Never a gradient. Never a shadow on a primary button. Loading state swaps the label for a spinner while preserving the button's width (no layout shift). Icon-only buttons require `aria-label` and a tooltip.

### 7.6 Badges / status pills
Small radius, 11px 600 uppercase-tracking text, 6px 8px padding, tint background + solid text colour. Fixed vocabulary — do not invent new statuses:
`Paid` (green) · `Due` (neutral) · `Overdue` (amber) · `Failed` (red) · `Refunded` (neutral) · `Occupied` (indigo) · `Vacant` (neutral) · `Reserved` (brass) · `Maintenance` (amber) · `Active` / `Inactive` / `Archived` (neutral).

### 7.7 Forms
Label above field (never floating — floating labels fail with Urdu and with long field names), 13px `text-secondary`. Input height 36, radius 6, hairline border, focus = 2px indigo ring at 2px offset. Helper text under field; error replaces helper, red text + red border, and the error explains **the fix** ("Enter a 13-digit CNIC without dashes"), never "Invalid input". Required marked with the word "Required", not an asterisk. Inline validation on blur, never on keystroke. Currency and CNIC inputs use the mono face and auto-format on blur.

### 7.8 Navigation
Sidebar groups with eyebrow headers. Active item: indigo threshold bar + `--hs-surface-active` + 600 weight (never a full indigo fill). Counts right-aligned; amber count only when overdue. Collapsed rail shows icon + tooltip. Tenant switcher pinned top; "Data as of · Last refresh" pinned bottom (adopted from the Lead Tracker reference).

### 7.9 Dialogs / sheets
Dialogs for decisions (max 480px), sheets from the right for creation/editing (480/640px), full-screen only on mobile. Overlay `rgba(11,11,15,.48)` + 2px backdrop blur (light) / `.64` no blur (dark). Destructive confirms require typing the entity name for irreversible actions only. Never nest a dialog inside a dialog.

### 7.10 Toasts
Bottom-right, 4s auto-dismiss, one at a time (queue the rest). Success = quiet neutral toast with a green dot, never a green banner. Failures do **not** auto-dismiss and carry a retry action. Toast copy matches the button that triggered it ("Record payment" → "Payment recorded").

### 7.11 Command palette (⌘K / Ctrl+K)
Non-negotiable for an enterprise feel and genuinely faster for operators. Search students, rooms, invoices, and jump to any page. Recent items on open.

---

## 8. Data visualisation

**Charts are subordinate to tables.** A chart earns its place only by showing a trend or a distribution a table can't.

- **Palette:** sequential indigo ramp for one series. Categorical, max 5, in this fixed order: `#4F46E5`, `#7C86F1`, `#A2AAF8`, `#C9A96E`, `#71717E`. Amber/red/green enter a chart **only** to mark an exceptional data point.
- **Encodings:** trend over time → line/area. Comparison across categories → horizontal bar (labels stay readable). Part-to-whole → **one** donut per screen, ≤5 slices, centre holds the total. Everything else → table.
- **Chrome:** no chart borders, no 3D, no drop shadows, no gradients under lines except a single 8%-alpha fill on the hero trend. Y-axis gridlines only, in `--hs-hairline`, no vertical grid. Axis labels 11px `text-tertiary`.
- **Always:** a stated baseline/comparison period, units in the axis title, a `—` empty state, and accessible tooltips (keyboard-focusable data points).
- **Never** animate a chart on every re-render — only on first mount, 320ms, and never at all under `prefers-reduced-motion`.

---

## 9. Motion specification

Motion communicates causality and continuity. Nothing decorative.

**Duration tokens:** `instant 90ms` · `fast 140ms` · `base 200ms` · `slow 280ms` · `deliberate 400ms` (dialogs, sheets only).

**Easing tokens:**
- `--hs-ease-standard: cubic-bezier(.2, 0, 0, 1)` — default for anything moving between two on-screen states.
- `--hs-ease-out: cubic-bezier(0, 0, .2, 1)` — entrances.
- `--hs-ease-in: cubic-bezier(.4, 0, 1, 1)` — exits (always faster than entrances: exit = entrance × 0.7).
- `--hs-ease-emphasis: cubic-bezier(.2, 0, 0, 1.2)` — the single overshoot easing, reserved for the threshold bar and the hero figure.

**The choreography (one orchestrated moment, not scattered effects):**
Dashboard first paint runs a **single 480ms sequence**, once per session (never on client-side navigation):
1. `0ms` — page header threshold bar draws down from top, 280ms, `ease-emphasis`.
2. `60ms` — hero panel fades + rises 8px, 240ms.
3. `120ms` — hero figure counts up from 0 to value over 560ms with an ease-out curve, **tabular figures so nothing shifts**. Counts only once per session; a refresh animates only the changed digits' colour, not the count.
4. `200ms` — supporting stat strip, staggered 40ms per item.
5. `280ms` — Needs-Attention panel; if non-empty, its amber bar draws last, drawing the eye there deliberately.
6. `360ms` — table rows fade in as a block (never staggered per row — 50 staggered rows looks broken and costs frames).

**Micro-interactions:**
| Interaction | Spec |
|---|---|
| Button hover | background 90ms, no transform, no scale |
| Button press | `scale(.98)` 90ms — the only scale transform in the system |
| Table row hover | background 120ms |
| Nav item activate | threshold bar height 0→100%, 200ms `ease-emphasis` |
| Dropdown / popover | fade + 4px rise, 140ms in / 90ms out, transform-origin at trigger |
| Dialog | overlay fade 200ms; panel fade + `scale(.98→1)` + 8px rise, 240ms |
| Sheet | slide from edge, 280ms `ease-standard` |
| Toast | slide up 12px + fade, 200ms |
| Skeleton | **opacity pulse 1.4s**, not a moving shimmer gradient (shimmer costs paint on low-end GPUs) |
| Theme switch | 180ms crossfade on background/border colours only. Never animate text colour — it looks like a bug. |
| Accordion / collapse | grid-template-rows 0fr→1fr, 200ms |

**Hard limits**
- Animate **only** `transform` and `opacity`. Exceptions: `background-color`, `border-color`, and the accordion grid trick.
- Nothing animates longer than 400ms except the hero count-up.
- No parallax, no scroll-jacking, no ambient/looping background motion, no hover-lift on cards (`translateY(-4px)` + shadow is the single most template-looking effect in existence).
- `@media (prefers-reduced-motion: reduce)` sets every duration to `0.01ms` and disables the count-up (final value renders immediately). Ship this in `tokens.css`, not per-component.
- Frame budget: any interaction must stay under 16ms on a 4-year-old mid-range laptop. If in doubt, cut the animation.

---

## 10. States (specify all six, every time)

For every data surface, the agent must implement: **loading · empty (never used) · empty (filtered to zero) · error · offline/stale · populated.**

- **Loading:** skeletons matching final geometry exactly (same row height, same column widths). No spinners for content areas; spinners only inside buttons. Never a full-page loader after first paint.
- **Empty (first-run):** brass rule mark, Newsreader headline, one sentence, one primary action. Copy is an invitation: "No students yet — add your first student to start tracking dues."
- **Empty (filtered):** different copy and a "Clear filters" action. Never the first-run illustration.
- **Error:** state what failed and the next step, plus a Retry. "Couldn't load payments. Check your connection and try again." Never a raw error code in the user's face — put it behind a "Details" disclosure for support.
- **Offline / stale:** a slim amber strip under the topbar: "Showing data from 10:42 AM · reconnecting". Given Pakistani connectivity this is a primary state, not an edge case.
- **Optimistic writes:** row appears immediately at 60% opacity with a pending dot; on failure it reverts with an inline error and a retry, never a silent rollback.

---

## 11. Responsive, density, performance budgets

Breakpoints: `<640` mobile · `640–1023` tablet · `1024–1365` small laptop **(primary QA target)** · `1366–1919` desktop · `≥1920` wide.

- Mobile: sidebar → bottom sheet nav; tables → stacked cards with the primary numeric emphasised; 44px minimum touch targets; hero figure drops to 36px.
- Never horizontally scroll the whole page. Tables scroll inside their own container with a sticky first column and a visible edge shadow.
- **Budgets:** LCP < 2.5s on 3G-equivalent, JS ≤ 200KB gzipped on the dashboard route, fonts ≤ 180KB, no layout shift after first paint (CLS < 0.05). Charts are lazy-loaded and code-split; the table renders before the chart, always.
- Virtualise any list over 100 rows.

---

## 12. Accessibility floor (non-negotiable)

- WCAG 2.2 AA. Text ≥ 4.5:1, large text and UI borders ≥ 3:1 — in **both** themes. Verify programmatically, not by eye.
- **Colour is never the only channel.** Every status badge carries a word. Every chart series carries a direct label or a pattern.
- Visible focus everywhere: 2px indigo ring, 2px offset, never `outline: none` without a replacement.
- Full keyboard operation: tables (arrow keys, Enter to open, Space to select), dialogs (focus trap, Esc, focus restored to trigger), command palette.
- Semantic tables (`<table>`, `<th scope>`), live regions for toasts and async results, labels bound to inputs.
- Test at 200% browser zoom and at `text-size-adjust`; nothing may clip.

---

## 13. Localisation

- English (`en-PK`) default; Urdu (`ur-PK`) planned. Build **RTL-ready from day one**: use logical properties (`margin-inline-start`, `padding-block`) everywhere — no `left`/`right` in CSS — and `dir` on `<html>`.
- The threshold bar sits on the **inline-start** edge, so it mirrors correctly.
- Numerals stay Western Arabic (`1,25,430`) in both locales — Pakistani business practice.
- Allow 35% text expansion; never fix a button's width to its English label.
- Dates and currency go through `Intl`, never hand-formatted.

---

## 14. Copy voice

Plain, direct, operator-first. Sentence case everywhere (no Title Case buttons, ever).

- Name things the way a hostel manager does: "Dues", "Rooms", "Check-in", "Notice" — not "Records", "Entities", "Modules".
- Verbs on buttons say exactly what happens: "Record payment", "Issue invoice", "Mark vacant". Never "Submit", "OK", "Proceed".
- The name persists through the flow: button "Issue invoice" → dialog title "Issue invoice" → toast "Invoice issued".
- Errors don't apologise and are never vague. They state what happened and what to do.
- No exclamation marks. No emoji anywhere in the product UI. No "Oops", no "Awesome", no "Welcome back, {name} 👋".
- Every derived metric has a one-line definition available on hover.

---

## 15. Implementation

**Stack:** Next.js 15 App Router · Tailwind · shadcn/ui + Radix · TanStack Table (ledgers) · Recharts or visx (charts) · next-themes.

**Token flow:** `tokens.css` (source of truth) → Tailwind theme mapping → components consume Tailwind classes only. No component ever reads a hex.

```
apps/web/src/styles/
  tokens.css        # colour, type, space, radius, elevation, motion (light + dark)
  base.css          # resets, font-face, tabular-nums default, focus ring
  fonts/            # self-hosted woff2 (Geist, Newsreader, JetBrains Mono, Noto Naskh)
apps/web/src/components/
  primitives/       # restyled shadcn — button, input, dialog, table, badge...
  patterns/         # hero-panel, stat-strip, needs-attention, data-table, page-header
  charts/           # themed wrappers only; never use a chart lib's default palette
```

Tailwind v4 mapping (`@theme` block referencing the vars) is included at the bottom of `tokens.css`; for v3, map the same vars in `theme.extend`.

**No-flash theme boot** (in `<head>`, before any paint):
```html
<script>
  (function () {
    try {
      var t = document.cookie.match(/hs-theme=(light|dark|system)/);
      var v = t ? t[1] : 'system';
      var dark = v === 'dark' || (v === 'system' &&
        matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    } catch (e) {}
  })();
</script>
```

**Agent build order (do not deviate):**
1. `tokens.css` + `base.css` + fonts → verify both themes on a blank page.
2. Primitives (button, input, badge, table, dialog) with every state, in both themes.
3. App shell (sidebar, topbar, page header, threshold bar).
4. Patterns (hero panel, stat strip, needs-attention, data table).
5. One real screen end-to-end — **Dues & Payments** — including all six states from §10.
6. Only then, everything else.

---

## 16. Hard NO list

The agent must not generate any of these, regardless of how conventional they are:

1. Gradient-filled KPI cards, or any gradient except the single 8%-alpha hero chart fill.
2. Coloured circular icon badges on every KPI.
3. More than one donut/pie per screen; any donut with >5 slices.
4. Emoji anywhere in the product UI, including greetings.
5. "Good morning, {name} 👋" hero headers. The hero is the money figure, not a greeting.
6. Hover-lift cards (`translateY` + growing shadow).
7. Glassmorphism, neumorphism, backdrop-blur on anything except the dialog overlay.
8. Zebra-striped tables.
9. Rainbow categorical chart palettes.
10. Colour used to decorate rather than to signal. Especially: green for zero values.
11. Full-page spinners after the first paint.
12. Infinite scroll in any financial ledger.
13. Floating/placeholder-only labels in forms.
14. Border radii above 12px, or more than two radii in one composition.
15. Proportional (non-tabular) figures in any number that updates or aligns.
16. `left`/`right` CSS properties where a logical property exists.
17. Any hardcoded hex, px font-size, or ms duration inside a component file.
18. Stock illustration packs, 3D blobs, isometric people.
19. Announcing quality in the UI ("Beautiful dashboard", "Powerful analytics"). Show, don't say.

---

## 17. Definition of done — per screen

- [ ] Renders correctly in **both** themes; no flash on reload in either.
- [ ] Zero hardcoded colours, sizes, or durations — tokens only.
- [ ] All six states from §10 implemented and screenshot-verified.
- [ ] Every number is tabular, correctly grouped (lakh/crore), and uses `fmtPKR()` where currency.
- [ ] Every delta shows its comparison baseline; every derived metric has a definition on hover.
- [ ] Exactly one hero figure; at most one donut; amber appears only on action-required states.
- [ ] Keyboard-only pass completes every action; focus is always visible; focus returns correctly after dialogs.
- [ ] Contrast verified programmatically in both themes.
- [ ] `prefers-reduced-motion` disables all motion including the count-up.
- [ ] Verified at 1366×768 without vertical scrolling to reach the hero, and at 375px wide.
- [ ] Route JS ≤ 200KB gz; no CLS after first paint.
- [ ] Logical CSS properties only; layout survives `dir="rtl"`.
- [ ] Copy passes §14: sentence case, active verbs, no emoji, errors state the fix.
- [ ] Nothing on the §16 list is present.
