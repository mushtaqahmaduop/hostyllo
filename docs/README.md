# HOSTYLLO — Documentation Index

**This file is the authoritative map of the doc suite.** The numeric prefixes below contain
historical collisions (two `03_`, two `04_`, etc.) from earlier renumberings. They are still not
physically renumbered — see "Known doc debt" at the bottom for the current reasoning, which
changed on 2026-07-27. Cite docs by **filename**, not by number.

**Every file reference in this suite is now CI-gated.** `scripts/check-doc-links.mjs` resolves
every markdown link and inline `path/to/file` mention across `docs/`, `tasks/`, `.claude/` and the
root `CLAUDE.md`, and fails the build if one does not exist. It was written because a third of them
already didn't: 14 genuinely dead references, including three `docs/docs/` paths left over from the
flattening and four pointers to `tasks/todo.md` / `tasks/lessons.md`, which are named `tasks/todo` <!-- link-check-ignore -->
and `tasks/lessons`. A stale pointer reads exactly like a live one — nothing fails, an agent simply
follows it, finds nothing, and works from memory instead.

> **Source-of-truth precedence:** for *build state* → `09_BUILD_STATE_v15.md`; for *product
> requirements* → `01_MASTER_PRD_v15.md`; for *agent behaviour* → root `../CLAUDE.md` (deep
> reference `06_CLAUDE_MD_v15.md`); for *current engineering health* → `AUDIT_2026-07-27.md`
> (supersedes `ENGINEERING_AUDIT_ARB_2026-07-22.md`, whose C1–C4 and M1–M5 are all closed); for
> *what the API exposes* → `05_API_SPECIFICATION.md` (all 16 modules, reconciled 2026-07-27); for
> *who may call it* → PRD §4.2, enforced by `apps/api/src/lib/roles.ts`. If any other doc conflicts
> with these, these win.

## Active documents (25)

### Product & scope
| Doc | Purpose |
|-----|---------|
| `00_SYSTEM_OVERVIEW.md` | One-page intelligence brief. ⚠️ its build-status line is stale (banner inside). |
| `01_MASTER_PRD_v15.md` | **PRD authority.** Requirements, FR-IDs, scope. |
| `02_PRODUCT_BLUEPRINT.md` | Product narrative / positioning. |
| `03_FEATURE_MAP.md` | Feature → module map. |
| `05_ROADMAP_v15.md` | Phase roadmap (see also the tracker for live status). |

### Architecture & engineering
| Doc | Purpose |
|-----|---------|
| `03_SECURITY_ARCHITECTURE.md` | Auth, RLS, tenant isolation, OWASP, secrets. |
| `04_DATABASE_ARCHITECTURE.md` | 28-table schema, indexes, RLS, migrations. |
| `04_UX_DESIGN_SYSTEM.md` | Design tokens, components (Phase 2, not yet built). |
| `05_API_SPECIFICATION.md` | **Endpoint contracts for all 16 route modules.** Modules 10–17 written from the implementations 2026-07-27; roles reflect PRD §4.2 as enforced by `lib/roles.ts`. |
| `09_FEATURE_FLAG_ARCHITECTURE.md` | Feature-flag design. |
| `10_OBSERVABILITY_ARCHITECTURE.md` | Logging / metrics / tracing design. |

### Operations, compliance & readiness
| Doc | Purpose |
|-----|---------|
| `06_SAAS_OPERATIONS.md` | Ops runbooks. |
| `07_TENANT_LIFECYCLE.md` | Trial → active → dunning → purge lifecycle. |
| `08_AUDIT_COMPLIANCE.md` | Audit-log & PDPA compliance. |
| `11_BUSINESS_CONTINUITY.md` | BCP/DR (largely future-facing). |
| `12_ENTERPRISE_READINESS_ROADMAP.md` | Enterprise-readiness plan (future-facing). |
| `13_PRODUCTION_READINESS.md` | Error catalog, CI pipeline, perf targets. |
| `14_DEPLOYMENT_RUNBOOK.md` | **Production deploy runbook (live).** Stack, env vars, build, the 502/port + db:down/pooler traps, monitoring, failure modes → fixes. |

### Process, tracking & audits
| Doc | Purpose |
|-----|---------|
| `06_CLAUDE_MD_v15.md` | Deep agent reference (now includes the merged production-readiness addendum). |
| `07_BEGINNER_GUIDE_v15.md` | Onboarding walkthrough. |
| `08_MISSING_SUGGESTED.md` | Gap analysis of the doc suite itself. |
| `09_BUILD_STATE_v15.md` | **Build-state source of truth.** Reconciled each session. |
| `10_ENGINEERING_AUDIT_CRITICAL.md` | Corrected version of the false June audit (kept as a lesson). |
| `ENGINEERING_AUDIT_ARB_2026-07-22.md` | ARB audit — 18 reports, C1–C4 + M1–M5. **All closed**; kept for the record. |
| `AUDIT_2026-07-27.md` | **Current engineering health.** Full APIs/platform/docs/repo/code audit: prod migration ledger, prod↔staging schema drift, Fastify EOL (fixed), authorization matrix. |

### Number collisions (navigate by filename)
`03_`=FEATURE_MAP + SECURITY_ARCHITECTURE · `04_`=DATABASE_ARCHITECTURE + UX_DESIGN_SYSTEM ·
`05_`=API_SPECIFICATION + ROADMAP · `06_`=CLAUDE_MD_v15 + SAAS_OPERATIONS · `07_`=BEGINNER_GUIDE
+ TENANT_LIFECYCLE · `08_`=AUDIT_COMPLIANCE + MISSING_SUGGESTED · `09_`=BUILD_STATE +
FEATURE_FLAG_ARCHITECTURE · `10_`=ENGINEERING_AUDIT_CRITICAL + OBSERVABILITY_ARCHITECTURE.

Archived/superseded docs live in `_archive/` — see `_archive/README.md`.

## Known doc debt
- **Numbering collisions are still not renumbered — but the reason has changed.** The original
  argument was risk: a mass-rename would break cross-references that were already partly rotted.
  That risk is now largely gone, because `check-doc-links.mjs` would catch every dangling
  reference a rename produced. What remains is cost against benefit: renaming ~8 files buys unique
  prefixes, while this index already mandates citing by filename, and `09_BUILD_STATE_v15.md` in
  particular is referenced from session notes and external records this repo cannot rewrite. So it
  stays a deliberate decision, not an unresolved one.
- ~~`05_API_SPECIFICATION.md` is 9 of 16 modules.~~ **Closed 2026-07-27** — Modules 10–17 written
  from the route implementations; all 16 modules now specified.
- Several docs (`11_BUSINESS_CONTINUITY`, `12_ENTERPRISE_READINESS_ROADMAP`) were authored
  pre-build and describe intent, not implementation — treat as roadmap, not status.
