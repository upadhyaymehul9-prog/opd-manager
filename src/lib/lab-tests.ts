import type {
  LabTestCatalogItem,
  LabValueType,
  VisitLabTestItem,
  VisitLabTestStatus,
} from "@/lib/lab-test-types";

/**
 * Common OPD / clinic lab catalog (India). Names match how doctors usually order.
 * ensureDefaultCatalog upserts any missing rows by name.
 */
export const DEFAULT_LAB_TESTS: Omit<LabTestCatalogItem, "id">[] = [
  // Hematology
  { name: "CBC (Complete Blood Count)", unit: null, ref_range: null, value_type: "text" },
  { name: "Hemoglobin (Hb)", unit: "g/dL", ref_range: "M 13–17 / F 12–15", value_type: "numeric" },
  { name: "Total WBC (TC)", unit: "/cumm", ref_range: "4000–11000", value_type: "numeric" },
  { name: "Differential Count (DC)", unit: null, ref_range: null, value_type: "text" },
  { name: "Platelet count", unit: "/cumm", ref_range: "1.5–4.5 lakh", value_type: "numeric" },
  { name: "ESR", unit: "mm/hr", ref_range: "M 0–15 / F 0–20", value_type: "numeric" },
  { name: "PCV / Hematocrit", unit: "%", ref_range: "M 40–50 / F 36–46", value_type: "numeric" },
  { name: "Peripheral smear", unit: null, ref_range: null, value_type: "text" },
  { name: "Blood Group & Rh", unit: null, ref_range: null, value_type: "text" },
  { name: "Blood Group", unit: null, ref_range: null, value_type: "text" },

  // Sugar / diabetes
  { name: "RBS (Random Blood Sugar)", unit: "mg/dL", ref_range: "<140", value_type: "numeric" },
  { name: "FBS (Fasting Blood Sugar)", unit: "mg/dL", ref_range: "70–100", value_type: "numeric" },
  { name: "PP2BS (Post-prandial 2hr)", unit: "mg/dL", ref_range: "<140", value_type: "numeric" },
  { name: "Blood Sugar (Fasting)", unit: "mg/dL", ref_range: "70–100", value_type: "numeric" },
  { name: "Blood Sugar (PP)", unit: "mg/dL", ref_range: "<140", value_type: "numeric" },
  { name: "HbA1c", unit: "%", ref_range: "Non-diabetic <5.7", value_type: "numeric" },

  // Kidney
  { name: "Blood Urea", unit: "mg/dL", ref_range: "15–40", value_type: "numeric" },
  { name: "Serum Creatinine", unit: "mg/dL", ref_range: "M 0.7–1.3 / F 0.6–1.1", value_type: "numeric" },
  { name: "Serum Uric Acid", unit: "mg/dL", ref_range: "M 3.5–7.2 / F 2.6–6.0", value_type: "numeric" },
  { name: "Serum Electrolytes (Na/K/Cl)", unit: null, ref_range: null, value_type: "text" },

  // Liver
  { name: "SGPT (ALT)", unit: "U/L", ref_range: "7–56", value_type: "numeric" },
  { name: "SGOT (AST)", unit: "U/L", ref_range: "8–45", value_type: "numeric" },
  { name: "Serum Bilirubin (Total)", unit: "mg/dL", ref_range: "0.1–1.2", value_type: "numeric" },
  { name: "Serum Bilirubin (Direct)", unit: "mg/dL", ref_range: "0–0.3", value_type: "numeric" },
  { name: "Alkaline Phosphatase (ALP)", unit: "U/L", ref_range: "44–147", value_type: "numeric" },
  { name: "LFT (Liver Function Test)", unit: null, ref_range: null, value_type: "text" },

  // Lipid / cardiac
  { name: "Lipid Profile", unit: null, ref_range: null, value_type: "text" },
  { name: "Total Cholesterol", unit: "mg/dL", ref_range: "<200", value_type: "numeric" },
  { name: "Triglycerides", unit: "mg/dL", ref_range: "<150", value_type: "numeric" },
  { name: "HDL Cholesterol", unit: "mg/dL", ref_range: ">40", value_type: "numeric" },
  { name: "LDL Cholesterol", unit: "mg/dL", ref_range: "<100", value_type: "numeric" },

  // Thyroid
  { name: "TSH", unit: "mIU/L", ref_range: "0.4–4.0", value_type: "numeric" },
  { name: "T3", unit: "ng/dL", ref_range: "80–200", value_type: "numeric" },
  { name: "T4", unit: "µg/dL", ref_range: "5–12", value_type: "numeric" },
  { name: "TFT (Thyroid Function Test)", unit: null, ref_range: null, value_type: "text" },

  // Infection / serology
  { name: "CRP (C-Reactive Protein)", unit: "mg/L", ref_range: "<5", value_type: "numeric" },
  { name: "Widal Test", unit: null, ref_range: "Negative", value_type: "text" },
  { name: "MP (Malaria Parasite)", unit: null, ref_range: "Negative", value_type: "text" },
  { name: "Dengue NS1 Antigen", unit: null, ref_range: "Negative", value_type: "text" },
  { name: "Dengue IgM / IgG", unit: null, ref_range: "Negative", value_type: "text" },
  { name: "HIV (Rapid)", unit: null, ref_range: "Non-reactive", value_type: "text" },
  { name: "HBsAg", unit: null, ref_range: "Non-reactive", value_type: "text" },
  { name: "Anti-HCV", unit: null, ref_range: "Non-reactive", value_type: "text" },
  { name: "VDRL / RPR", unit: null, ref_range: "Non-reactive", value_type: "text" },
  { name: "COVID-19 Rapid Antigen", unit: null, ref_range: "Negative", value_type: "text" },
  { name: "RT-PCR COVID-19", unit: null, ref_range: "Negative", value_type: "text" },

  // Urine / stool
  { name: "Urine Routine & Microscopy", unit: null, ref_range: "Normal", value_type: "text" },
  { name: "Urine Routine", unit: null, ref_range: "Normal", value_type: "text" },
  { name: "Urine Culture", unit: null, ref_range: "No growth", value_type: "text" },
  { name: "Urine Pregnancy Test (UPT)", unit: null, ref_range: "Negative", value_type: "text" },
  { name: "Stool Routine", unit: null, ref_range: "Normal", value_type: "text" },
  { name: "Stool Occult Blood", unit: null, ref_range: "Negative", value_type: "text" },

  // Other common
  { name: "Serum Calcium", unit: "mg/dL", ref_range: "8.5–10.5", value_type: "numeric" },
  { name: "Serum Vitamin D (25-OH)", unit: "ng/mL", ref_range: "30–100", value_type: "numeric" },
  { name: "Serum Vitamin B12", unit: "pg/mL", ref_range: "200–900", value_type: "numeric" },
  { name: "Serum Iron", unit: "µg/dL", ref_range: "60–170", value_type: "numeric" },
  { name: "Prothrombin Time (PT/INR)", unit: null, ref_range: "INR 0.8–1.2", value_type: "text" },
  { name: "Troponin-I", unit: "ng/mL", ref_range: "<0.04", value_type: "numeric" },
  { name: "PSA (Total)", unit: "ng/mL", ref_range: "<4", value_type: "numeric" },
  { name: "RA Factor", unit: null, ref_range: "Negative", value_type: "text" },
  { name: "ASO Titre", unit: "IU/mL", ref_range: "<200", value_type: "numeric" },
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
