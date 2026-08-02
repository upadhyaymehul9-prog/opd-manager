# Staff Attendance — Production Migration Runbook

Feature branch: `feature/staff-attendance`
Migration: `prisma/migrations/20260802000000_add_staff_attendance/`

---

## Why this runbook exists

The production database was never initialized via Prisma migrations — there is no
`_prisma_migrations` table. This means `prisma migrate deploy` alone will not work
correctly on first run; it needs the migration applied first, then registered.

This one-time baseline procedure applies **only for the very first migration**
(`20260802000000_add_staff_attendance`). All subsequent migrations after this one
can use `prisma migrate deploy` normally.

---

## Production deployment steps

Run these two commands after merging `feature/staff-attendance` to `main` and
setting `DATABASE_URL` to the production connection string:

**Step 1 — Apply the migration SQL directly:**
```bash
npx prisma db execute --url "$DATABASE_URL" \
  --file prisma/migrations/20260802000000_add_staff_attendance/migration.sql
```

This creates the `staff_attendance` table and its two indexes. It also creates
the `_prisma_migrations` table if it does not yet exist. The migration SQL is
additive-only — it does not touch any existing tables.

**Step 2 — Register the migration as applied:**
```bash
npx prisma migrate resolve --applied 20260802000000_add_staff_attendance
```

This writes a record into `_prisma_migrations` so Prisma knows this migration
has been applied. Without this step, `prisma migrate deploy` would try to
re-apply it and fail with a "table already exists" error.

---

## After these two steps

Production is in a fully initialized Prisma-migrations state. All future
migrations follow the standard process:
- Local dev: `prisma migrate dev`
- Production/Vercel deploy: `prisma migrate deploy`

---

## Known schema drift — `visit_radiology_orders`

The production database contains a table `visit_radiology_orders` that is **not**
present in `prisma/schema.prisma`. This is pre-existing schema drift that predates
the staff-attendance feature.

- **Status:** Orphaned. Not referenced by any Prisma model. Not touched by this
  feature's migration (the additive-only SQL does not include a DROP).
- **Risk:** Any future `prisma migrate diff --from-url` command will include
  `DROP TABLE "visit_radiology_orders"` in its output — it must be manually
  removed from the generated SQL before applying, exactly as was done for this
  migration.
- **Recommended action:** Investigate whether the table is still in use. If it is
  safe to drop, create a dedicated migration (`drop_visit_radiology_orders`) so
  the removal is intentional and reviewed. If it must be kept, add a placeholder
  `view` or comment in schema.prisma to document it and prevent repeated
  confusion.
