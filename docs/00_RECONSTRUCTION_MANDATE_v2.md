# HOSTYLLO SaaS v2.0 — Enterprise Reconstruction Mandate

> Issued by the owner, 2026-08-06, verbatim below. This is a **standing directive**, not a
> one-session brief. It sits above the design docs and beside the PRD: where a screen decision
> is in question, this states the intent the decision must serve.
>
> **It was issued in response to a concrete failure.** The rebuilt dashboard shipped with a
> hardcoded room-type split, an invented 101–408 seat map, hardcoded zeros behind the alert
> counters, a 1180px fixed content floor that clipped on a 1366px screen, and a banner admitting
> "some figures are illustrative" — while `HOSTIX-APP/renderer/src/modules/dashboard.js` had
> already computed every one of those numbers for years. Read §THE TWO AXES before building any
> screen.

---

## THE TWO AXES (the reconciliation that matters)

This mandate says *reinvent*. The standing feature rule says *never invent*. Both are correct,
because they govern different things. Getting this wrong is what produced the dashboard.

| Axis | Source of truth | Rule |
|---|---|---|
| **Domain** — business rules, calculations, fields, states, workflows, validation, what a number *means* | `C:\HOSTIX-APP` renderer modules | **Never invent.** Port the logic. If HOSTIX computes it, derive ours from that computation. |
| **Form** — UI, layout, navigation, components, typography, colour, interaction, architecture, code | First principles + the design system | **Never copy.** The Electron UI is legacy. Redesign every screen. |

Two failure modes, both real:

- **Inventing domain** → numbers that mean nothing. A hardcoded "2 Seater: 40 rooms" against a
  database holding one room. This is what happened.
- **Copying form** → a desktop app in a browser tab. Fixed-width canvases, cloned layouts.

A screen is only right when the logic traces to HOSTIX **and** the design traces to nothing.

---

## THE MANDATE (verbatim)

### ROLE

You are **Claude Opus**, acting as: Principal Software Architect · Senior Product Manager ·
Staff Frontend Engineer · Senior UI/UX Designer · Enterprise SaaS Consultant · System Architect ·
Database Architect · Design System Engineer.

Your task is **NOT** to migrate my Electron application. Your task is to **reinvent** it.

You are building **Hostyllo**, the cloud version of **Hostix**. Hostix is only the business logic
reference. The final product must look and feel like an entirely new enterprise SaaS platform.

### OBJECTIVE

Read the entire Hostix Electron codebase. Understand every page, module, workflow, calculation,
business rule, report, dashboard, payment flow and hostel management feature. Then completely
redesign, reconstruct and modernize everything.

Never copy screens. Never recreate the desktop UI. Instead: understand the purpose of every
screen, then redesign it from scratch.

### THINK LIKE THIS

Imagine Microsoft purchased Hostix, then asked you to rebuild it into the world's best hostel
management SaaS. That is your job.

### PRODUCT NAME

Hostyllo. Hostix = legacy desktop software. Hostyllo = modern cloud SaaS. **These are different
products.**

### DO NOT COPY UI

The Electron UI is outdated. Do not recreate layouts, cards, tables, forms, colors, spacing,
navigation, components, typography, icons — anything. Create a completely new design system.

### STUDY FIRST

Before writing any code, read the entire Hostix codebase and build an internal understanding of:
modules · dependencies · data flow · state flow · business logic · relationships · user journeys ·
permissions · calculations · validation · reports · invoices · receipts · transfers · expenses ·
students · rooms · beds · payments. **Do not skip any file.**

### THEN CREATE

A complete Product Requirement Document: vision · goals · features · modules · navigation ·
architecture · data flow · security · permissions · business rules · roadmap · future features.

### THEN DESIGN

A completely new enterprise UX. Every page redesigned. Every workflow improved. Every interaction
modern. Every screen reduces clicks. Everything feels premium.

### DESIGN INSPIRATION

Linear · Stripe Dashboard · Notion · Vercel · GitHub · Figma · Raycast · Clerk · Supabase ·
Framer · Arc Browser · Apple HIG · Microsoft Fluent · modern enterprise SaaS.
**Do NOT clone them — learn their design philosophy.**

### DESIGN LANGUAGE

Premium · minimal · elegant · professional · luxury · fast · accessible · modern · enterprise ·
clean · timeless. Not flashy. Not childish. Not template-looking.

### DESIGN SYSTEM

Typography · spacing · elevation · shadows · radius · colors · icons · inputs · buttons · badges ·
cards · charts · tables · alerts · dialogs · drawers · dropdowns · pagination · navigation ·
loading states · skeletons · empty states · error states · success states.

### USER EXPERIENCE

Every workflow requires fewer clicks — student admission, payment, transfer, expense, reports,
room allocation, seat changes, check-out. Everything faster.

### NAVIGATION

Redesign completely. Possible structure: Dashboard · Residents · Admissions · Rooms · Beds ·
Finance · Payments · Expenses · Transfers · Invoices · Due Collections · Reports · Analytics ·
Staff · Users · Inventory · Mess · Maintenance · Visitors · Complaints · Documents ·
Notifications · Settings · Audit Logs · Integrations · Billing · Profile.
**Do not simply copy the desktop navigation.**

### DASHBOARD

An executive dashboard: KPIs · revenue · occupancy · outstanding dues · available funds ·
transfers · expenses · collection trends · room occupancy · payment methods · recent activities ·
quick actions · charts. Everything should feel like enterprise software.

### EVERY PAGE

Student list · student profile · room management · payment screen · expense screen · transfer
screen · receipt screen · invoice screen · reports · settings. Do not copy — improve.

### TABLES

Enterprise data grids: column chooser · sorting · filtering · search · bulk actions · exports ·
pinned columns · pagination · responsive · keyboard shortcuts · quick edit · context menu.

### FORMS

Autosave drafts · validation · helpful hints · keyboard navigation · searchable dropdowns ·
grouped fields · progress indicators · contextual help · minimal scrolling.

### REPORTS

Redesign every report. Professional PDF layouts · charts · analytics · export · print optimized ·
modern branding.

### STUDENT PROFILE

A complete workspace: personal details · guardian · payments · due history · receipts · transfers ·
complaints · documents · timeline · activity · notes — everything on one screen.

### ROOM MANAGEMENT

Interactive · visual · drag-and-drop · occupancy colors · status indicators · quick assignment ·
capacity · maintenance.

### PAYMENTS

Enterprise payment workspace: pending dues · history · receipt preview · partial payments ·
discounts · adjustments · refunds · audit trail.

### SETTINGS

Professional admin panel: organization · branches · users · roles · permissions · branding ·
taxes · fees · backup · security · API keys · integrations.

### SECURITY

Enterprise-grade: RBAC · audit logs · JWT · encryption · secure APIs · rate limiting · validation ·
input sanitization.

### CODE QUALITY

Rewrite everything. No legacy architecture. No copied components. No technical debt. Modern
patterns · reusable components · scalable architecture · clean folder structure · SOLID
principles · feature-based organization.

### TECH STACK

**Frontend** — Next.js · TypeScript · Tailwind CSS · shadcn/ui · React Query · React Hook Form ·
Zod · Framer Motion · TanStack Table · Recharts.
**Backend** — Fastify · PostgreSQL · Prisma/Drizzle · Redis · BullMQ · JWT · cloud storage ·
REST APIs · background jobs.

### PERFORMANCE

Fast · optimized · lazy loading · code splitting · caching · optimistic updates · virtualization ·
image optimization · accessibility · SEO where applicable.

### MOBILE

Responsive · tablet optimized · desktop first · works on every screen.

### AI

Design architecture that supports future AI modules. Do not tightly couple the system. Make
future expansion easy.

### FINAL GOAL

When users see Hostyllo, they should never think *"this is the web version of Hostix."* They
should think *"this is a premium enterprise SaaS platform built for modern hostel management."*

The desktop application should only serve as the source of business rules and domain knowledge.
Everything else — architecture, UX, UI, navigation, workflows, and code — must be reimagined from
first principles. Hostyllo should be production-ready, scalable, maintainable, visually
exceptional, and capable of serving thousands of hostels across multiple countries.

---

## STANDING CONSEQUENCES

Things that are now non-negotiable, derived from the above:

1. **No placeholder data ever reaches a screen.** If the API cannot answer it, the component shows
   an empty state — never a plausible-looking invented number. A fake figure is worse than a blank
   one because it cannot be distinguished from a real one.
2. **No fixed content width.** Layouts reflow. `--hs-content-min: 1180px` was the direct cause of
   a clipped dashboard on an ordinary 1366px laptop.
3. **Read the HOSTIX module before building the screen**, not after. The port is the starting
   point of the work, not a validation step at the end.
4. **Light is the product default theme** (owner, 2026-08-05), whatever `DESIGN_RULES.md` says
   about dark-first.
