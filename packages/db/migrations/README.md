# Migrations

Applied by the runner in `../migrate.mjs` (audit M3), which keeps a `schema_migrations`
ledger so each file runs exactly once, in order, inside its own transaction.

```bash
# from packages/db (DATABASE_URL must be the privileged/owner connection, not hostyllo_app)
pnpm migrate:status     # show applied vs pending
pnpm migrate            # apply all pending
```

## First run against a DB that was already migrated by hand

Migrations `001–009` were applied manually before the runner existed. On that database, record
them as applied **without re-running** (they are not all idempotent), then apply the rest:

```bash
pnpm migrate:baseline   # marks every current file as applied — runs no SQL
# then, for anything added later:
pnpm migrate
```

## Rules

- **Never edit a migration after it has been applied anywhere.** The runner stores a checksum and
  will warn on drift, but the live DB keeps the old version — add a new migration instead.
- New migrations should be idempotent where practical (`IF NOT EXISTS`, `DROP … IF EXISTS` before
  `CREATE`) so a partial failure can be re-run cleanly.
- Migration `010` must be applied on the live DB to activate FORCE-RLS tenant isolation (audit C1);
  see the founder steps at the bottom of `010_force_rls_and_app_role.sql`.
