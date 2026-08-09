# Multi-Tenant Foundation — Design Spec
**Convert opd-manager from one-deployment-per-clinic to a shared multi-tenant SaaS platform**
Date: 2026-08-09

---

## Background and context

opd-manager is currently single-tenant: one Vercel deployment + one Neon Postgres database serves exactly one clinic. There is no `clinic_id` (or any tenant column) on any of the ~35 Prisma models, `ClinicSettings` is a hardcoded singleton (`id = "default"`), and `User.username` is globally unique across the whole database. Onboarding a new clinic today means cloning the repo and standing up a brand-new Neon DB + Vercel project by hand.

The product goal is to onboard **many** clinics, each able to sign themselves up, with per-clinic branding, operational settings, and feature toggles — on one shared deployment.

This is too large for a single implementation plan. This spec covers only the **foundation**: the piece every other multi-clinic feature depends on. Everything else is deliberately deferred (see "Out of scope").

The current production deployment (`main` → Vercel) contains test/seed data only — confirmed with the user. There is no live-clinic data to migrate, so the rollout can reset and reseed rather than requiring a zero-downtime backfill.

---

## Decisions carried in from brainstorming

| Question | Decision |
|---|---|
| How is a logged-in user's clinic identified? | **Subdomain per clinic** (`<slug>.yourapp.com`) — decided by Claude at the user's request ("you decide"), because it preserves the existing bookmark-per-role pattern (reception PC / doctor tablet / TV each get a URL) and avoids the global-username collision problem. |
| Data isolation strategy? | **Shared database, `clinic_id` on every row, enforced by Postgres Row-Level Security.** Matches instant self-serve signup (creating a clinic is one `INSERT`, not new infrastructure); standard pattern for healthcare SaaS at this scale per current industry practice (RLS as the database-level backstop for a possible missed application-level filter). |
| Onboarding flow? | **Self-serve signup**, not manual provisioning. |
| Payment at signup? | **No — free/trial.** Billing/plans is a separate future spec. |
| Customization scope for this spec? | Operational settings, branding, feature toggles. **Workflow customization** (reordering the actual reception→doctor→lab→pharmacy sequence) is explicitly deferred — it's a workflow-engine change, not a settings table. |

---

## Section 1 — Architecture overview

- One Next.js app on Vercel, one Neon Postgres database, serving all clinics.
- A wildcard domain (`*.yourapp.com`) is configured in Vercel project settings. Next.js middleware reads the `Host` header on every request, extracts the subdomain, and resolves it to a `Clinic` row (short-TTL cache; invalidated on clinic settings changes).
- Unknown subdomains 404 cleanly. A reserved-word list (`www`, `api`, `app`, `admin`, `static`, …) is blocked at signup time so a clinic can never claim an infrastructure name.
- **Tenant scoping is enforced in two layers**, matching the existing pattern where `canAccessApi` (`src/lib/auth.ts`) is the single chokepoint for role permissions:
  1. **Application layer:** a Prisma Client Extension wraps every query in a transaction that first calls `set_config('app.clinic_id', $1, true)` with the clinic id resolved from the session. No route can forget this — it is not something individual route handlers opt into.
  2. **Database layer (defense-in-depth):** Postgres Row-Level Security policies on every tenant table check `clinic_id = current_setting('app.clinic_id')::uuid`. This means even a bug in application code that skips step 1 fails closed (returns/affects zero rows) rather than leaking another clinic's data.
- **Critical operational detail:** RLS policies are silently bypassed by the table owner and any `BYPASSRLS` role. Prisma migrations must run as an owner/admin role, but the **application's runtime connection must use a separate, non-`BYPASSRLS` Postgres role** (`app_user`) with `FORCE ROW LEVEL SECURITY` set on every tenant table. This is the single most important thing to get right — RLS without this is decorative.

```
Request → middleware (subdomain → Clinic) → session (clinic_id claim)
        → Prisma extension (set_config app.clinic_id) → RLS-scoped query
```

---

## Section 2 — Data model

### New model: `Clinic`

```prisma
model Clinic {
  id         String   @id @default(uuid()) @db.Uuid
  slug       String   @unique
  name       String
  status     String   @default("trial") // trial | active | suspended
  plan       String?  // reserved for future billing spec
  created_at DateTime @default(now()) @db.Timestamptz(6)

  @@map("clinics")
}
```

`slug` validation (applied at signup, not just a DB constraint): lowercase alphanumeric + hyphens, 3–63 chars (DNS limit), not in the reserved-word list.

### `clinic_id` added to every existing tenant table

Applies to all ~30 tenant-scoped models: `Patient`, `PatientRegistry`, `MlcRegistry`, `MlcRecord`, `MlcRecordRevision`, `Doctor`, `User`, `PatientVisit`, `RoiRelease`, `VisitEmrRevision`, `DailyToken`, `Medicine`, `StockBatch`, `StockWriteOff`, `StockAudit`, `StockAuditLine`, `ConsultationBillCounter`, `PharmacyBillCounter`, `Prescription`, `PrescriptionItem`, `PharmacyBill`, `PharmacyBillItem`, `VisitProcedure`, `Appointment`, `ConsultationTemplate`, `AuditLog`, `PatientConsent`, `IncidentReport`, `PatientFeedback`, `LabTestCatalog`, `VisitLabTest`, `StaffAttendance`.

Pattern applied to each:
```prisma
clinic_id String @db.Uuid
clinic    Clinic @relation(fields: [clinic_id], references: [id], onDelete: Restrict)

@@index([clinic_id])
```
`onDelete: Restrict` — a clinic can be suspended (status flip) but never cascade-deleted by accident.

### `ClinicSettings` — singleton to per-clinic row

`id` stops defaulting to `"default"`; becomes `clinic_id` as both the primary key and FK (one row per clinic). Extended with the operational + branding + feature-toggle fields from Section 4.

### `User.username` uniqueness

Changes from `@unique` (global) to `@@unique([clinic_id, username])`. Every clinic can independently have an `admin` / `reception` / `doctor` login, matching the existing seeded-account convention (`npm run db:seed-users`) per clinic instead of once globally.

### Reference/catalog data

`LabTestCatalog` and `Medicine` get `clinic_id` too (not shared across clinics) — clinics stock different medicines and order different lab tests; this also matches "operational settings" customization (a clinic's medicine catalog is itself a form of customization). No shared cross-clinic catalog in this spec.

### Rollout

Since the current DB is test data only: drop and recreate via `prisma migrate reset` in the target environment, then reseed as clinic #1 using the existing seed scripts extended to take a `clinic_id`/slug argument.

---

## Section 3 — Tenant identification & auth

### Middleware

New/extended `src/middleware.ts`: parse `Host` header → subdomain. Look up `Clinic` by slug (cached). Attach resolution to the request (e.g. a header consumed downstream, or directly resolved again in the session layer — implementation detail for the plan). 404 for unknown/suspended clinics before any route logic runs.

### Session / JWT

`SessionPayload` (`src/lib/auth.ts`) gains `clinicId: string` alongside the existing `userId`, `username`, `role`. Login (`/api/auth/login`) resolves the clinic from the subdomain the request arrived on, then validates `(clinic_id, username, password)` together — so identical usernames in different clinics never collide.

### Permission layering

`canAccessApi` is unchanged in spirit — it still answers "can this role hit this route." Clinic scoping is enforced one layer lower (the Prisma extension from Section 1), so a role check passing never implies cross-clinic access.

---

## Section 4 — Customization surfaces (this spec)

Extend `ClinicSettings`:

```prisma
model ClinicSettings {
  clinic_id             String  @id @db.Uuid
  clinic                Clinic  @relation(fields: [clinic_id], references: [id], onDelete: Cascade)

  // operational (existing + new)
  slot_duration_minutes Int     @default(15)
  opd_start_hour        Int     @default(9)
  opd_end_hour          Int     @default(18)
  gst_rate_percent      Decimal @default(12) @db.Decimal(5, 2)
  bill_number_prefix    String  @default("BILL")
  mlc_consent_text      String?

  // branding
  display_name          String
  logo_url              String?
  primary_color         String  @default("#0f766e")

  // feature toggles
  radiology_enabled         Boolean @default(true)
  mlc_enabled                Boolean @default(true)
  pharmacy_billing_enabled  Boolean @default(true)

  @@map("clinic_settings")
}
```

- **Branding** (`display_name`, `logo_url`, `primary_color`) surfaces on: login page, printed receipts, TV display, WhatsApp reminder templates. Logo upload via Vercel Blob.
- **Feature toggles** gate both UI (nav items in `ConsoleShell`) and the corresponding API routes (e.g. `radiology_enabled = false` ⇒ `/radiology` 404s and `/api/visits/[visitId]/*` radiology actions reject).
- A new admin/manager-only "Clinic Settings" page replaces today's implicit hardcoded defaults.

---

## Section 5 — Self-serve signup

New public route `/signup`, served on the **base domain** (not a clinic subdomain — no clinic context exists yet).

**Form:** clinic name, desired subdomain slug (live availability check via debounced API call), owner name, phone/email, password.

**On submit** (single transaction):
1. Validate slug (format, length, reserved-word list, uniqueness).
2. Create `Clinic` (`status = "trial"`).
3. Create first `User` (`role = "admin"`, `clinic_id` = new clinic).
4. Create default `ClinicSettings` row.
5. Seed a starter `LabTestCatalog` and `Medicine` list scoped to the new clinic.
6. Redirect to `https://<slug>.yourapp.com/login`.

No email verification, no payment gate — matches the "free/trial for now" decision. (Existing app has no email-based password reset flow either, only logged-in "change password" — this spec doesn't need to add one, and isn't introducing a new gap relative to today.)

**Why step 5 matters:** a self-serve clinic that signs up with nothing in `LabTestCatalog` or `Medicine` has nothing to order or prescribe on day one — the doctor and lab consoles would be functional but empty. This needs a small, static, hand-picked starter list (common generics + common lab panels), in the same spirit as this codebase's other hand-curated defaults — `src/lib/drug-safety.ts` ("a hand-curated safety net") and `src/lib/icd10.ts` (a curated 200–300 code list) are the existing precedents for this pattern on `main`, though neither is reused directly; this is a new, small, domain-appropriate list of its own. The implementation plan defines its exact contents.

---

## Section 6 — Testing

- **Prisma RLS extension:** unit test that a query executed without `app.clinic_id` set fails closed (throws or returns zero rows, per whatever the extension implementation does).
- **Cross-tenant isolation integration test:** seed two clinics with overlapping data shapes (e.g. both have a patient named the same), confirm clinic A's session never reads clinic B's rows even via a direct Prisma call bypassing route-level checks — this is the test that actually proves RLS is doing its job, not just the extension.
- **Both of the above must run against the actual pooled Neon connection string (the `-pooler` hostname), not only a direct connection.** This is a forward-looking precaution, not a report of a past failure: Neon's pooler runs PgBouncer in transaction mode, and the tenant-scoping mechanism (Section 1) sets `app.clinic_id` via `SET LOCAL` inside a Prisma `$transaction`. That combination *should* be safe under transaction-mode pooling — the whole transaction, including the `SET LOCAL`, is guaranteed to stay pinned to one physical connection for its duration — but "should be safe" is an assumption about pooler behavior, not a verified fact, and this is exactly the kind of interaction that fails silently and only under concurrent load. Prove it against the pooled connection string before relying on it; if pooled behavior ever diverges from direct, that is launch-blocking, not a minor finding.
- **Signup flow:** slug validation edge cases (reserved words, too short/long, duplicate), successful signup creates exactly one clinic/user/settings row, and the new clinic has non-empty `LabTestCatalog`/`Medicine` rows after signup (Section 5, step 5).
- **Existing 99 tests:** fixtures and mocks updated to carry `clinic_id` wherever they touch a tenant model.

---

## Section 7 — Out of scope (future specs)

- **Workflow customization** — reordering/renaming the patient-flow steps per clinic.
- **Paid billing/plans** — Stripe/Razorpay integration, trial expiry enforcement.
- **Internal MK Tech fleet-admin panel** — cross-clinic view for suspending/managing tenants, usage/revenue rollups.
- **Email verification / password-reset-by-email** — not present today, not added here.

---

## Files changed / created (indicative — finalized in the implementation plan)

| File | Change |
|---|---|
| `prisma/schema.prisma` | New `Clinic` model; `clinic_id` on ~30 models; `ClinicSettings` singleton → per-clinic; `User.username` uniqueness scoped |
| `prisma/migrations/…` | Generated migration + RLS policy SQL (raw SQL migration, since Prisma has no native RLS support) |
| `src/lib/tenant.ts` | New — Prisma Client Extension for `set_config('app.clinic_id', …)` |
| `src/middleware.ts` | Subdomain → `Clinic` resolution, reserved-word / unknown-clinic handling |
| `src/lib/auth.ts` | `SessionPayload.clinicId`; login scoped to `(clinic_id, username)` |
| `src/app/signup/page.tsx`, `src/app/api/signup/route.ts` | New self-serve signup |
| `src/app/settings/clinic/page.tsx`, `src/app/api/clinic-settings/route.ts` | New admin/manager Clinic Settings page |
| `src/components/ConsoleShell.tsx` | Feature-toggle-aware nav, branding (name/logo/color) |
| Seed scripts (`prisma/seed*.ts`) | Extended to take a target clinic |
| Existing route handlers touching tenant tables | No `clinic_id` filters needed in query code (handled by RLS + extension) — but tests updated |
