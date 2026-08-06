# Handoff: Hostyllo — cloud hostel management SaaS

## Overview

Hostyllo is a multi-tenant cloud SaaS for hostel management, redesigned from HOSTIX, an
existing offline Electron desktop app. This bundle contains nine hi-fi screens covering the
core operating surface: Dashboard, Students, Rooms, Cancellations, Complaints, Payments,
Expenses, Reports and Settings.

The desktop app supplied the information architecture and data model. Anything that only
makes sense on a local install (license activation, `.hostix` file backup/restore, app
version footer) was deliberately dropped.

## About the design files

The files in `designs/` are **design references written in HTML** — prototypes that show
intended look, density and behaviour. They are not production code to copy.

Each `*.dc.html` file is a self-contained page: open it in a browser and it runs. Markup is
inline-styled; state and derived data live in a `class Component` block at the bottom of the
file. `support.js` is the runtime that renders them — you do not need to port it.

**The task:** recreate these screens in the Hostyllo repo (Next.js + React + TypeScript +
Tailwind) using the repo's existing component patterns. Where the repo has no equivalent
component yet, build one from the token table below rather than hand-rolling values per
screen.

## Fidelity

**High-fidelity.** Colours, type, spacing, density, copy and interaction states are final.
Recreate them precisely. Numbers in tables are realistic sample data, not fixtures to keep —
wire them to the real API.

## Design rules that override everything

Read `DESIGN_RULES.md` in this bundle first. The load-bearing ones:

- **One accent: violet.** `#8b5cf6` dark / `#7c3aed` primary CTA. No second accent.
- **Maximum one primary button per screen.** "Add Student" is filled violet; "Add Payment" is
  outlined.
- **Money is always plain text.** Never green, never red. The number is the headline.
- **Pills default to grey.** Semantic colour only when the state is actionable (Overdue,
  Pending review). Max one semantic pill per card.
- **No decorative gradients on UI chrome.** (Two legacy gradient buttons survive in
  `Students.dc.html` and the Payments receipt modal — do not carry them over; use flat
  `#7c3aed`.)
- **Never print `PKR PKR`.** The prefix is rendered once, by the cell, not by the formatter.
- **Type:** Geist for UI, JetBrains Mono for every numeral (tabular). Never Inter or Roboto.
- **Density: compact.** Radius scale 4 / 6 / 8 / 12 only.

## Design tokens

Defined per screen as CSS custom properties; dark is the default theme and light is applied
via `[data-theme="light"]`. Use this exact set.

| Token | Role | Dark | Light |
|---|---|---|---|
| `--page` | Page background | `#0f0f0f` | `#fafafa` |
| `--card` | Card / sidebar surface | `#141414` | `#ffffff` |
| `--elev` | Elevated (modal, table head) | `#1c1c1c` | `#ffffff` |
| `--hov` | Hover / active row | `#262626` | `#f5f5f5` |
| `--bd` | Border | `#2a2a2a` | `#e5e5e5` |
| `--bd2` | Strong border / scrollbar | `#363636` | `#d4d4d4` |
| `--t1` | Text primary | `#e5e5e5` | `#171717` |
| `--t2` | Text secondary | `#a3a3a3` | `#525252` |
| `--t3` | Text tertiary | `#737373` | `#a3a3a3` |
| `--ac` | Accent | `#8b5cf6` | `#7c3aed` |
| `--ac-cta` | Primary button fill | `#7c3aed` | `#7c3aed` |
| `--ac-soft` | Accent surface (active nav) | `rgba(139,92,246,.12)` | `#f5f3ff` |
| `--ac-bd` | Accent border | `rgba(139,92,246,.28)` | `#ddd6fe` |
| `--warn` | Warning text/icon | `#fbbf24` | `#b45309` |
| `--warn-soft` / `--warn-bd` | Warning pill | `rgba(251,191,36,.10)` / `rgba(251,191,36,.22)` | `#fffbeb` / `#fde68a` |
| `--bad` | Danger text/icon | `#f87171` | `#b91c1c` |
| `--bad-soft` / `--bad-bd` | Danger pill | `rgba(248,113,113,.10)` / `rgba(248,113,113,.22)` | `#fef2f2` / `#fecaca` |
| `--info` | Info text/icon | `#60a5fa` | `#1d4ed8` |
| `--info-soft` / `--info-bd` | Info pill | `rgba(96,165,250,.10)` / `rgba(96,165,250,.22)` | `#eff6ff` / `#bfdbfe` |
| `--sh` | Card shadow | `0 1px 2px rgba(0,0,0,.4)` | `0 1px 2px rgba(0,0,0,.04)` |
| `--sh-lg` | Modal shadow | `0 8px 28px rgba(0,0,0,.6), 0 2px 6px rgba(0,0,0,.45)` | `0 8px 28px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.05)` |

`Dashboard.dc.html` is light-first and uses an older parallel naming (`--bd`, `--vi`, `--gr`,
`--rd`, `--am`, `--bl`, `--te`, `--pk`). Map it onto the table above when you port it: `--vi`
→ `--ac`, `--bd2` unchanged, and drop the multi-hue chart colours down to violet + neutral
greys except where a chart legend genuinely needs a second series colour.

**Type scale (px):** 9 / 9.5 (uppercase eyebrow, `.12em` tracking) · 10.5–11 (meta, badges) ·
12–12.5 (nav, table body, buttons) · 13.5 (form inputs) · 15–18 (card and page titles) ·
25–34 (KPI values). Weights 400 / 500 / 600 / 700 only.

**Spacing:** 2 / 4 / 6 / 8 / 9 / 10 / 13 / 16 / 20 / 28 px. Card padding 13–15px, table cell
padding 12px 16px, row height 33px in nav, 38px for header controls, 40px for form inputs.

**Radius:** 4 (badge) · 6 (nav item, button, input) · 8 (input, small card) · 10–12 (card,
modal). Nothing larger.

## Global chrome

**Sidebar** — 203px fixed (216px on Dashboard, normalise to 203px), `--card` background,
1px `--bd` right border, three regions:

1. Brand block: 30px logo (`designs/assets/logo.png`), "HOSTYLLO" 12.5px/700/.03em, tenant
   name below at 10.5px `--t3`, truncated.
2. Scrolling nav, groups with 9px uppercase `--t3` labels: **Main** (Dashboard, Students,
   Rooms, Cancellations, Complaints) · **Finance** (Payments, Expenses, Reports, Funds
   Transfers) · **Inventory** (Stock Inventory) · **System** (Staff, Users, Maintenance,
   Settings, Activity Log, Help & Support). Items are 33px tall, 12.5px, 16px icon, optional
   count badge on the right. Active item: `--ac-soft` background, `--ac` text, weight 600.
   Inactive: `--t2`, weight 500.
3. Footer: 27px round avatar in `--ac-soft`/`--ac-bd`, name + role, chevron.

Badge counts in the mocks: Cancellations 3, Complaints 4, Payments 5, Maintenance 2.
Complaints uses the danger pill, Cancellations the warning pill, everything else the grey
`--hov` pill.

**Page header** — 1px `--bd` bottom border, `--card` background, ~11px vertical padding:
page title, then search field (⌘K hint), month picker, notification bell with dot, theme
toggle, then up to two actions. Only the screen's own primary action is filled.

**Navigation is already wired in these files:** every sidebar item calls
`window.location.href = '<Page>.dc.html'` for the nine built screens. The six inert items
(Funds Transfers, Stock Inventory, Staff, Users, Maintenance, Activity Log, Help & Support)
have no destination yet — they are placeholders for the next design round, not bugs.

## Screens

Each screen shares the same skeleton: sidebar → header → KPI strip (4–6 cards with 40×
sparkline and "x.x% vs Jun 2026" delta) → filter/tab row → main table or panel grid →
right rail → modals. Read the corresponding file for exact per-element values.

### 1. Dashboard — `designs/Dashboard.dc.html`
Six KPI cards (Total Students, Total Revenue, Expenses & Transfers, Available Fund,
Outstanding Dues, Open Maintenance) over three panel rows: Monthly Overview line chart /
Seat Availability / Today at a Glance; Occupancy by Room Type / Payment Methods / Bed
Occupancy / Quick Actions; Revenue vs Expenses bars / Pending Payments / Upcoming Reminders.
Design width 1560px, fluid above 1180px and horizontally scrolling below it. Chart axes snap
to whole 2M steps (line 0→12M, bars 0→10M). Every figure derives from one ledger in the
logic class — reproduce that: one server-side aggregate feeding all cards and charts, no
independently computed totals.

### 2. Students — `designs/Students.dc.html`
47-student roster. Status tabs (All 47 / Active 44 / Left 7 / Blacklisted 2), Export CSV +
Export PDF, "Sorted by Room ascending" caption. Table columns: ID, Student (avatar
initials + name + father below), Room (`#n` pill + "3-Seater · Ground Fl"), Phone /
Emergency, CNIC, Nationality (pill), Address, Course, Rent, Status, Actions (view / edit /
shift room / delete). Rent cell shows the combined `rent + mess` total in mono with the
breakdown beneath, or "Mess not included". Modals: Add / Edit student (Personal, Room, Fee
sections), View record (Personal + Room info + payment history), Shift room.
Row shape: `{ id, name, father, room, roomMeta, phone, emergency, cnic, nationality,
address, course, rent, messFee, messIncluded, status }`. Sort: room number ascending,
numeric (#2 before #14), then name.

### 3. Rooms — `designs/Rooms.dc.html`
Block/floor occupancy view with room cards, capacity vs occupied beds, and a right rail
panel. Same KPI + filter + rail pattern.

### 4. Cancellations — `designs/Cancellations.dc.html`
Cancellation/refund queue, 3 pending. Warning pill on pending items; refund amounts as
plain text.

### 5. Complaints — `designs/Complaints.dc.html`
Complaint log, 4 open, separate from Maintenance. Status pills, assignee, age.

### 6. Payments — `designs/Payments.dc.html`
Ledger of monthly rent records. KPIs: Total Collected, This Month Pending, Total
Transactions, Average / Day. Status tabs All / Paid / Partial / Pending / Overdue with
counts; bulk selection with a contextual action bar (mark paid, send reminder, export,
clear); search; sortable columns (default room ascending); pagination. Row actions: Receipt,
View, Edit, Delete. Right rail: methods split, aging buckets, top dues, activity.
Modals: Add Payment (student picker, rent, paid, admission fee, concession + description,
repeatable extras with amount + description, method, month, status, pay date, due date,
notes, live Receipt Summary with unpaid + total) and Receipt.
Record shape: `{ id, student, room, month, rent, paid, unpaid, method, status, payDate,
dueDate }`. Methods: Cash, Bank Transfer, JazzCash, EasyPaisa, Cheque.

### 7. Expenses — `designs/Expenses.dc.html`
Expense register with category breakdown and an Add Expense modal.

### 8. Reports — `designs/Reports.dc.html`
Report catalogue (name + description + icon) with a generation panel and export controls.

### 9. Settings — `designs/Settings.dc.html`
Tabbed settings with a dirty-state counter and a save bar. Includes theme mode cards (Light /
Dark / System), density (Compact / Cosy / Roomy), and segmented controls. Changing theme mode
to Dark sets the app theme immediately.

## Interactions & behaviour

- **Nav:** click routes; active item styled as above. No hover animation beyond a background
  change to `--hov`.
- **Theme:** `data-theme="light"` on the app root; toggle in the header persists per user.
  Dark is the default and is more desaturated than light. No glow, no coloured shadows.
- **Tables:** row hover fills `--hov`. Sticky header. Sort by clicking a column header; room
  numbers sort numerically. Pagination is Previous / numbered / Next, 12 rows per page.
- **Bulk select:** checkbox column populates a contextual bar above the table; "Clear"
  resets the selection.
- **Search:** filters client-side in the mock; debounce and move it server-side. Resets to
  page 1 on every keystroke.
- **Modals:** fixed overlay `rgba(0,0,0,.64)`, panel `--elev` with `--bd2` border, radius 12,
  `--sh-lg`. Enter animation: `opacity 0→1, translateY(8px)→0` over 140–220ms
  `cubic-bezier(.2,.7,.3,1)`. Overlay click and Esc close. Backdrop fade 140ms.
- **Buttons:** 34–36px tall, radius 6–8, 12.5px/500. Primary `--ac-cta` with white text.
  Secondary `--card` + `--bd`, hover `--hov`. Tertiary text-only `--t2` → `--t1`.
- **Toasts / flash:** brief inline confirmation strings after destructive or export actions.
- **Empty states:** short sentence in `--t2` plus the relevant primary action; never a
  decorative illustration.
- **Responsive:** designed desktop-first at 1440–1560px. Below ~1180px content scrolls
  horizontally rather than reflowing. Tablet and mobile layouts are not designed yet.

## State

Per screen the mocks keep: `theme`, active tab/status filter, search query `q`, `sortKey` +
`sortDir`, `page`, selection map `sel`, `modal` (null | name), and per-modal form fields.
In the real app: theme and density in user preferences; filters, sort, page and query in the
URL; everything else server state.

## Data conventions

- Currency PKR, tabular mono numerals, thousands separators, no decimals. The prefix is
  printed by the cell — never by the value formatter.
- `rent` and `mess_fee` are separate; the displayed rent is their sum with the breakdown
  beneath. Blank `mess_fee` means mess is not included.
- Room numbers are display strings (`#14`) sorted numerically.
- CNIC format `XXXXX-XXXXXXX-X`; B-Form accepted in the same field.
- Sample data is Pakistani (names, courses, CNIC, addresses, PKR amounts) — keep locale
  formatting even after wiring the API.

## Fields the desktop app lacks

`nationality` and `mess_fee` are new. Both appear in the Students table, the student form and
the student record view; `mess_fee` also feeds the rent breakdown everywhere rent is shown.
Add them to the schema.

## Not yet designed / open questions

Answer these before building the shell, since they change routing and permissions:

1. Multi-tenancy — one account managing several hostels/branches with a tenant switcher, or
   one hostel per account? The sidebar footer currently shows a single tenant name.
2. Role model (owner / warden / accountant / viewer) and what each role can see.
3. Subscription/billing, onboarding and team-invite screens.
4. Tablet/mobile scope.
5. The six inert nav destinations (Funds Transfers, Stock Inventory, Staff, Users,
   Maintenance, Activity Log, Help & Support).

## Assets

- `designs/assets/logo.png` — Hostyllo mark, rendered at 30×30 with 8px radius.
- Icons are inline 16px stroke SVGs (`stroke-width: 2`, round caps), Lucide-equivalent
  shapes. Use your existing icon library rather than copying the path data.
- Fonts: Geist and JetBrains Mono, loaded from Google Fonts in the mocks. Self-host in
  production.

## Files

```
DESIGN_RULES.md            binding design rules — read first
designs/Dashboard.dc.html
designs/Students.dc.html
designs/Rooms.dc.html
designs/Cancellations.dc.html
designs/Complaints.dc.html
designs/Payments.dc.html
designs/Expenses.dc.html
designs/Reports.dc.html
designs/Settings.dc.html
designs/support.js         runtime that renders the .dc.html files — do not port
designs/assets/logo.png
```

Open any `designs/*.dc.html` in a browser to interact with it; the sidebar links move between
screens.
