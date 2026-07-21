# HOSTYLLO Engineering Team — Workspace Guide

This `.claude/` directory turns Claude Code into a structured engineering team for HOSTYLLO.
It is grounded in the v15 doc suite (`docs/docs/`) and the **actual code** in the repo — not assumptions.

## How it loads
- **`/CLAUDE.md`** (repo root) auto-loads every session. It is the behavioral contract: the 6
  invariants, the current ground-truth state, the team roster, and the workflow. No manual pasting.
- **`.claude/agents/*.md`** — specialist subagents. The main thread delegates focused tasks to them.
- **`.claude/skills/*/SKILL.md`** — reusable workflows you (or an agent) invoke with the Skill tool.

## The team (agents)
| Agent | When to use |
|-------|-------------|
| `architect` | System design, scope/phase calls, doc↔code reconciliation, migration strategy, trade-offs |
| `backend` | Fastify routes, auth, services, BullMQ workers (anything in `apps/api` / `packages/db`) |
| `frontend` | Next.js screens & components (`apps/web` / `apps/admin`), design-token fidelity, mobile/a11y |
| `database` | Migrations, RLS, indexes, query performance (`packages/db/migrations`) |
| `security` | Audits vs the 34 risks + 6 invariants; tenant isolation; auth; secrets; PII |
| `devops` | CI/CD, Railway/Vercel/Supabase, env/secrets, observability, releases |
| `qa` | Test strategy, the 14 payment tests, cross-tenant isolation tests, regression |

Architect, security, and database are tuned for deeper reasoning (opus); the implementers run on sonnet.

## The workflows (skills)
`code-review` · `security-audit` · `ui-review` · `database-review` · `deployment-check` · `refactor-plan`

Invoke as e.g. `/code-review` or `/deployment-check`. Each is a concrete checklist tied to HOSTYLLO's
invariants and PRD, so reviews are consistent and don't rely on memory.

## Suggested loop for a unit of work
1. `architect` plans (problem → files → risks → approach) for anything non-trivial.
2. `backend` / `frontend` / `database` implements the smallest correct change.
3. `qa` proves it (relevant unit test + cross-tenant isolation test).
4. `/code-review` (+ `/security-audit` for auth/payment/tenant changes) before merge.
5. `/deployment-check` before any deploy.

## Standing facts every agent must respect
- **The tracker lies.** `docs/docs/09_BUILD_STATE_v15.md` says "nothing built"; the API, schema, and
  services already exist. Always inspect the code; reconciling the tracker is assigned work, not optional.
- **6 invariants are fixed points** (RS256-only · withTenant() everywhere · hostel_id from JWT only ·
  NUMERIC(10,2) money · insert-only audit_log · PITR before prod data). Never weakened to pass a test.
- **Phase discipline:** phases 0–6 active; 7–8 deferred until MRR > PKR 500k/mo + a hire.
- **Port, don't reinvent** the proven Electron business logic.

## Known first tasks (the team's backlog)
1. Reconcile `09_BUILD_STATE_v15.md` to reality; dedupe the invariants (currently copied across 4+ docs)
   into one source; restore the missing PRD Sections 20–34.
2. Fix the payment defects: leftover edit comment, broken `extra_charges` schema/persistence, `PATCH`
   recalculation with hardcoded `[]`, and missing `audit_log` writes.
3. Add a cross-tenant isolation test for every existing endpoint.

*Maintained alongside `/CLAUDE.md`. Update both after any significant architectural change.*
