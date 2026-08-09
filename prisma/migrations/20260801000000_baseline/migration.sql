-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "patient_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "address" TEXT,
    "allergies" TEXT,
    "blood_group" TEXT,
    "abha_id" TEXT,
    "gender" TEXT,
    "emergency_contact" TEXT,
    "date_of_birth" DATE,
    "occupation" TEXT,
    "national_id_type" TEXT,
    "national_id" TEXT,
    "mobile_verify_code" TEXT,
    "mobile_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "merged_into_patient_id" UUID,
    "merged_at" TIMESTAMPTZ(6),
    "merge_reason" TEXT,
    "merged_by" TEXT,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_registry" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "patient_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mlc_registry" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mlc_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mlc_records" (
    "id" UUID NOT NULL,
    "patient_visit_id" UUID NOT NULL,
    "casualty_number" INTEGER NOT NULL,
    "arrival_at" TIMESTAMPTZ(6) NOT NULL,
    "brought_by_name" TEXT,
    "brought_by_relation" TEXT,
    "history_own_words" TEXT,
    "identification_mark_1" TEXT,
    "identification_mark_2" TEXT,
    "injury_description" TEXT,
    "treatment_given" TEXT,
    "patient_status" TEXT,
    "dying_declaration_needed" BOOLEAN NOT NULL DEFAULT false,
    "evidence_collected" TEXT,
    "police_station" TEXT,
    "police_officer_name" TEXT,
    "fir_ddr_number" TEXT,
    "police_intimated_at" TIMESTAMPTZ(6),
    "acknowledgment_receipt_ref" TEXT,
    "acknowledgment_received_at" TIMESTAMPTZ(6),
    "created_by" TEXT NOT NULL,
    "created_by_role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mlc_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mlc_record_revisions" (
    "id" UUID NOT NULL,
    "mlc_record_id" UUID NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_by_role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mlc_record_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "room_number" TEXT NOT NULL,
    "specialty" TEXT,
    "bio" TEXT,
    "qualifications" TEXT,
    "photo_url" TEXT,
    "consultation_fee" DOUBLE PRECISION,
    "opd_status" TEXT NOT NULL DEFAULT 'offline',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "display_name" TEXT,
    "doctor_id" UUID,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_visits" (
    "id" UUID NOT NULL,
    "patient_id" UUID,
    "token_number" INTEGER NOT NULL,
    "patient_name" TEXT NOT NULL,
    "doctor_id" UUID NOT NULL,
    "room_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "patient_type" TEXT NOT NULL DEFAULT 'new',
    "age" INTEGER,
    "gender" TEXT,
    "mobile" TEXT,
    "address" TEXT,
    "medico_legal" BOOLEAN NOT NULL DEFAULT false,
    "mlc_details" TEXT,
    "point_of_origin" TEXT NOT NULL DEFAULT 'walk_in',
    "lab_referred" BOOLEAN NOT NULL DEFAULT false,
    "radio_referred" BOOLEAN NOT NULL DEFAULT false,
    "lab_eta" TIMESTAMPTZ(6),
    "radio_eta" TIMESTAMPTZ(6),
    "lab_started_at" TIMESTAMPTZ(6),
    "lab_ready_at" TIMESTAMPTZ(6),
    "radio_started_at" TIMESTAMPTZ(6),
    "radio_ready_at" TIMESTAMPTZ(6),
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "consultation_fee" DOUBLE PRECISION,
    "consultation_payment_mode" TEXT,
    "consultation_bill_no" TEXT,
    "consultation_paid_at" TIMESTAMPTZ(6),
    "chief_complaint" TEXT,
    "provisional_diagnosis" TEXT,
    "final_diagnosis" TEXT,
    "diagnosis" TEXT,
    "examination_notes" TEXT,
    "advice" TEXT,
    "lifestyle_advice" TEXT,
    "investigations_ordered" TEXT,
    "follow_up_instructions" TEXT,
    "referral_notes" TEXT,
    "follow_up_date" DATE,
    "signed_at" TIMESTAMPTZ(6),
    "signed_by" TEXT,
    "signed_by_role" TEXT,
    "vitals_bp" TEXT,
    "vitals_pulse" INTEGER,
    "vitals_temp" DOUBLE PRECISION,
    "vitals_weight" DOUBLE PRECISION,
    "vitals_height_cm" DOUBLE PRECISION,
    "vitals_spo2" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roi_releases" (
    "id" UUID NOT NULL,
    "patient_visit_id" UUID,
    "patient_id" UUID,
    "patient_name" TEXT NOT NULL,
    "patient_number" INTEGER,
    "requested_by" TEXT NOT NULL,
    "requester_relation" TEXT,
    "purpose" TEXT NOT NULL,
    "information_released" TEXT NOT NULL,
    "release_mode" TEXT NOT NULL DEFAULT 'printed_copy',
    "identity_verified" BOOLEAN NOT NULL DEFAULT false,
    "id_proof_type" TEXT,
    "id_proof_ref" TEXT,
    "approved_by" TEXT,
    "released_by" TEXT NOT NULL,
    "released_by_role" TEXT NOT NULL,
    "released_at" TIMESTAMPTZ(6) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roi_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_emr_revisions" (
    "id" UUID NOT NULL,
    "patient_visit_id" UUID NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_by_role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_emr_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_tokens" (
    "visit_date" DATE NOT NULL,
    "last_token" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_tokens_pkey" PRIMARY KEY ("visit_date")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "form" TEXT,
    "strength" TEXT,
    "gst_rate" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "hsn_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" UUID NOT NULL,
    "medicine_id" UUID NOT NULL,
    "batch_no" TEXT NOT NULL,
    "expiry_date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pack_size" INTEGER NOT NULL DEFAULT 1,
    "mrp" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_write_offs" (
    "id" UUID NOT NULL,
    "medicine_id" UUID NOT NULL,
    "batch_id" UUID,
    "batch_no" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'expired',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_write_offs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_audits" (
    "id" UUID NOT NULL,
    "audit_date" DATE NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'pharmacy',
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_audit_lines" (
    "id" UUID NOT NULL,
    "audit_id" UUID NOT NULL,
    "medicine_id" UUID NOT NULL,
    "medicine_name" TEXT NOT NULL,
    "system_qty" INTEGER NOT NULL,
    "physical_qty" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "stock_audit_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_bill_counter" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "last_no" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "consultation_bill_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_bill_counter" (
    "bill_date" DATE NOT NULL,
    "last_no" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pharmacy_bill_counter_pkey" PRIMARY KEY ("bill_date")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL,
    "patient_visit_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sent_to_pharmacy_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "medicine_id" UUID,
    "medicine_name" TEXT NOT NULL,
    "dose" TEXT,
    "frequency" TEXT,
    "duration_days" INTEGER,
    "quantity" INTEGER,
    "instructions" TEXT,
    "dispensed" BOOLEAN NOT NULL DEFAULT false,
    "dispensed_at" TIMESTAMPTZ(6),
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "skip_reason" TEXT,
    "substituted_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "voided_at" TIMESTAMPTZ(6),
    "voided_by" TEXT,
    "void_reason" TEXT,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_bills" (
    "id" UUID NOT NULL,
    "bill_no" TEXT NOT NULL,
    "patient_visit_id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "payment_mode" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "gst_total" DOUBLE PRECISION NOT NULL,
    "grand_total" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_bill_items" (
    "id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "prescription_item_id" UUID,
    "medicine_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "gst_rate" DOUBLE PRECISION NOT NULL,
    "taxable_amount" DOUBLE PRECISION NOT NULL,
    "gst_amount" DOUBLE PRECISION NOT NULL,
    "line_total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pharmacy_bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_procedures" (
    "id" UUID NOT NULL,
    "patient_visit_id" UUID NOT NULL,
    "procedure_type" TEXT NOT NULL,
    "notes" TEXT,
    "fee" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "opd_start_hour" INTEGER NOT NULL DEFAULT 9,
    "opd_end_hour" INTEGER NOT NULL DEFAULT 18,

    CONSTRAINT "clinic_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "patient_id" UUID,
    "patient_name" TEXT NOT NULL,
    "mobile" TEXT,
    "age" INTEGER,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "source" TEXT NOT NULL DEFAULT 'reception',
    "external_ref" TEXT,
    "notes" TEXT,
    "visit_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_templates" (
    "id" UUID NOT NULL,
    "doctor_id" UUID,
    "title" TEXT NOT NULL,
    "chief_complaint" TEXT,
    "diagnosis" TEXT,
    "examination_notes" TEXT,
    "advice" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consents" (
    "id" UUID NOT NULL,
    "patient_visit_id" UUID NOT NULL,
    "patient_id" UUID,
    "consent_type" TEXT NOT NULL DEFAULT 'general_treatment',
    "accepted" BOOLEAN NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "recorded_by" TEXT NOT NULL,
    "recorded_by_role" TEXT NOT NULL,
    "witness_name" TEXT,
    "consent_text" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" UUID NOT NULL,
    "patient_visit_id" UUID,
    "patient_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "immediate_action" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reported_by" TEXT NOT NULL,
    "reported_by_role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_feedback" (
    "id" UUID NOT NULL,
    "patient_visit_id" UUID,
    "patient_name" TEXT NOT NULL,
    "mobile" TEXT,
    "q1_overall" INTEGER NOT NULL,
    "q2_care_quality" INTEGER NOT NULL,
    "q3_communication" INTEGER NOT NULL,
    "q4_environment" INTEGER NOT NULL,
    "q5_registration" INTEGER NOT NULL,
    "comments" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_test_catalog" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "ref_range" TEXT,
    "value_type" TEXT NOT NULL DEFAULT 'numeric',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_test_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_lab_tests" (
    "id" UUID NOT NULL,
    "patient_visit_id" UUID NOT NULL,
    "catalog_id" UUID,
    "test_name" TEXT NOT NULL,
    "unit" TEXT,
    "ref_range" TEXT,
    "value_type" TEXT NOT NULL DEFAULT 'numeric',
    "value_numeric" DOUBLE PRECISION,
    "value_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "notes" TEXT,
    "ordered_by" TEXT,
    "ordered_by_role" TEXT,
    "ordered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resulted_at" TIMESTAMPTZ(6),
    "resulted_by" TEXT,
    "resulted_by_role" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "visit_lab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_patient_number_key" ON "patients"("patient_number");

-- CreateIndex
CREATE UNIQUE INDEX "patients_abha_id_key" ON "patients"("abha_id");

-- CreateIndex
CREATE INDEX "patients_mobile_idx" ON "patients"("mobile");

-- CreateIndex
CREATE INDEX "patients_name_idx" ON "patients"("name");

-- CreateIndex
CREATE INDEX "patients_abha_id_idx" ON "patients"("abha_id");

-- CreateIndex
CREATE INDEX "patients_merged_into_patient_id_idx" ON "patients"("merged_into_patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "mlc_records_patient_visit_id_key" ON "mlc_records"("patient_visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "mlc_records_casualty_number_key" ON "mlc_records"("casualty_number");

-- CreateIndex
CREATE INDEX "mlc_records_patient_visit_id_idx" ON "mlc_records"("patient_visit_id");

-- CreateIndex
CREATE INDEX "mlc_records_police_intimated_at_idx" ON "mlc_records"("police_intimated_at");

-- CreateIndex
CREATE INDEX "mlc_record_revisions_mlc_record_id_idx" ON "mlc_record_revisions"("mlc_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "patient_visits_consultation_bill_no_key" ON "patient_visits"("consultation_bill_no");

-- CreateIndex
CREATE INDEX "patient_visits_status_idx" ON "patient_visits"("status");

-- CreateIndex
CREATE INDEX "patient_visits_doctor_id_idx" ON "patient_visits"("doctor_id");

-- CreateIndex
CREATE INDEX "patient_visits_patient_id_idx" ON "patient_visits"("patient_id");

-- CreateIndex
CREATE INDEX "patient_visits_registered_at_idx" ON "patient_visits"("registered_at" DESC);

-- CreateIndex
CREATE INDEX "patient_visits_patient_name_idx" ON "patient_visits"("patient_name");

-- CreateIndex
CREATE INDEX "roi_releases_created_at_idx" ON "roi_releases"("created_at" DESC);

-- CreateIndex
CREATE INDEX "roi_releases_patient_visit_id_idx" ON "roi_releases"("patient_visit_id");

-- CreateIndex
CREATE INDEX "roi_releases_patient_id_idx" ON "roi_releases"("patient_id");

-- CreateIndex
CREATE INDEX "visit_emr_revisions_patient_visit_id_idx" ON "visit_emr_revisions"("patient_visit_id");

-- CreateIndex
CREATE INDEX "visit_emr_revisions_created_at_idx" ON "visit_emr_revisions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "medicines_name_idx" ON "medicines"("name");

-- CreateIndex
CREATE INDEX "medicines_brand_idx" ON "medicines"("brand");

-- CreateIndex
CREATE INDEX "stock_batches_medicine_id_idx" ON "stock_batches"("medicine_id");

-- CreateIndex
CREATE INDEX "stock_batches_expiry_date_idx" ON "stock_batches"("expiry_date");

-- CreateIndex
CREATE INDEX "stock_write_offs_medicine_id_idx" ON "stock_write_offs"("medicine_id");

-- CreateIndex
CREATE INDEX "stock_write_offs_created_at_idx" ON "stock_write_offs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "stock_audits_audit_date_idx" ON "stock_audits"("audit_date" DESC);

-- CreateIndex
CREATE INDEX "stock_audits_department_idx" ON "stock_audits"("department");

-- CreateIndex
CREATE INDEX "stock_audit_lines_audit_id_idx" ON "stock_audit_lines"("audit_id");

-- CreateIndex
CREATE INDEX "stock_audit_lines_medicine_id_idx" ON "stock_audit_lines"("medicine_id");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_patient_visit_id_key" ON "prescriptions"("patient_visit_id");

-- CreateIndex
CREATE INDEX "prescriptions_status_idx" ON "prescriptions"("status");

-- CreateIndex
CREATE INDEX "prescription_items_prescription_id_idx" ON "prescription_items"("prescription_id");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_bills_bill_no_key" ON "pharmacy_bills"("bill_no");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_bills_patient_visit_id_key" ON "pharmacy_bills"("patient_visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_bills_prescription_id_key" ON "pharmacy_bills"("prescription_id");

-- CreateIndex
CREATE INDEX "pharmacy_bills_created_at_idx" ON "pharmacy_bills"("created_at" DESC);

-- CreateIndex
CREATE INDEX "pharmacy_bill_items_bill_id_idx" ON "pharmacy_bill_items"("bill_id");

-- CreateIndex
CREATE INDEX "visit_procedures_patient_visit_id_idx" ON "visit_procedures"("patient_visit_id");

-- CreateIndex
CREATE INDEX "visit_procedures_procedure_type_idx" ON "visit_procedures"("procedure_type");

-- CreateIndex
CREATE INDEX "visit_procedures_created_at_idx" ON "visit_procedures"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_external_ref_key" ON "appointments"("external_ref");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_visit_id_key" ON "appointments"("visit_id");

-- CreateIndex
CREATE INDEX "appointments_doctor_id_scheduled_at_idx" ON "appointments"("doctor_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments"("scheduled_at" DESC);

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_source_idx" ON "appointments"("source");

-- CreateIndex
CREATE INDEX "consultation_templates_doctor_id_idx" ON "consultation_templates"("doctor_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "patient_consents_patient_visit_id_key" ON "patient_consents"("patient_visit_id");

-- CreateIndex
CREATE INDEX "patient_consents_patient_id_idx" ON "patient_consents"("patient_id");

-- CreateIndex
CREATE INDEX "incident_reports_created_at_idx" ON "incident_reports"("created_at" DESC);

-- CreateIndex
CREATE INDEX "incident_reports_status_idx" ON "incident_reports"("status");

-- CreateIndex
CREATE INDEX "patient_feedback_created_at_idx" ON "patient_feedback"("created_at" DESC);

-- CreateIndex
CREATE INDEX "lab_test_catalog_name_idx" ON "lab_test_catalog"("name");

-- CreateIndex
CREATE INDEX "visit_lab_tests_patient_visit_id_idx" ON "visit_lab_tests"("patient_visit_id");

-- CreateIndex
CREATE INDEX "visit_lab_tests_status_idx" ON "visit_lab_tests"("status");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_merged_into_patient_id_fkey" FOREIGN KEY ("merged_into_patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mlc_records" ADD CONSTRAINT "mlc_records_patient_visit_id_fkey" FOREIGN KEY ("patient_visit_id") REFERENCES "patient_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mlc_record_revisions" ADD CONSTRAINT "mlc_record_revisions_mlc_record_id_fkey" FOREIGN KEY ("mlc_record_id") REFERENCES "mlc_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roi_releases" ADD CONSTRAINT "roi_releases_patient_visit_id_fkey" FOREIGN KEY ("patient_visit_id") REFERENCES "patient_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roi_releases" ADD CONSTRAINT "roi_releases_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_emr_revisions" ADD CONSTRAINT "visit_emr_revisions_patient_visit_id_fkey" FOREIGN KEY ("patient_visit_id") REFERENCES "patient_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_write_offs" ADD CONSTRAINT "stock_write_offs_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_write_offs" ADD CONSTRAINT "stock_write_offs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_audit_lines" ADD CONSTRAINT "stock_audit_lines_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "stock_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_audit_lines" ADD CONSTRAINT "stock_audit_lines_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_visit_id_fkey" FOREIGN KEY ("patient_visit_id") REFERENCES "patient_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_bills" ADD CONSTRAINT "pharmacy_bills_patient_visit_id_fkey" FOREIGN KEY ("patient_visit_id") REFERENCES "patient_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_bills" ADD CONSTRAINT "pharmacy_bills_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_bill_items" ADD CONSTRAINT "pharmacy_bill_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "pharmacy_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_procedures" ADD CONSTRAINT "visit_procedures_patient_visit_id_fkey" FOREIGN KEY ("patient_visit_id") REFERENCES "patient_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "patient_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_templates" ADD CONSTRAINT "consultation_templates_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patient_visit_id_fkey" FOREIGN KEY ("patient_visit_id") REFERENCES "patient_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_patient_visit_id_fkey" FOREIGN KEY ("patient_visit_id") REFERENCES "patient_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_lab_tests" ADD CONSTRAINT "visit_lab_tests_patient_visit_id_fkey" FOREIGN KEY ("patient_visit_id") REFERENCES "patient_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_lab_tests" ADD CONSTRAINT "visit_lab_tests_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "lab_test_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

