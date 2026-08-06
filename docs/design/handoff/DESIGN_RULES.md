# Hostyllo — cloud SaaS for hostel management (design project)

**What we are designing:** Hostyllo, a new **cloud-based multi-tenant SaaS** for hostel
management, living in its own repo and directory. Web app, online-first.

**What we are designing FROM:** HOSTIX, the user's existing **offline Electron desktop
app** (local folder `HOSTIX-APP`). It is the reference for UI patterns, screen inventory,
component specs and data shapes — it is *not* the thing being built. HOSTIX stays as-is.

So: lift the proven IA and data model out of the desktop app, and redesign it as a premium
enterprise SaaS front end. Anything that only makes sense on a local desktop install
(license key + activation, local file backup/restore, `.hostix` files, app version footer)
does not belong in the SaaS unless the user asks for a cloud equivalent.

Target category: Stripe / Linear / Vercel / Plaid / Notion.

## Sources of truth, in priority order

1. `HOSTIX-APP/docs/HOSTIX_UI_UPGRADE_STRATEGY.md` — the visual rulebook. Overrules everything else. <!-- link-check-ignore -->
2. The user's hand-drawn design photos (local `ui` folder) + their Google Stitch prototypes.
   Two references per page; the user says which to favour when they disagree.
3. `HOSTIX-APP/renderer/style.css` + `tokens.css` + `src/modules/*.js` — real running values,
   best source for data shapes and component behaviour. The strategy doc wins on colour and type.

## Settled design decisions — do not re-litigate

- **One accent: violet.** `#8b5cf6` (dark) / `#7c3aed` primary CTA. Coral/gold/royal are retired.
  No second accent, ever.
- **No decorative gradients on UI chrome.** Flat violet only.
- **Maximum one primary button per screen.** "Add Student" is primary (filled violet);
  "Add Payment" is secondary (outlined). Everything else secondary or tertiary.
- **Money is always plain text** — never green, never red. The number is the headline.
- **Neutral grey text:** `#e5e5e5` primary / `#a3a3a3` secondary / `#737373` tertiary.
  Not the warm tokens in the running desktop app.
- **One neutral icon colour** for all stat-card icons (grey-500 on grey-100). No rainbow icons.
- **Pills default to grey.** Semantic colour only when the state is actionable
  (Overdue, Pending review). Max one semantic pill per card.
- **Type:** Geist (UI) + JetBrains Mono (all numerals, tabular). Never Inter or Roboto.
- **Density: compact**, Linear-like. Radius scale 4 / 6 / 8 / 12 — no 14px+ corners.
- **Dark mode more desaturated than light**, never pure black, no glow, no coloured shadows.

## Surface scale

| Surface         | Light     | Dark      |
|-----------------|-----------|-----------|
| Page background | `#fafafa` | `#0f0f0f` |
| Card            | `#ffffff` | `#141414` |
| Elevated card   | `#ffffff` | `#1c1c1c` |
| Hover / active  | `#f5f5f5` | `#262626` |
| Border          | `#e5e5e5` | `#2a2a2a` |

## Navigation (from the user's sketch)

Group 1: Dashboard · Students (+ Branches) · Rooms · Cancellations · Complaints ·
Finance/Payments · Expenses · Reports · Stock Inventory · Funds Transfers
Group 2: Staff · Users · Maintenance (separate from Complaints) · Settings · Help & Support
Footer: current user + role.

## Data conventions

- Currency is PKR with tabular numerals. Never double-print the prefix (there is a known
  `PKR PKR` regression in the desktop app — do not reproduce it).
- Rent may include mess: show the combined total with `rent + mess` broken out beneath;
  show "Mess not included" when it isn't.
- Tables sort by **room number ascending**, numerically (#2 before #14).
- Realistic Pakistani hostel data — real names, rooms, CNIC, courses, PKR amounts. Never Lorem ipsum.
- Every figure on a screen derives from one source of truth in the logic class. No hard-coded
  totals that can drift from the rows above them.

## Fields the desktop app lacks (flagged to the user)

- `nationality` — used in the Students table and forms
- `mess_fee` — used for the rent + mess breakdown

## Open questions about the SaaS dimension

Not yet answered — ask before designing anything that depends on them:
- Multi-tenant? One account managing several hostels/branches (tenant switcher) vs one hostel per account.
- Responsive scope: desktop-only web, or tablet/mobile too?
- Does the product need subscription/billing, onboarding, and team-invite screens?
- Role model (owner / warden / accountant / viewer) and what each can see.

## Working style

One page at a time. The user uploads their design photo plus the Stitch prototype for that
page, then I redesign it against the rules above.
