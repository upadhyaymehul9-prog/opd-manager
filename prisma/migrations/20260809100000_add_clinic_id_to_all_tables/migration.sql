-- DropIndex
DROP INDEX "appointments_external_ref_key";

-- DropIndex
DROP INDEX "mlc_records_casualty_number_key";

-- DropIndex
DROP INDEX "patient_visits_consultation_bill_no_key";

-- DropIndex
DROP INDEX "patients_patient_number_key";

-- DropIndex
DROP INDEX "pharmacy_bills_bill_no_key";

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "clinic_settings" DROP CONSTRAINT "clinic_settings_pkey",
DROP COLUMN "id",
ADD COLUMN     "bill_number_prefix" TEXT NOT NULL DEFAULT 'BILL',
ADD COLUMN     "clinic_id" UUID NOT NULL,
ADD COLUMN     "display_name" TEXT NOT NULL,
ADD COLUMN     "gst_rate_percent" DECIMAL(5,2) NOT NULL DEFAULT 12,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "mlc_consent_text" TEXT,
ADD COLUMN     "mlc_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pharmacy_billing_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "primary_color" TEXT NOT NULL DEFAULT '#0f766e',
ADD COLUMN     "radiology_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD CONSTRAINT "clinic_settings_pkey" PRIMARY KEY ("clinic_id");

-- AlterTable
ALTER TABLE "consultation_bill_counter" DROP CONSTRAINT "consultation_bill_counter_pkey",
DROP COLUMN "id",
ADD COLUMN     "clinic_id" UUID NOT NULL,
ADD CONSTRAINT "consultation_bill_counter_pkey" PRIMARY KEY ("clinic_id");

-- AlterTable
ALTER TABLE "consultation_templates" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "daily_tokens" DROP CONSTRAINT "daily_tokens_pkey",
ADD COLUMN     "clinic_id" UUID NOT NULL,
ADD CONSTRAINT "daily_tokens_pkey" PRIMARY KEY ("clinic_id", "visit_date");

-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "incident_reports" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "lab_test_catalog" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "medicines" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "mlc_record_revisions" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "mlc_records" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "mlc_registry" DROP CONSTRAINT "mlc_registry_pkey",
DROP COLUMN "id",
ADD COLUMN     "clinic_id" UUID NOT NULL,
ADD CONSTRAINT "mlc_registry_pkey" PRIMARY KEY ("clinic_id");

-- AlterTable
ALTER TABLE "patient_consents" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "patient_feedback" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "patient_registry" DROP CONSTRAINT "patient_registry_pkey",
DROP COLUMN "id",
ADD COLUMN     "clinic_id" UUID NOT NULL,
ADD CONSTRAINT "patient_registry_pkey" PRIMARY KEY ("clinic_id");

-- AlterTable
ALTER TABLE "patient_visits" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "pharmacy_bill_counter" DROP CONSTRAINT "pharmacy_bill_counter_pkey",
ADD COLUMN     "clinic_id" UUID NOT NULL,
ADD CONSTRAINT "pharmacy_bill_counter_pkey" PRIMARY KEY ("clinic_id", "bill_date");

-- AlterTable
ALTER TABLE "pharmacy_bill_items" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "pharmacy_bills" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "prescription_items" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "roi_releases" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "staff_attendance" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "stock_audit_lines" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "stock_audits" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "stock_batches" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "stock_write_offs" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "visit_emr_revisions" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "visit_lab_tests" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "visit_procedures" ADD COLUMN     "clinic_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "appointments_clinic_id_idx" ON "appointments"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_clinic_id_external_ref_key" ON "appointments"("clinic_id", "external_ref");

-- CreateIndex
CREATE INDEX "audit_logs_clinic_id_idx" ON "audit_logs"("clinic_id");

-- CreateIndex
CREATE INDEX "consultation_templates_clinic_id_idx" ON "consultation_templates"("clinic_id");

-- CreateIndex
CREATE INDEX "doctors_clinic_id_idx" ON "doctors"("clinic_id");

-- CreateIndex
CREATE INDEX "incident_reports_clinic_id_idx" ON "incident_reports"("clinic_id");

-- CreateIndex
CREATE INDEX "lab_test_catalog_clinic_id_idx" ON "lab_test_catalog"("clinic_id");

-- CreateIndex
CREATE INDEX "medicines_clinic_id_idx" ON "medicines"("clinic_id");

-- CreateIndex
CREATE INDEX "mlc_record_revisions_clinic_id_idx" ON "mlc_record_revisions"("clinic_id");

-- CreateIndex
CREATE INDEX "mlc_records_clinic_id_idx" ON "mlc_records"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "mlc_records_clinic_id_casualty_number_key" ON "mlc_records"("clinic_id", "casualty_number");

-- CreateIndex
CREATE INDEX "patient_consents_clinic_id_idx" ON "patient_consents"("clinic_id");

-- CreateIndex
CREATE INDEX "patient_feedback_clinic_id_idx" ON "patient_feedback"("clinic_id");

-- CreateIndex
CREATE INDEX "patient_visits_clinic_id_idx" ON "patient_visits"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_visits_clinic_id_consultation_bill_no_key" ON "patient_visits"("clinic_id", "consultation_bill_no");

-- CreateIndex
CREATE INDEX "patients_clinic_id_idx" ON "patients"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_clinic_id_patient_number_key" ON "patients"("clinic_id", "patient_number");

-- CreateIndex
CREATE INDEX "pharmacy_bill_items_clinic_id_idx" ON "pharmacy_bill_items"("clinic_id");

-- CreateIndex
CREATE INDEX "pharmacy_bills_clinic_id_idx" ON "pharmacy_bills"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_bills_clinic_id_bill_no_key" ON "pharmacy_bills"("clinic_id", "bill_no");

-- CreateIndex
CREATE INDEX "prescription_items_clinic_id_idx" ON "prescription_items"("clinic_id");

-- CreateIndex
CREATE INDEX "prescriptions_clinic_id_idx" ON "prescriptions"("clinic_id");

-- CreateIndex
CREATE INDEX "roi_releases_clinic_id_idx" ON "roi_releases"("clinic_id");

-- CreateIndex
CREATE INDEX "staff_attendance_clinic_id_idx" ON "staff_attendance"("clinic_id");

-- CreateIndex
CREATE INDEX "stock_audit_lines_clinic_id_idx" ON "stock_audit_lines"("clinic_id");

-- CreateIndex
CREATE INDEX "stock_audits_clinic_id_idx" ON "stock_audits"("clinic_id");

-- CreateIndex
CREATE INDEX "stock_batches_clinic_id_idx" ON "stock_batches"("clinic_id");

-- CreateIndex
CREATE INDEX "stock_write_offs_clinic_id_idx" ON "stock_write_offs"("clinic_id");

-- CreateIndex
CREATE INDEX "users_clinic_id_idx" ON "users"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_clinic_id_username_key" ON "users"("clinic_id", "username");

-- CreateIndex
CREATE INDEX "visit_emr_revisions_clinic_id_idx" ON "visit_emr_revisions"("clinic_id");

-- CreateIndex
CREATE INDEX "visit_lab_tests_clinic_id_idx" ON "visit_lab_tests"("clinic_id");

-- CreateIndex
CREATE INDEX "visit_procedures_clinic_id_idx" ON "visit_procedures"("clinic_id");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_registry" ADD CONSTRAINT "patient_registry_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mlc_registry" ADD CONSTRAINT "mlc_registry_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mlc_records" ADD CONSTRAINT "mlc_records_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mlc_record_revisions" ADD CONSTRAINT "mlc_record_revisions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roi_releases" ADD CONSTRAINT "roi_releases_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_emr_revisions" ADD CONSTRAINT "visit_emr_revisions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_tokens" ADD CONSTRAINT "daily_tokens_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_write_offs" ADD CONSTRAINT "stock_write_offs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_audits" ADD CONSTRAINT "stock_audits_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_audit_lines" ADD CONSTRAINT "stock_audit_lines_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_bill_counter" ADD CONSTRAINT "consultation_bill_counter_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_bill_counter" ADD CONSTRAINT "pharmacy_bill_counter_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_bills" ADD CONSTRAINT "pharmacy_bills_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_bill_items" ADD CONSTRAINT "pharmacy_bill_items_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_procedures" ADD CONSTRAINT "visit_procedures_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_settings" ADD CONSTRAINT "clinic_settings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_templates" ADD CONSTRAINT "consultation_templates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_feedback" ADD CONSTRAINT "patient_feedback_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_catalog" ADD CONSTRAINT "lab_test_catalog_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_lab_tests" ADD CONSTRAINT "visit_lab_tests_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

