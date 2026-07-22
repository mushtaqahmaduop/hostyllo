# HOSTYLLO — Documentation Index

**This file is the authoritative map of the doc suite.** The numeric prefixes below contain
historical collisions (two `03_`, two `04_`, etc.) from earlier renumberings — rather than a
risky mass-rename that would break the ~100 existing cross-references (many already stale), this
index is the single source of navigation. Cite docs by **filename**, not by number.

> **Source-of-truth precedence:** for *build state* → `09_BUILD_STATE_v15.md`; for *product
> requirements* → `01_MASTER_PRD_v15.md`; for *agent behaviour* → root `../CLAUDE.md` (deep
> reference `06_CLAUDE_MD_v15.md`); for *current engineering health* →
> `ENGINEERING_AUDIT_ARB_2026-07-22.md`. If any other doc conflicts with these, these win.

## Active documents (23)

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
| `05_API_SPECIFICATION.md` | Endpoint contracts. |
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

### Process, tracking & audits
| Doc | Purpose |
|-----|---------|
| `06_CLAUDE_MD_v15.md` | Deep agent reference (now includes the merged production-readiness addendum). |
| `07_BEGINNER_GUIDE_v15.md` | Onboarding walkthrough. |
| `08_MISSING_SUGGESTED.md` | Gap analysis of the doc suite itself. |
| `09_BUILD_STATE_v15.md` | **Build-state source of truth.** Reconciled each session. |
| `10_ENGINEERING_AUDIT_CRITICAL.md` | Corrected version of the false June audit (kept as a lesson). |
| `ENGINEERING_AUDIT_ARB_2026-07-22.md` | **Latest ARB audit** — 18 reports, C1–C4 + M1–M5 findings, verdict. |

### Number collisions (navigate by filename)
`03_`=FEATURE_MAP + SECURITY_ARCHITECTURE · `04_`=DATABASE_ARCHITECTURE + UX_DESIGN_SYSTEM ·
`05_`=API_SPECIFICATION + ROADMAP · `06_`=CLAUDE_MD_v15 + SAAS_OPERATIONS · `07_`=BEGINNER_GUIDE
+ TENANT_LIFECYCLE · `08_`=AUDIT_COMPLIANCE + MISSING_SUGGESTED · `09_`=BUILD_STATE +
FEATURE_FLAG_ARCHITECTURE · `10_`=ENGINEERING_AUDIT_CRITICAL + OBSERVABILITY_ARCHITECTURE.

Archived/superseded docs live in `_archive/` — see `_archive/README.md`.

## Known doc debt (pass 3)
- Numbering collisions above are disambiguated here rather than physically renumbered (existing
  cross-references are already partly rotted; a mass-rename would add breakage on low-value docs).
- Several docs (`11_BUSINESS_CONTINUITY`, `12_ENTERPRISE_READINESS_ROADMAP`) were authored
  pre-build and describe intent, not implementation — treat as roadmap, not status.
