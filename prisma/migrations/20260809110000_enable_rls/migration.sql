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
