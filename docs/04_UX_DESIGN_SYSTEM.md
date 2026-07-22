# HOSTYLLO — UX Design System
## 04_UX_DESIGN_SYSTEM.md
## v15.0 — Complete UI/UX Specification
## Classification: Confidential — Founder Only

> Referenced by: MASTER PRD v15.0 Section 35 (Enterprise UX Architecture)

> **Status:** This file was referenced in MASTER PRD v12.0, v13.0, and v14.0 but did not exist until the v15.0 suite.
> This document fills that gap completely. GAP-1 RESOLVED.

---

## 1. DESIGN PHILOSOPHY

HOSTYLLO's UI must feel like a premium SaaS product while remaining functional for wardens using Android phones in poor lighting, under time pressure, possibly in areas with unstable internet. Every design decision must pass this test:

**"Can a non-technical Pakistani warden complete this action in under 30 seconds on a 5-year-old Android phone?"**

If the answer is no, the design is wrong.

### Three Design Principals

1. **Clarity over decoration** — Every pixel must earn its place. No decorative chrome.
2. **Speed over comprehensiveness** — Show the most important action first. Everything else is secondary.
3. **Trust through reliability** — Skeletons not spinners. Inline errors not alerts. Never hide failures.

---

## 2. DESIGN TOKENS — CANONICAL (CSS VARIABLES)

These are the single source of truth. Do not hardcode colors anywhere.

### Color System

```css
/* tokens.css — import in every component */

/* === DARK MODE (default) === */
:root[data-theme="dark"] {
  --bg:          #0b0e14;  /* App background */
  --surface:     #111827;  /* Cards, modals, panels */
  --surface-2:   #1a2234;  /* Nested surfaces, table rows, sidebar */
  --surface-3:   #243044;  /* Hover state on surface-2 */
  --border:      #1e293b;  /* Dividers, input borders */
  --border-2:    #2d3f56;  /* Stronger border, focus outlines */

  /* Brand Colors */
  --gold:        #c9a84c;  /* Primary action, focus ring, CTA */
  --gold-hover:  #d4b260;  /* Gold + 5% lighter */
  --gold-active: #be9e42;  /* Gold - 5% darker */
  --gold-subtle: rgba(201,168,76,0.12);  /* Gold tint background */

  --teal:        #3dd8c0;  /* Success, paid status, online indicator */
  --teal-subtle: rgba(61,216,192,0.12);

  /* Semantic Colors */
  --text:        #e2e8f4;  /* Primary text */
  --text-muted:  #94a3b8;  /* Secondary text, placeholders */
  --text-disabled: #4b5563; /* Disabled state */

  --red:         #ef4444;  /* Danger, error, pending badges */
  --red-subtle:  rgba(239,68,68,0.12);
  --amber:       #f59e0b;  /* Warnings, partial payment badges */
  --amber-subtle: rgba(245,158,11,0.12);
  --blue:        #3b82f6;  /* Info, maintenance alerts */
  --blue-subtle: rgba(59,130,246,0.12);

  /* Interactive */
  --focus-ring:  0 0 0 2px #0b0e14, 0 0 0 4px #c9a84c;
}

/* === LIGHT MODE === */
:root[data-theme="light"] {
  --bg:          #f8fafc;
  --surface:     #ffffff;
  --surface-2:   #f1f5f9;
  --surface-3:   #e8eef5;
  --border:      #e2e8f0;
  --border-2:    #cbd5e1;
  --gold:        #a07c2a;
  --gold-hover:  #b08830;
  --gold-active: #906e24;
  --gold-subtle: rgba(160,124,42,0.10);
  --teal:        #0ea5a0;
  --teal-subtle: rgba(14,165,160,0.10);
  --text:        #0f172a;
  --text-muted:  #64748b;
  --text-disabled: #9ca3af;
  --red:         #dc2626;
  --red-subtle:  rgba(220,38,38,0.10);
  --amber:       #d97706;
  --amber-subtle: rgba(217,119,6,0.10);
  --blue:        #2563eb;
  --blue-subtle: rgba(37,99,235,0.10);
  --focus-ring:  0 0 0 2px #f8fafc, 0 0 0 4px #a07c2a;
}
```

### Radius System
```css
--radius-xs: 2px;   /* Tags, chips */
--radius-sm: 4px;   /* Badges, small elements */
--radius-md: 8px;   /* Buttons, inputs, cards */
--radius-lg: 12px;  /* Modals, large panels */
--radius-xl: 16px;  /* Feature cards */
--radius-full: 9999px; /* Pills, avatars */
```

### Spacing System (4px base)
```css
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

### Shadow System
```css
--shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.3);
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.2);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.2);
```

---

## 3. TYPOGRAPHY SYSTEM

### Font Stack
```css
/* Load in _document.tsx */
/* Figtree: headings + body (Latin) */
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');

/* DM Mono: numbers, CNIC, amounts */
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

/* Noto Nastaliq Urdu: Urdu text only */
@import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400&display=swap');

:root {
  --font-sans: 'Figtree', system-ui, -apple-system, sans-serif;
  --font-mono: 'DM Mono', monospace;
  --font-urdu: 'Noto Nastaliq Urdu', serif;
}
```

### Type Scale

| Role | Element | Font | Size | Weight | Line Height | Letter Spacing |
|------|---------|------|------|--------|-------------|----------------|
| Display | h1 | Figtree | 32px | 700 | 1.2 | -0.02em |
| Page Title | h1 | Figtree | 28px | 700 | 1.25 | -0.01em |
| Section | h2 | Figtree | 22px | 600 | 1.3 | -0.01em |
| Card Title | h3 | Figtree | 18px | 600 | 1.3 | 0 |
| Subheading | h4 | Figtree | 15px | 600 | 1.4 | 0 |
| Body | p | Figtree | 14px | 400 | 1.6 | 0 |
| Body Strong | p | Figtree | 14px | 500 | 1.6 | 0 |
| Label | label | Figtree | 12px | 500 | 1.4 | 0.01em |
| Caption | span | Figtree | 11px | 400 | 1.4 | 0.01em |
| Money / CNIC | span | DM Mono | 14px | 500 | 1.4 | 0 |
| Urdu Body | p | Noto Nastaliq Urdu | 16px | 400 | 2.0 | 0 |
| Urdu Small | span | Noto Nastaliq Urdu | 14px | 400 | 1.8 | 0 |

---

## 4. COMPONENT SPECIFICATIONS

### 4.1 Buttons

```
Sizes:
  sm: height 28px, padding 8px 12px, font-size 12px
  md: height 36px, padding 10px 16px, font-size 13px (DEFAULT)
  lg: height 44px, padding 12px 20px, font-size 14px

Variants:
  primary:   bg=var(--gold), text=white, border=none
  secondary: bg=var(--surface-2), text=var(--text), border=1px var(--border)
  ghost:     bg=transparent, text=var(--text-muted), border=none
  danger:    bg=var(--red-subtle), text=var(--red), border=1px var(--red)
  link:      bg=none, text=var(--gold), underline on hover

States:
  default:  as specified
  hover:    primary→var(--gold-hover), others→var(--surface-3)
  active:   primary→var(--gold-active), scale(0.98)
  disabled: opacity 40%, cursor not-allowed
  loading:  spinner replaced by skeleton pulse in button

Border radius: var(--radius-md) = 8px
Transition: background 120ms ease, transform 80ms ease

Focus: box-shadow: var(--focus-ring)
```

### 4.2 Form Inputs

```
Text Input:
  height: 40px
  padding: 0 12px
  font-size: 14px
  border: 1px solid var(--border)
  border-radius: var(--radius-md)
  background: var(--surface)
  color: var(--text)

  States:
    default:   border var(--border)
    focus:     border var(--gold), box-shadow var(--focus-ring)
    error:     border var(--red), box-shadow 0 0 0 2px var(--red-subtle)
    disabled:  background var(--surface-2), color var(--text-disabled)
    filled:    border var(--border-2)

Select / Dropdown:
  Same as text input + chevron icon right

Textarea:
  min-height: 80px, resize: vertical

CNIC Input (special):
  font-family: var(--font-mono)
  Auto-format: XXXXX-XXXXXXX-X as user types
  Max-length enforced: 15 chars with dashes

Phone Input:
  font-family: var(--font-mono)
  Auto-format: 03XX-XXXXXXX
```

### 4.3 Form Labels

```
Position: above input, 4px gap
Font: 12px, weight 500, color var(--text-muted)
Required marker: red asterisk, sr-label for screen readers
```

### 4.4 Inline Error Messages

```
Position: below input, 4px gap
Font: 11px, weight 400, color var(--red)
Icon: ⚠ 12px, margin-right 4px
Never: modal alerts for form errors
Always: inline, specific, actionable
```

### 4.5 Cards

```
background: var(--surface)
border: 1px solid var(--border)
border-radius: var(--radius-lg)
padding: 20px
box-shadow: var(--shadow-sm)

KPI Card (Dashboard):
  padding: 24px
  min-height: 100px
  header: label 11px muted + icon
  value: 28px DM Mono, font-weight 700
  subtext: 12px muted (e.g., "vs last month")

Clickable card:
  cursor: pointer
  transition: border-color 150ms, box-shadow 150ms
  hover: border var(--border-2), shadow var(--shadow-md)
```

### 4.6 Badges / Status Tags

```
Paid:     background var(--teal-subtle), text var(--teal), border 1px var(--teal)
Partial:  background var(--amber-subtle), text var(--amber), border 1px var(--amber)
Pending:  background var(--red-subtle), text var(--red), border 1px var(--red)
Active:   background var(--teal-subtle), text var(--teal)
Vacated:  background var(--surface-2), text var(--text-muted)
On Leave: background var(--amber-subtle), text var(--amber)

Size: height 22px, padding 3px 8px, border-radius var(--radius-full)
Font: 11px, weight 500, letter-spacing 0.01em
```

### 4.7 Tables

```
Header row:
  background: var(--surface-2)
  font: 11px, weight 600, color var(--text-muted)
  text-transform: uppercase, letter-spacing 0.05em
  height: 36px

Body rows:
  height: 48px (desktop), 56px (mobile)
  border-bottom: 1px solid var(--border)
  font: 14px, color var(--text)

  hover: background var(--surface-2)
  selected: background var(--gold-subtle)

Striped: alternate rows var(--surface) / var(--surface-2)

Mobile tables: horizontal scroll, min-width per column
Never: collapse to card layout — wardens need to scan columns

Pagination: "Showing X–Y of Z" + prev/next arrows
```

### 4.8 Loading States

**Rule: NEVER use spinners. ALWAYS use skeleton shimmer.**

```css
/* Skeleton shimmer animation */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-2) 25%,
    var(--surface-3) 50%,
    var(--surface-2) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
```

**Skeleton must match exact layout of loaded content:**
- Dashboard: 5 card skeletons at exact KPI card dimensions
- Student list: table rows at exact table row height
- Payment form: input field skeletons at exact field positions
- Never: generic grey boxes

### 4.9 Empty States

Every module must have a designed empty state. Rules:
- Illustrated (simple SVG — no stock photos)
- Bilingual: Urdu label + English label
- CTA button: "Add your first [student/room/payment]"
- Never: just "No data" or a blank screen

### 4.10 Toast Notifications

```
Position: top-right, 16px from edge
Width: max 380px
Duration: 4s auto-dismiss (error: 6s — requires manual dismiss or action)
Animation: slide-in-from-right 200ms, fade-out 200ms

Types:
  success: border-left 3px var(--teal), icon ✓
  error:   border-left 3px var(--red), icon ✕, action button optional
  warning: border-left 3px var(--amber), icon ⚠
  info:    border-left 3px var(--blue), icon ℹ

Stack: max 3 toasts visible; oldest dismisses first
```

### 4.11 Modals

```
Overlay: rgba(0,0,0,0.5) backdrop
Container:
  background: var(--surface)
  border-radius: var(--radius-lg)
  border: 1px solid var(--border)
  box-shadow: var(--shadow-lg)
  max-width: 480px (default), 600px (large), full-screen (mobile)
  padding: 24px

Animation (Framer Motion):
  initial: { opacity: 0, scale: 0.96 }
  animate: { opacity: 1, scale: 1 }
  exit: { opacity: 0, scale: 0.96 }
  transition: { duration: 0.18, ease: 'easeOut' }

Header: title 18px 600 + close button top-right
Body: form or content
Footer: action buttons right-aligned (Cancel secondary + Confirm primary)

Close on: Escape key, backdrop click (except confirmation modals)
```

---

## 5. APP SHELL LAYOUT

### Desktop (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER (60px height, position: sticky, top: 0)              │
│  [Logo/Brand] [Hostel Name] [Search] [Alerts] [Theme] [User]│
├──────────────────────────────────────────────────────────────┤
│ SIDEBAR    │  MAIN CONTENT                                    │
│ (260px)    │  (fills remaining width)                         │
│            │                                                  │
│ Logo       │  Page title (28px, 700)                         │
│ ─────      │  Breadcrumb (optional)                          │
│ Dashboard  │                                                  │
│ Students   │  Content area                                    │
│ Rooms      │  max-width: 1280px                              │
│ Payments   │  padding: 24px                                  │
│ Expenses   │                                                  │
│ Reports    │                                                  │
│ Issues     │                                                  │
│ ─────      │                                                  │
│ Settings   │                                                  │
│            │                                                  │
│ ─────────  │                                                  │
│ Plan badge │                                                  │
└────────────┴─────────────────────────────────────────────────┘

Sidebar collapsible: 260px ↔ 60px (icon rail)
Collapse trigger: chevron button at sidebar bottom
Collapsed state: icons only, tooltips on hover
```

### Mobile (< 768px)

```
┌─────────────────────────────┐
│  HEADER (56px)               │
│  [Menu] [Title] [User]      │
├─────────────────────────────┤
│                             │
│  CONTENT                    │
│  padding: 16px              │
│  full-width                 │
│                             │
├─────────────────────────────┤
│  BOTTOM NAV (56px)          │
│  [Home][Students][Pay][...] │
└─────────────────────────────┘

Navigation: bottom tab bar (5 primary modules)
Drawer: hamburger opens full-screen sidebar
Touch targets: minimum 44×44px
Scroll: vertical only, no horizontal scroll in main content
```

### Header Contents (Desktop)

```
Left:  Logo (32px) + Hostel name (14px 600)
Center: Global search bar (Cmd+K) — Phase 2
Right: [Connectivity indicator] [Notification bell] [Theme toggle] [EN/UR] [Avatar]

Connectivity indicator:
  Online: green dot, "Online"
  Offline: amber dot, "Offline — data may not save"
  Syncing: pulsing dot, "Syncing..."
```

---

## 6. DASHBOARD SCREEN SPECIFICATION

### KPI Cards (Row 1 — 5 cards)

```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Revenue    │ │ Pending    │ │ Expenses   │ │ To Owner   │ │ Net Fund   │
│ ─────────  │ │ ─────────  │ │ ─────────  │ │ ─────────  │ │ ─────────  │
│ ₨ 84,000   │ │ ₨ 16,000   │ │ ₨ 12,000   │ │ ₨ 20,000   │ │ ₨ 52,000   │
│ +12% ↑    │ │ 4 students │ │ 8 entries  │ │ 2 entries  │ │ ─────────  │
└────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘

Amounts: DM Mono font, 28px, weight 700
All amounts: Intl.NumberFormat('en-PK', {style:'currency', currency:'PKR'})
Loading: skeleton at exact card dimensions
```

### Alert Banners (Row 2 — conditional, only shown when non-zero)

```
🔴 [Red] "4 students have pending cancellation" [View →]
🟡 [Amber] "12 students haven't paid this month" [Send Reminders →]
🔵 [Blue] "3 open maintenance requests" [View →]
🔴 [Red] "2 unresolved complaints" [View →]
🟡 [Amber] "Occupancy below 60%" [View Rooms →]

Each banner: full-width, 40px height, font 13px, icon left, action right
Multiple banners: stack vertically, most urgent first
```

### Occupancy Grid (Row 3)

```
Mini grid showing all rooms and bed status:
  Gold = free beds
  Green = full room
  Grey = maintenance
  
Click room → navigate to /rooms/:id
Hover room → tooltip with room number + occupant names
```

---

## 7. STUDENT MODULE SCREENS

### Student List (`/students`)

```
Header: "Students" h1 + [Add Student] primary button + [Import CSV] secondary
Filters: Status (all/active/on_leave/vacated) + Room + Search (pg_trgm, < 200ms)

Table columns (desktop):
  Photo (32px avatar) | Name | CNIC (masked) | Room | Rent | Status | Joined | Actions

Table columns (mobile, scrollable):
  Name | Room | Status | Actions

Row actions: [View Profile] [Edit] [Record Payment]

Quick action: tap row → navigate to student profile
Empty state: illustrated + "Add your first student" button
```

### Add Student Form (`/students/new`)

```
Multi-step form (3 steps, progress indicator at top):

Step 1: Identity
  - Full name* (text, 40px)
  - Father/Guardian name* (text)
  - CNIC / B-Form* (CNIC input with auto-format)
  - Phone* (phone input with auto-format)
  - Emergency contact (phone)
  - Email (email)
  - Occupation (text)
  - City (Pakistani city autocomplete — 200+ cities)
  - Address (textarea)

Step 2: Room Assignment
  - Room selector (visual grid — tap room → select bed)
  - Join date* (date picker)
  - Monthly rent* (number, auto-fills from room type)
  - Admission fee (number)
  - Security deposit (number + status)
  - Payment method (select from hostel's methods)
  - Notes (textarea)

Step 3: Photo
  - Upload file OR live camera capture (getUserMedia)
  - Preview + crop (200×200)
  - Skip option (shows placeholder avatar)

Footer buttons:
  [Back] secondary + [Next / Save Student] primary
  Step 3 footer: [Save Student] + [Save & Record First Payment] primary

Validation:
  Inline errors below fields, immediately on blur
  CNIC duplicate check: debounced 500ms, shows yellow warning if duplicate
```

### Student Profile (`/students/:id`)

```
Header: Photo + Name + Status badge + Room badge
Action buttons: [Edit] [Record Payment] [Check Out] [Cancel Student]

Tabs:
  Overview: contact info, room details, financial summary
  Payments: complete payment history table
  Room History: all rooms + dates
  Activity Log: audit trail
  Check-In Log: movement history
```

---

## 8. PAYMENT MODULE SCREENS

### Record Payment (`/payments/record`)

```
Form layout: single column, no tabs

Student: typeahead search (debounced 200ms) → auto-fills:
  - Current rent
  - Preferred payment method
  - Outstanding balance from previous month

Month*: month/year selector (defaults to current)
Due date: date picker
Monthly Rent*: number (pre-filled, editable)
Admission Fee: number (pre-filled if first payment)

Extra Charges: dynamic list
  [+ Add Extra Charge] button
  Each row: Label | Amount | Remove
  Example: "Electricity" | ₨ 800

Concession: number + required description if non-zero

Calculation preview (real-time, updates as user types):
  ┌──────────────────────────────┐
  │ Monthly Rent:    ₨  8,000    │
  │ + Admission Fee: ₨  2,000    │
  │ + Electricity:   ₨    800    │
  │ - Concession:    ₨      0    │
  │ ────────────────────────────  │
  │ Total Due:       ₨ 10,800    │
  │ Previous Unpaid: ₨      0    │
  │ ═══════════════════════════  │
  │ AMOUNT TO PAY:   ₨ 10,800    │
  └──────────────────────────────┘
  Font: DM Mono for all amounts

Amount Paid*: number input (prominently sized: 32px)
Payment Method*: select (hostel's configured methods)
Date*: date picker (defaults to today)
Notes: textarea (optional)

Action buttons:
  [Cancel] secondary + [Save Payment] primary
  After save: modal "Payment Saved" + [Print Receipt] + [Send via WhatsApp] + [Done]
```

### Payment Receipt

```
Generated PDF layout:
  Header: Hostel logo + name + tagline
  Title: "PAYMENT RECEIPT" (centered)
  Receipt #: sequential (never reset) DM Mono
  
  Student section:
    Name: [name]
    CNIC: XXXXX-XXXXXXX-X (always masked)
    Room: [room number] - [bed label]
    Month: [month name]
  
  Payment breakdown table:
    Monthly Rent     | ₨ 8,000
    Admission Fee    | ₨ 2,000
    [Extra charges]  | ₨ ---
    Concession       | (₨ ---)
    ─────────────────────────
    Total Due        | ₨ 10,000
    Amount Paid      | ₨ 10,000
    Balance Due      | ₨ 0
  
  Payment method: [method]
  Payment date: [date]
  Due date: [date]
  
  Footer: Warden signature line + "Thank you"
  Bottom: Generated by HOSTYLLO
```

---

## 9. MOBILE-FIRST PATTERNS

### Touch Targets
- Minimum 44×44px for all interactive elements
- Primary actions: 48×48px minimum
- Row actions in tables: icon buttons 40×40px

### Swipe Actions (Mobile)
- Student row: swipe left → quick actions (Record Payment, Edit)
- Notification/alert: swipe right to dismiss

### Bottom Sheet
- Replace modals with bottom sheets on mobile
- Drag handle at top
- Close on swipe down or backdrop tap

### Mobile Quick Actions (Floating)
- FAB (Floating Action Button): bottom-right, 56px, gold
- On Student list: FAB → Add Student
- On Payments: FAB → Record Payment
- On Expenses: FAB → Add Expense

---

## 10. MOTION & ANIMATION SYSTEM

All animations use Framer Motion.

```typescript
// Standard page transition
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}
const pageTransition = { duration: 0.2, ease: 'easeOut' }

// Modal
const modalVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
}
const modalTransition = { duration: 0.18, ease: 'easeOut' }

// Toast slide-in
const toastVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
}

// Sidebar collapse
const sidebarVariants = {
  open: { width: 260 },
  closed: { width: 60 },
}
const sidebarTransition = { duration: 0.2, ease: 'easeInOut' }
```

**Rules:**
- Never animate layout shifts that move content the user is reading
- Page transitions: 200ms maximum
- Hover transitions: 120–150ms
- Color transitions: 120ms
- No infinite animations except loading states and connectivity indicator

---

## 11. ACCESSIBILITY REQUIREMENTS

- All interactive elements have visible focus indicator (var(--focus-ring))
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text
- All images have alt text
- Form errors: announced by screen reader (`aria-describedby`)
- Modal: focus trapped inside, restored to trigger on close
- Tables: proper `<th>` headers, `scope` attribute
- Keyboard navigation: full Tab/Shift+Tab on all flows
- CNIC and amounts: `aria-label` for screen reader pronunciation

---

## 12. URDU LANGUAGE SUPPORT

```css
/* RTL layout trigger */
[dir="rtl"] {
  --sidebar-float: right;
  text-align: right;
}

/* Urdu-specific styles */
.urdu-text {
  font-family: var(--font-urdu);
  font-size: 16px;
  line-height: 2.0;
  direction: rtl;
}

/* Bilingual labels */
.label-bilingual {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.label-en { font: var(--font-sans); font-size: 11px; color: var(--text-muted); }
.label-ur { font: var(--font-urdu); font-size: 13px; color: var(--text); direction: rtl; }
```

Empty states must show both English and Urdu text.
Payment receipts: Urdu mode produces fully Urdu receipt with Noto Nastaliq Urdu font.

---

## 13. ALERT BANNER COMPONENT

```tsx
// Ports the Electron app's alert banner system exactly

type AlertBannerProps = {
  type: 'danger' | 'warning' | 'info';
  message: string;
  count: number;
  actionLabel: string;
  onAction: () => void;
  onDismiss?: () => void;
}

// Colors:
// danger: bg var(--red-subtle), border var(--red), text var(--red)
// warning: bg var(--amber-subtle), border var(--amber), text var(--amber)
// info: bg var(--blue-subtle), border var(--blue), text var(--blue)

// Layout:
// [Icon] [Message with count bolded] [spacer] [Action Link →]
// Height: 40px, full-width
// Multiple: stacked, most urgent first
// Dismiss: × button (only for info type — danger/warning auto-dismiss when count reaches 0)
```

---

*HOSTYLLO UX Design System v13.0 · Zeerak Hostix · May 2026 · Confidential*
*This document fills the gap referenced in MASTER PRD v12.0 and v13.0 Section 17.*
