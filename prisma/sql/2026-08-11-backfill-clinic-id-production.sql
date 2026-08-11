-- One-time, production-only backfill for migration 20260809100000_add_clinic_id_to_all_tables.
--
-- Why this exists instead of just re-running that migration: it adds `clinic_id UUID NOT NULL`
-- directly, which is safe on every environment that starts empty (dev branches via
-- `migrate reset`, any future fresh environment) but fails on production, which has real
-- pre-multi-tenant data. This script produces the exact same end schema as that migration
-- (same columns, same indexes, same FKs, same PKs) via a data-aware path: add nullable,
-- backfill every existing row to the one real clinic being seeded here, then enforce NOT NULL.
--
-- After running this against production, run:
--   prisma migrate resolve --applied 20260809100000_add_clinic_id_to_all_tables
-- so Prisma's history matches reality without ever re-attempting the naive version.
--
-- NOT meant to be re-run, and NOT a template for other environments -- a fresh environment
-- has zero existing rows, so the original migration file already handles it correctly with
-- no backfill needed.
--
-- Verified before writing: row counts for all 33 tables, and zero duplicate values in the
-- 6 columns being re-scoped to clinic-compound unique indexes (appointments.external_ref,
-- mlc_records.casualty_number, patient_visits.consultation_bill_no, patients.patient_number,
-- pharmacy_bills.bill_no, users.username) -- so uniqueness holds trivially once every row
-- shares the same clinic_id.

BEGIN;

-- 1. Seed the one real clinic all existing production data belongs to.
INSERT INTO "clinics" ("id", "slug", "name", "status", "created_at")
VALUES ('8de05094-71d4-470f-8ff3-0c8b9b1c716d', 'hmp', 'HMP Foundation Clinic', 'active', CURRENT_TIMESTAMP);

-- 2. Drop the old single-column unique indexes that are being replaced by clinic-scoped ones.
DROP INDEX "appointments_external_ref_key";
DROP INDEX "mlc_records_casualty_number_key";
DROP INDEX "patient_visits_consultation_bill_no_key";
DROP INDEX "patients_patient_number_key";
DROP INDEX "pharmacy_bills_bill_no_key";
DROP INDEX "users_username_key";

-- 3a. Tables with zero existing rows: add clinic_id NOT NULL directly (identical to the
-- original migration -- safe because there are no rows to violate the constraint).
ALTER TABLE "mlc_records" ADD COLUMN "clinic_id" UUID NOT NULL;
ALTER TABLE "mlc_record_revisions" ADD COLUMN "clinic_id" UUID NOT NULL;
ALTER TABLE "roi_releases" ADD COLUMN "clinic_id" UUID NOT NULL;
ALTER TABLE "stock_audits" ADD COLUMN "clinic_id" UUID NOT NULL;
ALTER TABLE "stock_audit_lines" ADD COLUMN "clinic_id" UUID NOT NULL;
ALTER TABLE "consultation_templates" ADD COLUMN "clinic_id" UUID NOT NULL;
ALTER TABLE "patient_feedback" ADD COLUMN "clinic_id" UUID NOT NULL;

ALTER TABLE "clinic_settings" DROP CONSTRAINT "clinic_settings_pkey",
DROP COLUMN "id",
ADD COLUMN     "bill_number_prefix" TEXT NOT NULL DEFAULT 'BILL',
ADD COLUMN     "clinic_id" UUID NOT NULL,
ADD COLUMN     "display_name" TEXT NOT NULL DEFAULT 'HMP Foundation Clinic',
ADD COLUMN     "gst_rate_percent" DECIMAL(5,2) NOT NULL DEFAULT 12,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "mlc_consent_text" TEXT,
ADD COLUMN     "mlc_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pharmacy_billing_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "primary_color" TEXT NOT NULL DEFAULT '#0f766e',
ADD COLUMN     "radiology_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD CONSTRAINT "clinic_settings_pkey" PRIMARY KEY ("clinic_id");

-- 3b. Tables with existing rows, simple (id-keyed) primary key: add nullable, backfill, enforce NOT NULL.
ALTER TABLE "appointments" ADD COLUMN "clinic_id" UUID;
UPDATE "appointments" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "appointments" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "audit_logs" ADD COLUMN "clinic_id" UUID;
UPDATE "audit_logs" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "audit_logs" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "doctors" ADD COLUMN "clinic_id" UUID;
UPDATE "doctors" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "doctors" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "incident_reports" ADD COLUMN "clinic_id" UUID;
UPDATE "incident_reports" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "incident_reports" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "lab_test_catalog" ADD COLUMN "clinic_id" UUID;
UPDATE "lab_test_catalog" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "lab_test_catalog" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "medicines" ADD COLUMN "clinic_id" UUID;
UPDATE "medicines" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "medicines" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "patient_consents" ADD COLUMN "clinic_id" UUID;
UPDATE "patient_consents" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "patient_consents" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "patient_visits" ADD COLUMN "clinic_id" UUID;
UPDATE "patient_visits" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "patient_visits" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "patients" ADD COLUMN "clinic_id" UUID;
UPDATE "patients" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "patients" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "pharmacy_bill_items" ADD COLUMN "clinic_id" UUID;
UPDATE "pharmacy_bill_items" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "pharmacy_bill_items" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "pharmacy_bills" ADD COLUMN "clinic_id" UUID;
UPDATE "pharmacy_bills" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "pharmacy_bills" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "prescription_items" ADD COLUMN "clinic_id" UUID;
UPDATE "prescription_items" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "prescription_items" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "prescriptions" ADD COLUMN "clinic_id" UUID;
UPDATE "prescriptions" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "prescriptions" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "staff_attendance" ADD COLUMN "clinic_id" UUID;
UPDATE "staff_attendance" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "staff_attendance" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "stock_batches" ADD COLUMN "clinic_id" UUID;
UPDATE "stock_batches" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "stock_batches" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "stock_write_offs" ADD COLUMN "clinic_id" UUID;
UPDATE "stock_write_offs" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "stock_write_offs" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "users" ADD COLUMN "clinic_id" UUID;
UPDATE "users" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "users" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "visit_emr_revisions" ADD COLUMN "clinic_id" UUID;
UPDATE "visit_emr_revisions" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "visit_emr_revisions" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "visit_lab_tests" ADD COLUMN "clinic_id" UUID;
UPDATE "visit_lab_tests" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "visit_lab_tests" ALTER COLUMN "clinic_id" SET NOT NULL;

ALTER TABLE "visit_procedures" ADD COLUMN "clinic_id" UUID;
UPDATE "visit_procedures" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "visit_procedures" ALTER COLUMN "clinic_id" SET NOT NULL;

-- 3c. Tables with existing rows, restructured (clinic_id becomes part of the primary key):
-- add nullable, backfill, enforce NOT NULL, THEN swap the primary key.
ALTER TABLE "consultation_bill_counter" ADD COLUMN "clinic_id" UUID;
UPDATE "consultation_bill_counter" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "consultation_bill_counter" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "consultation_bill_counter" DROP CONSTRAINT "consultation_bill_counter_pkey", DROP COLUMN "id",
ADD CONSTRAINT "consultation_bill_counter_pkey" PRIMARY KEY ("clinic_id");

ALTER TABLE "daily_tokens" ADD COLUMN "clinic_id" UUID;
UPDATE "daily_tokens" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "daily_tokens" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "daily_tokens" DROP CONSTRAINT "daily_tokens_pkey",
ADD CONSTRAINT "daily_tokens_pkey" PRIMARY KEY ("clinic_id", "visit_date");

ALTER TABLE "mlc_registry" ADD COLUMN "clinic_id" UUID;
UPDATE "mlc_registry" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "mlc_registry" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "mlc_registry" DROP CONSTRAINT "mlc_registry_pkey", DROP COLUMN "id",
ADD CONSTRAINT "mlc_registry_pkey" PRIMARY KEY ("clinic_id");

ALTER TABLE "patient_registry" ADD COLUMN "clinic_id" UUID;
UPDATE "patient_registry" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "patient_registry" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "patient_registry" DROP CONSTRAINT "patient_registry_pkey", DROP COLUMN "id",
ADD CONSTRAINT "patient_registry_pkey" PRIMARY KEY ("clinic_id");

ALTER TABLE "pharmacy_bill_counter" ADD COLUMN "clinic_id" UUID;
UPDATE "pharmacy_bill_counter" SET "clinic_id" = '8de05094-71d4-470f-8ff3-0c8b9b1c716d';
ALTER TABLE "pharmacy_bill_counter" ALTER COLUMN "clinic_id" SET NOT NULL;
ALTER TABLE "pharmacy_bill_counter" DROP CONSTRAINT "pharmacy_bill_counter_pkey",
ADD CONSTRAINT "pharmacy_bill_counter_pkey" PRIMARY KEY ("clinic_id", "bill_date");

-- 4. New clinic-scoped indexes (identical to the original migration).
CREATE INDEX "appointments_clinic_id_idx" ON "appointments"("clinic_id");
CREATE UNIQUE INDEX "appointments_clinic_id_external_ref_key" ON "appointments"("clinic_id", "external_ref");
CREATE INDEX "audit_logs_clinic_id_idx" ON "audit_logs"("clinic_id");
CREATE INDEX "consultation_templates_clinic_id_idx" ON "consultation_templates"("clinic_id");
CREATE INDEX "doctors_clinic_id_idx" ON "doctors"("clinic_id");
CREATE INDEX "incident_reports_clinic_id_idx" ON "incident_reports"("clinic_id");
CREATE INDEX "lab_test_catalog_clinic_id_idx" ON "lab_test_catalog"("clinic_id");
CREATE INDEX "medicines_clinic_id_idx" ON "medicines"("clinic_id");
CREATE INDEX "mlc_record_revisions_clinic_id_idx" ON "mlc_record_revisions"("clinic_id");
CREATE INDEX "mlc_records_clinic_id_idx" ON "mlc_records"("clinic_id");
CREATE UNIQUE INDEX "mlc_records_clinic_id_casualty_number_key" ON "mlc_records"("clinic_id", "casualty_number");
CREATE INDEX "patient_consents_clinic_id_idx" ON "patient_consents"("clinic_id");
CREATE INDEX "patient_feedback_clinic_id_idx" ON "patient_feedback"("clinic_id");
CREATE INDEX "patient_visits_clinic_id_idx" ON "patient_visits"("clinic_id");
CREATE UNIQUE INDEX "patient_visits_clinic_id_consultation_bill_no_key" ON "patient_visits"("clinic_id", "consultation_bill_no");
CREATE INDEX "patients_clinic_id_idx" ON "patients"("clinic_id");
CREATE UNIQUE INDEX "patients_clinic_id_patient_number_key" ON "patients"("clinic_id", "patient_number");
CREATE INDEX "pharmacy_bill_items_clinic_id_idx" ON "pharmacy_bill_items"("clinic_id");
CREATE INDEX "pharmacy_bills_clinic_id_idx" ON "pharmacy_bills"("clinic_id");
CREATE UNIQUE INDEX "pharmacy_bills_clinic_id_bill_no_key" ON "pharmacy_bills"("clinic_id", "bill_no");
CREATE INDEX "prescription_items_clinic_id_idx" ON "prescription_items"("clinic_id");
CREATE INDEX "prescriptions_clinic_id_idx" ON "prescriptions"("clinic_id");
CREATE INDEX "roi_releases_clinic_id_idx" ON "roi_releases"("clinic_id");
CREATE INDEX "staff_attendance_clinic_id_idx" ON "staff_attendance"("clinic_id");
CREATE INDEX "stock_audit_lines_clinic_id_idx" ON "stock_audit_lines"("clinic_id");
CREATE INDEX "stock_audits_clinic_id_idx" ON "stock_audits"("clinic_id");
CREATE INDEX "stock_batches_clinic_id_idx" ON "stock_batches"("clinic_id");
CREATE INDEX "stock_write_offs_clinic_id_idx" ON "stock_write_offs"("clinic_id");
CREATE INDEX "users_clinic_id_idx" ON "users"("clinic_id");
CREATE UNIQUE INDEX "users_clinic_id_username_key" ON "users"("clinic_id", "username");
CREATE INDEX "visit_emr_revisions_clinic_id_idx" ON "visit_emr_revisions"("clinic_id");
CREATE INDEX "visit_lab_tests_clinic_id_idx" ON "visit_lab_tests"("clinic_id");
CREATE INDEX "visit_procedures_clinic_id_idx" ON "visit_procedures"("clinic_id");

-- 5. Foreign keys (identical to the original migration).
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_registry" ADD CONSTRAINT "patient_registry_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mlc_registry" ADD CONSTRAINT "mlc_registry_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mlc_records" ADD CONSTRAINT "mlc_records_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mlc_record_revisions" ADD CONSTRAINT "mlc_record_revisions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roi_releases" ADD CONSTRAINT "roi_releases_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visit_emr_revisions" ADD CONSTRAINT "visit_emr_revisions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_tokens" ADD CONSTRAINT "daily_tokens_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_write_offs" ADD CONSTRAINT "stock_write_offs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_audits" ADD CONSTRAINT "stock_audits_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_audit_lines" ADD CONSTRAINT "stock_audit_lines_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consultation_bill_counter" ADD CONSTRAINT "consultation_bill_counter_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_bill_counter" ADD CONSTRAINT "pharmacy_bill_counter_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_bills" ADD CONSTRAINT "pharmacy_bills_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_bill_items" ADD CONSTRAINT "pharmacy_bill_items_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visit_procedures" ADD CONSTRAINT "visit_procedures_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinic_settings" ADD CONSTRAINT "clinic_settings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consultation_templates" ADD CONSTRAINT "consultation_templates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_feedback" ADD CONSTRAINT "patient_feedback_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lab_test_catalog" ADD CONSTRAINT "lab_test_catalog_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visit_lab_tests" ADD CONSTRAINT "visit_lab_tests_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
