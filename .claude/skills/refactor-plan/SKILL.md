---
name: refactor-plan
description: Produce a safe, staged refactor plan for HOSTYLLO without changing behavior. Use when code needs restructuring, when reconciling the stale docs against the real code, or before a risky cleanup. Plans only — implementation happens separately, reviewed.
---

# Refactor Plan

Plan a behavior-preserving refactor. Delegate authoring to the `architect` agent for cross-cutting
work. Read the code first — no guessing.

## Principles
- Do not rewrite working systems. Improve and preserve proven behavior (esp. ported Electron logic).
- Smallest change that achieves the goal. Each step independently shippable and testable.
- Never weaken an invariant or a control to simplify. Invariants are fixed points.

## Steps
1. **Map current state** — read the affected files; describe what exists and how it behaves now.
   Where docs disagree with code, the code is ground truth — note the discrepancy.
2. **State the goal** — what improves (maintainability/perf/clarity) and why it's worth it (CTO filter).
3. **Risk assessment** — what could break; which invariants/tests guard it; blast radius.
4. **Staged plan** — ordered steps, each with: change, files, how it's verified, rollback. No big-bang.
5. **Test net** — list the tests that must stay green (payment formula, isolation, auth) and any to add first.

## Output
A numbered plan with per-step verification, the safety net, and an explicit "do NOT touch" list
(withTenant internals, payment formula, RLS policies — change only with full test coverage).

Common first use: reconcile `09_BUILD_STATE_v15.md` and the duplicated invariants across the 28 doc
files into a single source of truth, then fix the known payment defects — staged, each behind its test.
