import type {
  LabTestCatalogItem,
  LabValueType,
  VisitLabTestItem,
  VisitLabTestStatus,
} from "@/lib/lab-test-types";

export const DEFAULT_LAB_TESTS: Omit<LabTestCatalogItem, "id">[] = [
  { name: "Hemoglobin (Hb)", unit: "g/dL", ref_range: "12–16", value_type: "numeric" },
  { name: "Total WBC", unit: "/cumm", ref_range: "4000–11000", value_type: "numeric" },
  { name: "Platelet count", unit: "/cumm", ref_range: "150000–450000", value_type: "numeric" },
  { name: "Blood Sugar (Fasting)", unit: "mg/dL", ref_range: "70–100", value_type: "numeric" },
  { name: "Blood Sugar (PP)", unit: "mg/dL", ref_range: "<140", value_type: "numeric" },
  { name: "HbA1c", unit: "%", ref_range: "4–5.6", value_type: "numeric" },
  { name: "Serum Creatinine", unit: "mg/dL", ref_range: "0.6–1.2", value_type: "numeric" },
  { name: "SGOT (AST)", unit: "U/L", ref_range: "10–40", value_type: "numeric" },
  { name: "SGPT (ALT)", unit: "U/L", ref_range: "10–40", value_type: "numeric" },
  { name: "TSH", unit: "mIU/L", ref_range: "0.4–4.0", value_type: "numeric" },
  { name: "ESR", unit: "mm/hr", ref_range: "0–20", value_type: "numeric" },
  { name: "Urine Routine", unit: null, ref_range: "Normal", value_type: "text" },
  { name: "Blood Group", unit: null, ref_range: null, value_type: "text" },
];

export function formatLabValue(test: VisitLabTestItem): string {
  if (test.value_type === "text") {
    return test.value_text?.trim() || "—";
  }
  if (test.value_numeric != null) {
    const unit = test.unit ? ` ${test.unit}` : "";
    return `${test.value_numeric}${unit}`;
  }
  if (test.value_text?.trim()) return test.value_text.trim();
  return "—";
}

export function isLabTestResulted(test: VisitLabTestItem): boolean {
  return test.status === "resulted";
}

export function serializeLabCatalog(row: {
  id: string;
  name: string;
  unit: string | null;
  ref_range: string | null;
  value_type: string;
}): LabTestCatalogItem {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    ref_range: row.ref_range,
    value_type: row.value_type as LabValueType,
  };
}

export function serializeVisitLabTest(row: {
  id: string;
  patient_visit_id: string;
  catalog_id: string | null;
  test_name: string;
  unit: string | null;
  ref_range: string | null;
  value_type: string;
  value_numeric: number | null;
  value_text: string | null;
  status: string;
  notes: string | null;
  ordered_by: string | null;
  ordered_by_role: string | null;
  ordered_at: Date;
  resulted_at: Date | null;
  resulted_by: string | null;
  resulted_by_role: string | null;
  sort_order: number;
}): VisitLabTestItem {
  return {
    id: row.id,
    patient_visit_id: row.patient_visit_id,
    catalog_id: row.catalog_id,
    test_name: row.test_name,
    unit: row.unit,
    ref_range: row.ref_range,
    value_type: row.value_type as LabValueType,
    value_numeric: row.value_numeric,
    value_text: row.value_text,
    status: row.status as VisitLabTestStatus,
    notes: row.notes,
    ordered_by: row.ordered_by,
    ordered_by_role: row.ordered_by_role,
    ordered_at: row.ordered_at.toISOString(),
    resulted_at: row.resulted_at?.toISOString() ?? null,
    resulted_by: row.resulted_by,
    resulted_by_role: row.resulted_by_role,
    sort_order: row.sort_order,
  };
}
