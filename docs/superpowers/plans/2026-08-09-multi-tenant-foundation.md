# Multi-Tenant Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert opd-manager from one-deployment-per-clinic to a single shared deployment that serves many clinics, with Postgres Row-Level Security guaranteeing one clinic can never read another's data.

**Architecture:** One Neon Postgres database, one Vercel deployment. Every tenant table gets a `clinic_id` column. A Prisma Client Extension sets a Postgres session variable (`app.clinic_id`) on every request; Postgres RLS policies (with `FORCE ROW LEVEL SECURITY`, so even the connecting role can't bypass them) enforce that a query only ever sees rows for that variable's clinic. Next.js middleware resolves the clinic from the request's subdomain and puts `clinicId` on the session JWT.

**Tech Stack:** Next.js 16, Prisma 6, PostgreSQL (Neon), Vitest.

## Global Constraints

- The current production database contains test/seed data only (confirmed with the user) — no live-migration/backfill logic is needed; local and prod databases are reset and reseeded as part of this plan.
- No new Postgres role is provisioned. `FORCE ROW LEVEL SECURITY` makes policies apply even to the table owner (the same role the app already connects as via `DATABASE_URL`), so a second `app_user` role is unnecessary — see Task 3.
- This plan produces a working single clinic (clinic #1) running correctly on the new multi-tenant substrate. Self-serve signup and the Clinic Settings customization UI are separate follow-on plans (per the design spec's "Out of scope" section) — do not build them here.
- Follow existing conventions: migrations are tracked, hand-editable Prisma migration SQL files (see `prisma/migrations/20260808010000_add_billing_hsn_discount_void/migration.sql` for style); tests are pure Vitest with no mocks, no live DB (`src/lib/__tests__/*.test.ts`); npm scripts use `dotenv -e .env.local --` to load local env vars.
- Reference spec: `docs/superpowers/specs/2026-08-09-multi-tenant-foundation-design.md`.

---

## Task 1: `Clinic` model + slug validation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/clinic-slug.ts`
- Test: `src/lib/__tests__/clinic-slug.test.ts`

**Interfaces:**
- Produces: `isValidClinicSlug(slug: string): boolean`, `RESERVED_CLINIC_SLUGS: readonly string[]` — used by Task 8's seed script and by the future signup plan.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/clinic-slug.test.ts
import { describe, it, expect } from "vitest";
import { isValidClinicSlug, RESERVED_CLINIC_SLUGS } from "@/lib/clinic-slug";

describe("isValidClinicSlug", () => {
  it("accepts lowercase alphanumeric with hyphens", () => {
    expect(isValidClinicSlug("sunrise-clinic")).toBe(true);
    expect(isValidClinicSlug("apollo2")).toBe(true);
  });

  it("rejects uppercase, spaces, and underscores", () => {
    expect(isValidClinicSlug("Sunrise")).toBe(false);
    expect(isValidClinicSlug("sun rise")).toBe(false);
    expect(isValidClinicSlug("sun_rise")).toBe(false);
  });

  it("rejects leading or trailing hyphens", () => {
    expect(isValidClinicSlug("-sunrise")).toBe(false);
    expect(isValidClinicSlug("sunrise-")).toBe(false);
  });

  it("rejects slugs shorter than 3 or longer than 63 characters", () => {
    expect(isValidClinicSlug("ab")).toBe(false);
    expect(isValidClinicSlug("a".repeat(64))).toBe(false);
    expect(isValidClinicSlug("a".repeat(63))).toBe(true);
  });

  it("rejects reserved words", () => {
    for (const reserved of RESERVED_CLINIC_SLUGS) {
      expect(isValidClinicSlug(reserved)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/clinic-slug.test.ts`
Expected: FAIL — `Cannot find module '@/lib/clinic-slug'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/clinic-slug.ts
export const RESERVED_CLINIC_SLUGS = [
  "www", "api", "app", "admin", "static", "assets", "mail", "ftp",
  "login", "signup", "help", "support", "docs", "blog", "status",
] as const;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidClinicSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 63) return false;
  if (!SLUG_PATTERN.test(slug)) return false;
  if ((RESERVED_CLINIC_SLUGS as readonly string[]).includes(slug)) return false;
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/clinic-slug.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Add the `Clinic` model to the schema**

In `prisma/schema.prisma`, add this model. Place it right before `model Patient {` (it's the natural anchor point — every other model will reference it):

```prisma
model Clinic {
  id         String   @id @default(uuid()) @db.Uuid
  slug       String   @unique
  name       String
  status     String   @default("trial") // trial | active | suspended
  plan       String?
  created_at DateTime @default(now()) @db.Timestamptz(6)

  @@map("clinics")
}
```

Do not add back-relation fields yet — Task 2 adds every `clinic_id` field and its matching back-relation array in one pass, so `prisma validate` stays green at every step of this task list without half-finished relations in between.

- [ ] **Step 6: Generate the migration**

Run: `npx dotenv -e .env.local -- npx prisma migrate dev --name add_clinic_model`
Expected: Migration created and applied; `clinics` table exists with no rows.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/clinic-slug.ts src/lib/__tests__/clinic-slug.test.ts
git commit -m "feat: add Clinic model and slug validation"
```

---

## Task 2: `clinic_id` on every tenant table

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: `Clinic` model from Task 1.
- Produces: every tenant model now has a required `clinic_id String @db.Uuid` field and a `clinic Clinic @relation(...)` — Task 3's RLS policies and Task 5's Prisma extension both depend on this column existing on every table it protects.

This task has three parts: (A) the uniform additive block applied to 27 "plain" tables, (B) six models that need structural changes (singleton-by-`"default"` → per-clinic, or a composite key), and (C) four `@unique` constraints that must become clinic-scoped composite uniques.

### Part A — uniform block

For **each** of the following models, add these three lines inside the model body (position: right after the model's existing `id` field), and add the matching `clinic Clinic @relation(fields: [clinic_id], references: [id], onDelete: Restrict)` line near the model's other relation fields:

```prisma
  clinic_id String @db.Uuid
```
```prisma
  clinic    Clinic @relation(fields: [clinic_id], references: [id], onDelete: Restrict)
```
```prisma
  @@index([clinic_id])
```

Apply this identical three-piece block to: `Patient`, `MlcRecord`, `MlcRecordRevision`, `Doctor`, `PatientVisit`, `RoiRelease`, `VisitEmrRevision`, `Medicine`, `StockBatch`, `StockWriteOff`, `StockAudit`, `StockAuditLine`, `Prescription`, `PrescriptionItem`, `PharmacyBill`, `PharmacyBillItem`, `VisitProcedure`, `Appointment`, `ConsultationTemplate`, `AuditLog`, `PatientConsent`, `IncidentReport`, `PatientFeedback`, `LabTestCatalog`, `VisitLabTest`, `StaffAttendance`. (`User` is handled in Part C, since its unique constraint also changes.)

`onDelete: Restrict` on every one of these — a clinic is suspended (status flip on the `Clinic` row), never cascade-deleted, so historical clinical/financial records can never vanish via a cascading delete.

### Part B — structural changes (singleton and composite-key models)

Replace these six models in full:

```prisma
model PatientRegistry {
  clinic_id   String @id @db.Uuid
  clinic      Clinic @relation(fields: [clinic_id], references: [id], onDelete: Restrict)
  last_number Int    @default(0)

  @@map("patient_registry")
}

model MlcRegistry {
  clinic_id   String @id @db.Uuid
  clinic      Clinic @relation(fields: [clinic_id], references: [id], onDelete: Restrict)
  last_number Int    @default(0)

  @@map("mlc_registry")
}

model ConsultationBillCounter {
  clinic_id String @id @db.Uuid
  clinic    Clinic @relation(fields: [clinic_id], references: [id], onDelete: Restrict)
  last_no   Int    @default(0)

  @@map("consultation_bill_counter")
}

model DailyToken {
  clinic_id  String   @db.Uuid
  visit_date DateTime @db.Date
  last_token Int      @default(0)
  clinic     Clinic   @relation(fields: [clinic_id], references: [id], onDelete: Restrict)

  @@id([clinic_id, visit_date])
  @@map("daily_tokens")
}

model PharmacyBillCounter {
  clinic_id String   @db.Uuid
  bill_date DateTime @db.Date
  last_no   Int      @default(0)
  clinic    Clinic   @relation(fields: [clinic_id], references: [id], onDelete: Restrict)

  @@id([clinic_id, bill_date])
  @@map("pharmacy_bill_counter")
}

/// One row per clinic. Operational settings, branding, and feature toggles
/// consumed by the (future) Clinic Settings admin page; today only the
/// operational fields (already existed) and defaults are read.
model ClinicSettings {
  clinic_id              String  @id @db.Uuid
  clinic                 Clinic  @relation(fields: [clinic_id], references: [id], onDelete: Cascade)

  slot_duration_minutes  Int     @default(15)
  opd_start_hour         Int     @default(9)
  opd_end_hour           Int     @default(18)
  gst_rate_percent       Decimal @default(12) @db.Decimal(5, 2)
  bill_number_prefix     String  @default("BILL")
  mlc_consent_text       String?

  display_name           String
  logo_url               String?
  primary_color          String  @default("#0f766e")

  radiology_enabled        Boolean @default(true)
  mlc_enabled               Boolean @default(true)
  pharmacy_billing_enabled Boolean @default(true)

  @@map("clinic_settings")
}
```

`ClinicSettings` uses `onDelete: Cascade` (unlike everything else in this task) — it is pure configuration with no independent meaning once its clinic is gone, unlike clinical or financial records.

### Part C — unique constraints that must become clinic-scoped

- [ ] In `Patient`: change `patient_number Int @unique` to `patient_number Int` and add `@@unique([clinic_id, patient_number])` to the model's attribute block. **Leave `abha_id String? @unique` exactly as-is** — India's ABHA health ID is a national identifier, correctly unique across all clinics, not per-clinic.
- [ ] In `MlcRecord`: change `casualty_number Int @unique` to `casualty_number Int` and add `@@unique([clinic_id, casualty_number])`.
- [ ] In `PatientVisit`: change `consultation_bill_no String? @unique` to `consultation_bill_no String?` and add `@@unique([clinic_id, consultation_bill_no])`.
- [ ] In `PharmacyBill`: change `bill_no String @unique` to `bill_no String` and add `@@unique([clinic_id, bill_no])`.
- [ ] In `Appointment`: change `external_ref String? @unique` to `external_ref String?` and add `@@unique([clinic_id, external_ref])`.
- [ ] In `User`: change `username String @unique` to `username String`, add the Part A three-piece block (`clinic_id`, `clinic` relation, `@@index([clinic_id])`), and add `@@unique([clinic_id, username])`.

### Finish the task

- [ ] **Step: Add back-relation array/object fields to `Clinic`**

Add these fields inside `model Clinic { ... }` (after `created_at`), so every relation declared above has its required reverse side:

```prisma
  patients                 Patient[]
  patient_registry         PatientRegistry?
  mlc_registry             MlcRegistry?
  mlc_records               MlcRecord[]
  mlc_record_revisions     MlcRecordRevision[]
  doctors                  Doctor[]
  users                    User[]
  patient_visits           PatientVisit[]
  roi_releases             RoiRelease[]
  visit_emr_revisions      VisitEmrRevision[]
  daily_tokens             DailyToken[]
  medicines                Medicine[]
  stock_batches            StockBatch[]
  stock_write_offs         StockWriteOff[]
  stock_audits             StockAudit[]
  stock_audit_lines        StockAuditLine[]
  consultation_bill_counter ConsultationBillCounter?
  pharmacy_bill_counters   PharmacyBillCounter[]
  prescriptions            Prescription[]
  prescription_items       PrescriptionItem[]
  pharmacy_bills           PharmacyBill[]
  pharmacy_bill_items      PharmacyBillItem[]
  visit_procedures         VisitProcedure[]
  clinic_settings          ClinicSettings?
  appointments             Appointment[]
  consultation_templates   ConsultationTemplate[]
  audit_logs               AuditLog[]
  patient_consents         PatientConsent[]
  incident_reports         IncidentReport[]
  patient_feedback         PatientFeedback[]
  lab_test_catalog         LabTestCatalog[]
  visit_lab_tests          VisitLabTest[]
  staff_attendance         StaffAttendance[]
```

- [ ] **Step: Validate the schema**

Run: `npx dotenv -e .env.local -- npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀` — this catches any relation missing its reverse side before you try to generate a migration.

- [ ] **Step: Generate the migration**

Run: `npx dotenv -e .env.local -- npx prisma migrate dev --name add_clinic_id_to_all_tables`

Prisma will report this as requiring data loss on several columns (dropping the old `"default"`-keyed primary keys, changing unique constraints). This is expected and acceptable — confirm/accept the prompt. There is no data to lose (test data only, per the Global Constraints).

- [ ] **Step: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add clinic_id to every tenant table, scope unique constraints per clinic"
```

---

## Task 3: Enable Postgres Row-Level Security

**Files:**
- Create: `prisma/migrations/<timestamp>_enable_rls/migration.sql`
- Test: `src/lib/__tests__/rls-isolation.test.ts` (requires a real database connection — see note below)

**Interfaces:**
- Consumes: `clinic_id` columns from Task 2.
- Produces: every tenant table now rejects reads/writes that don't match the session's `app.clinic_id` setting. Task 4's Prisma extension is the only thing that sets that setting — this task's test sets it directly via raw SQL to prove the policies work independent of the extension.

- [ ] **Step 1: Generate an empty migration to hand-write**

Run: `npx dotenv -e .env.local -- npx prisma migrate dev --create-only --name enable_rls`

This creates an empty `migration.sql` file — Prisma has no schema syntax for RLS, so this migration is entirely hand-written raw SQL.

- [ ] **Step 2: Write the RLS policy SQL**

Open the generated `prisma/migrations/<timestamp>_enable_rls/migration.sql` and replace its contents with (list every table that got a `clinic_id` column in Task 2 — this is the complete list, 32 tables):

```sql
-- Row-Level Security: every tenant table only exposes rows matching the
-- current session's app.clinic_id setting (set per-request by the Prisma
-- Client Extension in src/lib/tenant.ts). FORCE ROW LEVEL SECURITY means
-- this applies even to the table owner (the role DATABASE_URL connects as)
-- -- by default Postgres exempts table owners from RLS, which would make
-- these policies decorative without it.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'patients', 'patient_registry', 'mlc_registry', 'mlc_records',
    'mlc_record_revisions', 'doctors', 'users', 'patient_visits',
    'roi_releases', 'visit_emr_revisions', 'daily_tokens', 'medicines',
    'stock_batches', 'stock_write_offs', 'stock_audits', 'stock_audit_lines',
    'consultation_bill_counter', 'pharmacy_bill_counter', 'prescriptions',
    'prescription_items', 'pharmacy_bills', 'pharmacy_bill_items',
    'visit_procedures', 'clinic_settings', 'appointments',
    'consultation_templates', 'audit_logs', 'patient_consents',
    'incident_reports', 'patient_feedback', 'lab_test_catalog',
    'visit_lab_tests', 'staff_attendance'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (clinic_id = current_setting(''app.clinic_id'', true)::uuid)',
      t
    );
  END LOOP;
END $$;
```

`current_setting('app.clinic_id', true)` — the `true` second argument means "missing setting returns NULL instead of raising an error." Combined with the policy comparing to a UUID column, a request that never set `app.clinic_id` sees zero rows on every tenant table (fails closed), rather than crashing the query.

- [ ] **Step 3: Apply the migration**

Run: `npx dotenv -e .env.local -- npx prisma migrate dev`
Expected: The `enable_rls` migration applies cleanly.

- [ ] **Step 4: Write the failing isolation test**

This test needs a real Postgres connection (RLS is a database-level feature — it cannot be tested against mocks). It uses `prisma.$executeRawUnsafe` to set the session variable directly, bypassing the not-yet-built Task 4 extension, so it proves the *policies* work in isolation.

```ts
// src/lib/__tests__/rls-isolation.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let clinicAId: string;
let clinicBId: string;

beforeAll(async () => {
  const clinicA = await prisma.clinic.create({
    data: { slug: "rls-test-a", name: "RLS Test Clinic A" },
  });
  const clinicB = await prisma.clinic.create({
    data: { slug: "rls-test-b", name: "RLS Test Clinic B" },
  });
  clinicAId = clinicA.id;
  clinicBId = clinicB.id;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET app.clinic_id = '${clinicAId}'`);
    await tx.doctor.create({
      data: { clinic_id: clinicAId, name: "Dr. A", room_number: "1" },
    });
  });
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET app.clinic_id = '${clinicBId}'`);
    await tx.doctor.create({
      data: { clinic_id: clinicBId, name: "Dr. B", room_number: "1" },
    });
  });
});

afterAll(async () => {
  // Deleting the clinics cascades nothing (onDelete: Restrict on doctors),
  // so clean up the doctors first, then the clinics, bypassing RLS by
  // setting each clinic_id in turn.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET app.clinic_id = '${clinicAId}'`);
    await tx.doctor.deleteMany({ where: { clinic_id: clinicAId } });
  });
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET app.clinic_id = '${clinicBId}'`);
    await tx.doctor.deleteMany({ where: { clinic_id: clinicBId } });
  });
  await prisma.clinic.deleteMany({ where: { id: { in: [clinicAId, clinicBId] } } });
  await prisma.$disconnect();
});

describe("Postgres RLS tenant isolation", () => {
  it("a session scoped to clinic A cannot see clinic B's rows", async () => {
    const doctors = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET app.clinic_id = '${clinicAId}'`);
      return tx.doctor.findMany();
    });
    expect(doctors.every((d) => d.clinic_id === clinicAId)).toBe(true);
    expect(doctors.some((d) => d.clinic_id === clinicBId)).toBe(false);
  });

  it("a session with no app.clinic_id set sees zero rows (fail closed)", async () => {
    const doctors = await prisma.$transaction(async (tx) => {
      return tx.doctor.findMany();
    });
    expect(doctors).toHaveLength(0);
  });

  it("a session scoped to clinic A cannot write a row claiming clinic B's id", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET app.clinic_id = '${clinicAId}'`);
        await tx.doctor.create({
          data: { clinic_id: clinicBId, name: "Sneaky", room_number: "9" },
        });
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 5: Exclude this test from the default CI run, run it manually against a real database**

This test needs `DATABASE_URL` pointing at a real Postgres with the RLS migration applied — CI's `DATABASE_URL` (`postgresql://ci:ci@localhost:5432/ci`, see `.github/workflows/ci.yml`) has no such database behind it, and none of the other 99 existing tests touch Prisma at all (confirmed: `grep -rl "prisma\." src/lib/__tests__/` returns nothing). Keep it that way — add this one file to Vitest's exclude list so `npm test` (used by CI) stays DB-free, and run this specific test manually against your local Neon dev database instead.

In `vitest.config.ts`, add an `exclude`:

```ts
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/rls-isolation.test.ts", "node_modules/**"],
  },
  ...
});
```

- [ ] **Step 6: Run the isolation test manually against your local dev database**

Run: `npx dotenv -e .env.local -- npx vitest run src/lib/__tests__/rls-isolation.test.ts --config vitest.config.ts --no-config`

Actually — Vitest's `exclude` will skip it even here. Run it directly instead: `npx dotenv -e .env.local -- npx vitest run src/lib/__tests__/rls-isolation.test.ts --exclude ""`
Expected: 3 tests PASS. If the "fail closed" test fails (returns clinic B's doctor, or any doctor, with no `app.clinic_id` set), stop — the `FORCE ROW LEVEL SECURITY` or policy SQL is wrong; do not proceed to Task 4 until this passes.

- [ ] **Step 7: Run the full non-DB suite to confirm nothing else broke**

Run: `npm test`
Expected: 99 tests still pass (this task didn't touch application code, only the schema/migration and one excluded test file).

- [ ] **Step 8: Commit**

```bash
git add prisma/migrations vitest.config.ts src/lib/__tests__/rls-isolation.test.ts
git commit -m "feat: enable Postgres RLS with FORCE ROW LEVEL SECURITY on every tenant table"
```

---

## Task 4: Prisma Client Extension for tenant scoping

**Files:**
- Create: `src/lib/tenant.ts`
- Modify: `src/lib/prisma.ts`
- Test: manual (this extension is exercised end-to-end by Task 3's isolation test pattern; a pure unit test would need to mock `$transaction`, which doesn't prove anything about the real Postgres session-variable behavior — verified instead in Task 9's end-to-end check)

**Interfaces:**
- Consumes: nothing new (wraps the existing `prisma` client from `src/lib/prisma.ts`).
- Produces: `withClinicScope(clinicId: string)` — returns a Prisma client whose every query runs inside a transaction with `app.clinic_id` set. Every future route handler that reads/writes tenant data calls this instead of using `prisma` directly. Task 6/route handlers (outside this plan's scope, since existing routes aren't being rewritten here — see note in Step 3) will adopt it incrementally.

- [ ] **Step 1: Write `withClinicScope`**

```ts
// src/lib/tenant.ts
import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Runs `fn` with a Prisma client scoped to one clinic: every query inside
 * `fn` executes in a transaction that has already set the Postgres session
 * variable the RLS policies check (see the enable_rls migration). This is
 * the only supported way to touch tenant data -- it's not possible to
 * "forget" the clinic filter, because there is no clinic-unaware path.
 */
export async function withClinicScope<T>(
  clinicId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.clinic_id = '${clinicId}'`,
    );
    return fn(tx);
  });
}
```

`SET LOCAL` (not plain `SET`) scopes the setting to the current transaction only — it automatically reverts on commit or rollback, so it can never leak into a later query on a reused pooled connection. Interpolating `clinicId` directly is safe here specifically because `clinicId` always originates from `session.clinicId`, itself decoded from a signed JWT (see Task 6) — never from raw request input — but as a second layer of defense, validate it's a UUID shape before use:

- [ ] **Step 2: Add UUID validation**

```ts
// src/lib/tenant.ts (add above withClinicScope)
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidClinicId(clinicId: string): boolean {
  return UUID_PATTERN.test(clinicId);
}
```

And guard the top of `withClinicScope`:

```ts
export async function withClinicScope<T>(
  clinicId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!isValidClinicId(clinicId)) {
    throw new Error(`withClinicScope: invalid clinicId "${clinicId}"`);
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.clinic_id = '${clinicId}'`);
    return fn(tx);
  });
}
```

- [ ] **Step 3: Write the unit test for the validation guard**

```ts
// src/lib/__tests__/tenant.test.ts
import { describe, it, expect } from "vitest";
import { isValidClinicId, withClinicScope } from "@/lib/tenant";

describe("isValidClinicId", () => {
  it("accepts a well-formed UUID", () => {
    expect(isValidClinicId("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
  });

  it("rejects non-UUID strings", () => {
    expect(isValidClinicId("'; DROP TABLE clinics; --")).toBe(false);
    expect(isValidClinicId("not-a-uuid")).toBe(false);
    expect(isValidClinicId("")).toBe(false);
  });
});

describe("withClinicScope", () => {
  it("rejects an invalid clinicId before touching the database", async () => {
    await expect(
      withClinicScope("not-a-uuid", async () => "unreachable"),
    ).rejects.toThrow(/invalid clinicId/);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/__tests__/tenant.test.ts`
Expected: PASS (3 tests) — the second describe block's test doesn't need a real database, since it throws before calling `prisma.$transaction`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenant.ts src/lib/__tests__/tenant.test.ts
git commit -m "feat: add withClinicScope Prisma extension for RLS-backed tenant scoping"
```

**Note on adoption scope:** this task only builds `withClinicScope`. Migrating every existing route handler in `src/app/api/**` from `prisma.<model>` to `withClinicScope(session.clinicId, (tx) => tx.<model>...)` is mechanical but touches ~50 files — that migration happens in Task 9, batched together with the reseed-and-verify pass, so it can be tested end-to-end against a real multi-clinic database rather than file-by-file against nothing.

---

## Task 5: Thread `clinicId` through per-clinic counters

**Files:**
- Modify: `src/lib/patients.ts`, `src/lib/consultation-billing.ts`, `src/lib/mlc.ts`, `src/lib/tokens.ts`, `src/lib/billing.ts`, `src/lib/appointments.ts`

**Interfaces:**
- Consumes: the six restructured counter/settings models from Task 2 (`PatientRegistry`, `ConsultationBillCounter`, `MlcRegistry`, `DailyToken`, `PharmacyBillCounter`, `ClinicSettings`), all now keyed (fully or partly) by `clinic_id`.
- Produces: `nextPatientNumber(tx, clinicId)`, `nextConsultationBillNo(tx, clinicId)`, `nextCasualtyNumber(tx, clinicId)`, `nextTokenNumber(clinicId)`, `generateBillNo(tx, clinicId)`, `getClinicSchedule(clinicId)` — new signatures. Every call site of these six functions (route handlers, out of this task's file list but touched here since the signature change is a compile error otherwise) is updated in Step 6.

These six functions currently read/write a single hardcoded `"default"`-keyed row. After Task 2's migration, that row no longer exists (the primary key is now `clinic_id`, or a composite including it) — every one of these functions must take a `clinicId` and use it in the `where`/`create`.

- [ ] **Step 1: Update `nextPatientNumber`**

```ts
// src/lib/patients.ts — replace the existing nextPatientNumber
export async function nextPatientNumber(tx: Tx, clinicId: string): Promise<number> {
  const row = await tx.patientRegistry.upsert({
    where: { clinic_id: clinicId },
    create: { clinic_id: clinicId, last_number: 1 },
    update: { last_number: { increment: 1 } },
  });
  return row.last_number;
}
```

- [ ] **Step 2: Update `nextConsultationBillNo`**

```ts
// src/lib/consultation-billing.ts — replace the existing nextConsultationBillNo
export async function nextConsultationBillNo(tx: Tx, clinicId: string): Promise<string> {
  const row = await tx.consultationBillCounter.upsert({
    where: { clinic_id: clinicId },
    create: { clinic_id: clinicId, last_no: 1 },
    update: { last_no: { increment: 1 } },
  });
  const year = new Date().getFullYear();
  return `CON-${year}-${String(row.last_no).padStart(5, "0")}`;
}
```

- [ ] **Step 3: Update `nextCasualtyNumber`**

```ts
// src/lib/mlc.ts — replace the existing nextCasualtyNumber
export async function nextCasualtyNumber(tx: Tx, clinicId: string): Promise<number> {
  const row = await tx.mlcRegistry.upsert({
    where: { clinic_id: clinicId },
    create: { clinic_id: clinicId, last_number: 1 },
    update: { last_number: { increment: 1 } },
  });
  return row.last_number;
}
```

- [ ] **Step 4: Update `nextTokenNumber`**

```ts
// src/lib/tokens.ts — replace the existing nextTokenNumber
import { prisma } from "@/lib/prisma";
import { istDateOnly } from "@/lib/date-range";

export async function nextTokenNumber(clinicId: string): Promise<number> {
  const visitDate = istDateOnly();
  const row = await prisma.dailyToken.upsert({
    where: { clinic_id_visit_date: { clinic_id: clinicId, visit_date: visitDate } },
    create: { clinic_id: clinicId, visit_date: visitDate, last_token: 1 },
    update: { last_token: { increment: 1 } },
  });
  return row.last_token;
}
```

`clinic_id_visit_date` is Prisma's auto-generated compound-key field name for `@@id([clinic_id, visit_date])` — `<field1>_<field2>` joined with underscores, in schema declaration order.

- [ ] **Step 5: Update `generateBillNo`**

```ts
// src/lib/billing.ts — replace the existing generateBillNo
export async function generateBillNo(tx: Tx, clinicId: string): Promise<string> {
  const today = istDateOnly();
  const row = await tx.pharmacyBillCounter.upsert({
    where: { clinic_id_bill_date: { clinic_id: clinicId, bill_date: today } },
    create: { clinic_id: clinicId, bill_date: today, last_no: 1 },
    update: { last_no: { increment: 1 } },
  });
  return formatPharmacyBillNo(today, row.last_no);
}
```

- [ ] **Step 6: Update `getClinicSchedule`**

```ts
// src/lib/appointments.ts — replace the existing getClinicSchedule
export async function getClinicSchedule(clinicId: string): Promise<ClinicSchedule> {
  const row = await prisma.clinicSettings.findUnique({
    where: { clinic_id: clinicId },
  });
  return row ?? DEFAULT_SCHEDULE;
}
```

- [ ] **Step 7: Update every call site**

Run: `npx tsc --noEmit` and fix each resulting error by threading `session.clinicId` (available in every authenticated route handler via `requireApi`/`getSessionFromCookies`, see `src/lib/api-guard.ts`) into the call. The call sites are:

- `src/app/api/patients/route.ts` — `nextTokenNumber()` → `nextTokenNumber(session.clinicId)`, and wherever `nextPatientNumber(tx)` is called inside the same file's transaction → `nextPatientNumber(tx, session.clinicId)`.
- `src/app/api/appointments/[id]/arrive/route.ts` — `nextTokenNumber()` → `nextTokenNumber(session.clinicId)`.
- Wherever `nextConsultationBillNo(tx)`, `nextCasualtyNumber(tx)`, and `generateBillNo(tx)` are called (consultation-payment and MLC and pharmacy-billing route handlers — `tsc --noEmit` will point at the exact files) → add `, session.clinicId`.
- Wherever `getClinicSchedule()` is called (appointment slot-generation routes) → `getClinicSchedule(session.clinicId)`.

`session.clinicId` does not exist yet at this point in the plan — Task 6 adds it to `SessionPayload`. Do Task 6 before this step if working through the plan strictly in order; otherwise use `session.clinicId` here and let the type error persist until Task 6 lands (both tasks are typically done in the same sitting for this reason — flag this dependency to whoever picks up Task 5 if done separately).

- [ ] **Step 8: Type-check and run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no errors, 99+ tests pass (this task's own signature changes have no dedicated new tests — the format/business-logic tests for `formatPharmacyBillNo` etc. already exist and are untouched, since only the counter *lookup key* changed, not the number formatting).

- [ ] **Step 9: Commit**

```bash
git add src/lib/patients.ts src/lib/consultation-billing.ts src/lib/mlc.ts src/lib/tokens.ts src/lib/billing.ts src/lib/appointments.ts src/app/api
git commit -m "feat: scope per-clinic sequence counters (patient/casualty/bill/token numbers) by clinic_id"
```

---

## Task 6: `clinicId` on the session, login scoped per clinic

**Files:**
- Modify: `src/lib/auth-types.ts`, `src/lib/auth.ts`, `src/app/api/auth/login/route.ts`
- Test: `src/lib/__tests__/auth-access.test.ts`, `src/lib/__tests__/api-guard.test.ts` (existing files — extend, don't replace)

**Interfaces:**
- Produces: `SessionPayload.clinicId: string` — every session everywhere in the app now carries this. Task 7's middleware resolves it at login time from the subdomain.

- [ ] **Step 1: Add `clinicId` to `SessionPayload`**

```ts
// src/lib/auth-types.ts
export type SessionPayload = {
  userId: string;
  username: string;
  role: UserRole;
  displayName: string | null;
  doctorId: string | null;
  mustChangePassword: boolean;
  clinicId: string;
};
```

- [ ] **Step 2: Fix the resulting compile errors in the existing test fixtures**

Run: `npx tsc --noEmit` — it will point at two object literals missing `clinicId`.

```ts
// src/lib/__tests__/auth-access.test.ts — inside sessionFor(), add clinicId
function sessionFor(role: UserRole, doctorId: string | null = null): SessionPayload {
  return {
    userId: "u1",
    clinicId: "11111111-1111-1111-1111-111111111111",
    // ...rest of the existing fields unchanged
  };
}
```

```ts
// src/lib/__tests__/api-guard.test.ts — add clinicId to both the `doctor` literal and makeSession()
const doctor: SessionPayload = {
  userId: "u1",
  clinicId: "11111111-1111-1111-1111-111111111111",
  // ...rest of the existing fields unchanged
};

const makeSession = (role: SessionPayload["role"]): SessionPayload => ({
  userId: "u1",
  clinicId: "11111111-1111-1111-1111-111111111111",
  // ...rest of the existing fields unchanged
});
```

- [ ] **Step 3: Propagate `clinicId` through session creation and verification**

```ts
// src/lib/auth.ts — verifySessionToken, inside the returned object
return {
  userId: String(payload.userId),
  username: String(payload.username),
  role: payload.role as UserRole,
  displayName: payload.displayName ? String(payload.displayName) : null,
  doctorId: payload.doctorId ? String(payload.doctorId) : null,
  mustChangePassword: Boolean(payload.mustChangePassword),
  clinicId: String(payload.clinicId),
};
```

`createSessionToken` needs no change — it already spreads `...payload` into the signed JWT, so `clinicId` rides along automatically once callers include it (Step 4).

- [ ] **Step 4: Scope login to `(clinic_id, username)`**

```ts
// src/app/api/auth/login/route.ts
// Replace: const user = await prisma.user.findUnique({ where: { username } });
// The clinic is resolved from the subdomain by middleware (Task 7) and
// forwarded as a request header -- read it here:
const clinicId = request.headers.get("x-clinic-id");
if (!clinicId) {
  return NextResponse.json(
    { error: "Unknown clinic — check the URL" },
    { status: 400 },
  );
}

const user = await prisma.user.findUnique({
  where: { clinic_id_username: { clinic_id: clinicId, username } },
});
```

And add `clinicId` to `sessionPayload` a few lines down:

```ts
const sessionPayload = {
  userId: user.id,
  username: user.username,
  role,
  displayName: user.display_name,
  doctorId: user.doctor_id,
  mustChangePassword: user.must_change_password,
  clinicId: user.clinic_id,
};
```

`clinic_id_username` is Prisma's compound unique field name for `@@unique([clinic_id, username])` from Task 2, joined in declaration order.

- [ ] **Step 5: Run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, 99 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth-types.ts src/lib/auth.ts src/app/api/auth/login/route.ts src/lib/__tests__/auth-access.test.ts src/lib/__tests__/api-guard.test.ts
git commit -m "feat: add clinicId to session, scope login lookup by (clinic_id, username)"
```

---

## Task 7: Subdomain resolution middleware

**Files:**
- Modify: `src/middleware.ts`

**Interfaces:**
- Consumes: `Clinic` model (Task 1), `x-clinic-id` header contract from Task 6's login route.
- Produces: every request downstream (page and API) carries a resolved `x-clinic-id` request header; unknown/suspended subdomains 404 before any route logic runs.

Middleware runs on the Edge/Node runtime without direct Prisma access being the typical pattern for latency-sensitive per-request DB lookups — but this project's middleware already awaits `getSessionFromRequest`, which itself does a full JWT verify, so a lightweight Prisma lookup here is consistent with the existing cost profile (no new architectural pattern introduced). Cache it in-module to keep steady-state cost near zero.

- [ ] **Step 1: Write the subdomain → Clinic resolver**

```ts
// src/middleware.ts — add near the top, after imports
import { prisma } from "@/lib/prisma";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "localhost";

type CachedClinic = { id: string; status: string; expiresAt: number };
const clinicCache = new Map<string, CachedClinic>();
const CLINIC_CACHE_TTL_MS = 60_000;

function extractSlug(host: string): string | null {
  const hostname = host.split(":")[0];
  if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) return null;
  if (!hostname.endsWith(`.${BASE_DOMAIN}`)) return null;
  return hostname.slice(0, -(`.${BASE_DOMAIN}`.length));
}

async function resolveClinicId(host: string): Promise<{ id: string; status: string } | null> {
  const slug = extractSlug(host);
  if (!slug) return null;

  const cached = clinicCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return { id: cached.id, status: cached.status };
  }

  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
  if (!clinic) return null;

  clinicCache.set(slug, {
    id: clinic.id,
    status: clinic.status,
    expiresAt: Date.now() + CLINIC_CACHE_TTL_MS,
  });
  return clinic;
}
```

- [ ] **Step 2: Wire it into the `middleware` function**

```ts
// src/middleware.ts — inside export async function middleware(request), before
// the existing PUBLIC_PATHS check
const host = request.headers.get("host") ?? "";
const slug = extractSlug(host);

// Base-domain requests (no clinic subdomain) only serve the future signup
// flow and marketing/base pages -- not built in this plan, so for now
// anything on the base domain other than the public paths 404s.
if (!slug && !PUBLIC_PATHS.includes(pathname) && pathname !== "/") {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

let clinicId: string | null = null;
if (slug) {
  const clinic = await resolveClinicId(host);
  if (!clinic || clinic.status === "suspended") {
    return NextResponse.json({ error: "Unknown clinic" }, { status: 404 });
  }
  clinicId = clinic.id;
}
```

Then, forward `clinicId` as a header on every downstream request so both the login route (Task 6, Step 4) and every other route/page can read it:

```ts
// src/middleware.ts — wherever the function currently does NextResponse.next(),
// replace each occurrence with a version that forwards the header:
function nextWithClinic(request: NextRequest, clinicId: string | null) {
  const headers = new Headers(request.headers);
  if (clinicId) headers.set("x-clinic-id", clinicId);
  return NextResponse.next({ request: { headers } });
}
```

Replace every bare `return NextResponse.next();` in the existing function body with `return nextWithClinic(request, clinicId);`, and every `return NextResponse.redirect(...)` stays as-is (redirects don't need the header — the redirected request re-enters middleware and resolves it again).

- [ ] **Step 3: Add the reserved-slug check**

At the top of `extractSlug`, before returning a slug, reject anything in the reserved list (Task 1's `RESERVED_CLINIC_SLUGS`) as if it were unknown — a reserved word can never be claimed by a real clinic, so treat it as "not found" rather than exposing whether it's specifically reserved:

```ts
// src/middleware.ts
import { RESERVED_CLINIC_SLUGS } from "@/lib/clinic-slug";

// inside extractSlug, after computing `hostname.slice(...)` into `slug`:
if ((RESERVED_CLINIC_SLUGS as readonly string[]).includes(slug)) return null;
```

- [ ] **Step 4: Manual verification (middleware has no unit-test harness in this project — verified end-to-end in Task 9)**

There is no existing precedent in this codebase for unit-testing `src/middleware.ts` directly (it's exercised through the dev server, not Vitest). Confirm this task is correct as part of Task 9's end-to-end pass: unknown subdomain → 404, clinic #1's subdomain → login page loads.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: resolve clinic from subdomain in middleware, 404 unknown/suspended clinics"
```

---

## Task 8: Seed scripts target one clinic

**Files:**
- Create: `prisma/seed-clinic.ts`
- Modify: `prisma/seed.ts`, `prisma/seed-users.ts`, `prisma/seed-medicines.ts`, `package.json`

**Interfaces:**
- Consumes: `isValidClinicSlug` (Task 1), restructured models (Task 2).
- Produces: `npm run db:seed-clinic -- --slug=<slug> --name="<name>"` creates one `Clinic` + its `ClinicSettings` row and prints the new clinic's id; every other seed script now requires `CLINIC_ID` in the environment and scopes its inserts to it.

- [ ] **Step 1: Write the clinic bootstrap script**

```ts
// prisma/seed-clinic.ts
import { PrismaClient } from "@prisma/client";
import { isValidClinicSlug } from "../src/lib/clinic-slug";

const prisma = new PrismaClient();

function argValue(name: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=").slice(1).join("=");
}

async function main() {
  const slug = argValue("slug");
  const name = argValue("name");

  if (!slug || !name) {
    console.error('Usage: npm run db:seed-clinic -- --slug=<slug> --name="<Clinic Name>"');
    process.exit(1);
  }
  if (!isValidClinicSlug(slug)) {
    console.error(`Invalid slug "${slug}" — lowercase alphanumeric + hyphens, 3-63 chars, not reserved.`);
    process.exit(1);
  }

  const existing = await prisma.clinic.findUnique({ where: { slug } });
  if (existing) {
    console.log(`Clinic "${slug}" already exists (id: ${existing.id}). Skipping.`);
    console.log(existing.id);
    return;
  }

  const clinic = await prisma.clinic.create({
    data: {
      slug,
      name,
      status: "active",
    },
  });

  await prisma.clinicSettings.create({
    data: {
      clinic_id: clinic.id,
      display_name: name,
    },
  });

  console.log(`Created clinic "${name}" (slug: ${slug})`);
  console.log(`CLINIC_ID=${clinic.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add the npm script**

```json
// package.json — add alongside the other db: scripts
"db:seed-clinic": "dotenv -e .env.local -- tsx prisma/seed-clinic.ts",
```

- [ ] **Step 3: Scope `seed-users.ts` to a clinic**

```ts
// prisma/seed-users.ts — replace main()
async function main() {
  const clinicId = process.env.CLINIC_ID;
  if (!clinicId) {
    console.error("CLINIC_ID env var is required (see: npm run db:seed-clinic)");
    process.exit(1);
  }

  const password = process.env.SEED_USER_PASSWORD?.trim() || "Clinic@2026";
  const hash = await bcrypt.hash(password, 12);

  for (const user of DEFAULT_USERS) {
    await prisma.user.upsert({
      where: { clinic_id_username: { clinic_id: clinicId, username: user.username } },
      create: {
        clinic_id: clinicId,
        username: user.username,
        password_hash: hash,
        role: user.role,
        display_name: user.display_name,
        must_change_password: true,
      },
      update: {
        role: user.role,
        display_name: user.display_name,
      },
    });
  }

  console.log(`Seeded clinic login accounts for clinic ${clinicId} (existing passwords left untouched):`);
  for (const user of DEFAULT_USERS) {
    console.log(`  ${user.username} / ${password}  (${user.display_name}) -- only applies if newly created`);
  }
  console.log("\nEach account must set its own password on first login.");
}
```

- [ ] **Step 4: Scope `seed.ts` (doctors) to a clinic**

```ts
// prisma/seed.ts — replace main()
async function main() {
  const clinicId = process.env.CLINIC_ID;
  if (!clinicId) {
    console.error("CLINIC_ID env var is required (see: npm run db:seed-clinic)");
    process.exit(1);
  }

  const count = await prisma.doctor.count({ where: { clinic_id: clinicId } });
  if (count > 0) {
    console.log("Doctors already seeded for this clinic, skipping.");
    return;
  }

  await prisma.doctor.createMany({
    data: [
      { clinic_id: clinicId, name: "Dr. Sharma", room_number: "101", specialty: "General Medicine", opd_status: "offline" },
      { clinic_id: clinicId, name: "Dr. Patel", room_number: "102", specialty: "Cardiology", opd_status: "offline" },
      { clinic_id: clinicId, name: "Dr. Khan", room_number: "103", specialty: "Orthopedics", opd_status: "offline" },
    ],
  });

  console.log("Seeded 3 sample doctors.");
}
```

- [ ] **Step 5: Scope `seed-medicines.ts` to a clinic**

Run: `grep -n "createMany\|clinic" prisma/seed-medicines.ts` to find its insert call, and apply the identical pattern from Step 4 — require `CLINIC_ID`, add `clinic_id: clinicId` to every object in its `data:` array, and scope its "already seeded" guard count query with `where: { clinic_id: clinicId }`.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add prisma/seed-clinic.ts prisma/seed.ts prisma/seed-users.ts prisma/seed-medicines.ts package.json
git commit -m "feat: scope seed scripts to a single clinic via CLINIC_ID"
```

---

## Task 9: Migrate route handlers to `withClinicScope`, reset and reseed as clinic #1, full verification

**Files:**
- Modify: every file under `src/app/api/**/route.ts` that currently imports `prisma` from `@/lib/prisma` and touches a tenant table (not `AuditLog`-only helper calls already wrapping their own session lookup — check each file individually)
- Modify: `.env.local.example` (document `NEXT_PUBLIC_BASE_DOMAIN`)

**Interfaces:**
- Consumes: everything from Tasks 1–8.
- Produces: a working clinic #1, running end-to-end on the new multi-tenant substrate, with every route reading/writing through `withClinicScope`.

This is the integration task — nothing here is new logic, it's wiring together the previous eight tasks and proving the result actually works.

- [ ] **Step 1: Find every route handler that needs updating**

Run: `grep -rl "from \"@/lib/prisma\"" src/app/api/`

For each file in the result: replace `prisma.<model>.<op>(...)` calls with `withClinicScope(session.clinicId, (tx) => tx.<model>.<op>(...))`, where `session` is the value already obtained from `requireApi(request)` (every one of these routes already calls `requireApi` for permission checks — `session.clinicId` is now available on that same object per Task 6). For routes with multiple sequential Prisma calls, wrap them in one `withClinicScope` call passing the tx to each, mirroring how `prisma.$transaction` is already used in files like `src/app/api/patients/route.ts`.

Do this file by file; after each file, run `npx tsc --noEmit` to confirm that file's `tx` usages type-check (composite keys like `clinic_id_username` etc. from earlier tasks will already type-check correctly if a call site was missed in Task 5/6 — this pass catches any straggler).

- [ ] **Step 2: Full type-check**

Run: `npx tsc --noEmit`
Expected: zero errors across the whole project.

- [ ] **Step 3: Full non-DB test suite**

Run: `npm test`
Expected: 99+ tests pass.

- [ ] **Step 4: Document the new env var**

```
# .env.local.example — add
# The root domain clinics are served under, e.g. "yourapp.com" -- clinic
# subdomains are <slug>.<this value>. Use "localhost" for local dev
# (visit e.g. http://sunrise.localhost:3000).
NEXT_PUBLIC_BASE_DOMAIN="localhost"
```

Add `NEXT_PUBLIC_BASE_DOMAIN="localhost"` to your own `.env.local` as well.

- [ ] **Step 5: Reset the local database**

Run: `npx dotenv -e .env.local -- npx prisma migrate reset --force`
Expected: all migrations (including `enable_rls`) reapply to a clean database.

- [ ] **Step 6: Seed clinic #1**

```bash
npx dotenv -e .env.local -- tsx prisma/seed-clinic.ts --slug=demo --name="Demo Clinic"
```

Copy the printed `CLINIC_ID=<uuid>` value, then:

```bash
CLINIC_ID=<paste-the-uuid> npm run db:seed-users
CLINIC_ID=<paste-the-uuid> npm run db:seed
CLINIC_ID=<paste-the-uuid> npm run db:seed-medicines
```

(On PowerShell: `$env:CLINIC_ID="<paste-the-uuid>"; npm run db:seed-users`, etc.)

- [ ] **Step 7: Manual end-to-end verification**

Run: `npm run dev`, then in a browser:
1. Visit `http://localhost:3000/reception` (base domain, no clinic subdomain) → expect a 404 (per Task 7, Step 2 — base domain only serves public paths in this plan).
2. Visit `http://unknownclinic.localhost:3000/login` → expect a 404 (unknown slug).
3. Visit `http://demo.localhost:3000/login` → expect the login page to load.
4. Log in as `admin` / `Clinic@2026` (or your `SEED_USER_PASSWORD`) → expect successful login and redirect to `/manager`.
5. Register a new patient via `/reception` → expect it to succeed and receive patient number 1 (proves `nextPatientNumber`/RLS/`withClinicScope` all work together for a real write).
6. Confirm the registered patient does not appear under any other subdomain (there is only one clinic seeded locally, so this specific check is exercised by Task 3's automated isolation test instead — not necessary to hand-verify here).

- [ ] **Step 8: Production build**

Run: `npm run build`
Expected: builds cleanly, same as the existing CI `Production build` step.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: migrate route handlers to withClinicScope; reset and reseed as clinic #1"
```

- [ ] **Step 10: Update `.github/workflows/ci.yml` documentation note (no functional change)**

CI's `DATABASE_URL` is a non-existent database (`postgresql://ci:ci@localhost:5432/ci`) — this remains correct after this plan, since `npm test` still runs zero Prisma-touching tests (`rls-isolation.test.ts` is explicitly excluded per Task 3). No change needed to `ci.yml` itself; this step is just confirming that fact rather than editing anything; skip if the assertion holds.

---

## Post-plan state

At the end of this plan: opd-manager serves multiple clinics from one deployment, each addressed by subdomain, with Postgres RLS as a hard backstop against cross-clinic data leaks even if application code has a bug. One clinic (`demo`, or whatever slug is chosen for the real first clinic) is seeded and fully functional through every existing console.

**Not done here** (separate follow-on plans, per the design spec):
- Self-serve signup UI (`/signup`) — `Clinic` creation today is via `prisma/seed-clinic.ts` only.
- The Clinic Settings admin page for branding/feature-toggle editing — the `ClinicSettings` columns exist (Task 2) but nothing reads `radiology_enabled` etc. to actually gate consoles yet.
- Deploying `NEXT_PUBLIC_BASE_DOMAIN` and a wildcard domain (`*.yourapp.com`) in Vercel project settings — required before this works in production, not part of this codebase plan.
