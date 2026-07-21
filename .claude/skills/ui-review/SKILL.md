---
name: ui-review
description: Review HOSTYLLO frontend (Next.js) work for design-token fidelity, mobile-first layout, accessibility, and workflow speed against the UX Design System. Use after building or changing screens/components in apps/web or apps/admin.
---

# UI Review

Review against `docs/docs/04_UX_DESIGN_SYSTEM.md` and the design tokens in `CLAUDE.md`. Read the
component code; check rendered behavior at 390px and desktop where possible.

## Steps
1. Identify the screens/components changed.
2. Check each against the checklist. Report **Blocker / High / Medium / Nit** with `file:line` + fix.
3. Verdict: APPROVE / CHANGES REQUIRED.

## Checklist
**Tokens & type:**
- [ ] Uses CSS-variable tokens, not hardcoded hexes (gold `#c9a84c`, teal paid, red pending, amber partial).
- [ ] Figtree body, DM Mono for money/CNIC/numbers, Noto Nastaliq Urdu for Urdu (line-height 2.0).
- [ ] Money rendered via `Intl.NumberFormat('en-PK', {currency:'PKR'})` (lakh format `1,00,000`).

**Mobile-first & speed:**
- [ ] Designed at 390px first; min tap target 44×44px; no horizontal scroll on phone.
- [ ] Daily workflow ≤ 5 interactions (payment recording = 3 steps).
- [ ] Loading = skeleton shimmer matching layout — never a spinner.
- [ ] Empty states: illustration + English + Urdu + CTA (no dead ends).

**Role & a11y:**
- [ ] Role-aware: no actions shown that the current role can't perform.
- [ ] WCAG AA contrast; visible labels (no placeholder-only); ARIA on icon-only buttons; keyboard navigable.
- [ ] RTL handled when Urdu is active.

**Phase:** no Phase-5 features (offline/SQLite) pulled in early; Phase 1–4 is English-first.
