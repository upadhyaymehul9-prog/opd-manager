import type { LabValueType } from "@/lib/lab-test-types";

export type LabPanelComponent = {
  name: string;
  unit: string | null;
  ref_range: string | null;
  value_type: LabValueType;
};

export type LabPanel = {
  /** Stable code used as the dropdown value. */
  code: string;
  /** Display name shown to lab staff. */
  name: string;
  /** Grouping shown in the picker (e.g. Hematology, Biochemistry). */
  category: string;
  components: LabPanelComponent[];
};

/**
 * Structured report templates. Choosing a panel expands into one result row
 * per component so the lab enters a full report (e.g. CBC → Hb, TLC,
 * differential, RBC indices, platelets) instead of a single free-text value.
 *
 * Reference ranges are typical adult Indian-lab values and remain editable per
 * row — they legitimately vary by method, analyzer, age, and sex.
 */
export const LAB_PANELS: LabPanel[] = [
  {
    code: "cbc",
    name: "CBC (Complete Blood Count)",
    category: "Hematology",
    components: [
      { name: "Hemoglobin (Hb)", unit: "g/dL", ref_range: "M 13–17 / F 12–15", value_type: "numeric" },
      { name: "Total RBC Count", unit: "million/µL", ref_range: "M 4.5–5.5 / F 3.8–4.8", value_type: "numeric" },
      { name: "PCV / Hematocrit", unit: "%", ref_range: "M 40–50 / F 36–46", value_type: "numeric" },
      { name: "MCV", unit: "fL", ref_range: "80–100", value_type: "numeric" },
      { name: "MCH", unit: "pg", ref_range: "27–32", value_type: "numeric" },
      { name: "MCHC", unit: "g/dL", ref_range: "32–36", value_type: "numeric" },
      { name: "RDW-CV", unit: "%", ref_range: "11.5–14.5", value_type: "numeric" },
      { name: "Total WBC Count (TLC)", unit: "/µL", ref_range: "4000–11000", value_type: "numeric" },
      { name: "Neutrophils", unit: "%", ref_range: "40–70", value_type: "numeric" },
      { name: "Lymphocytes", unit: "%", ref_range: "20–45", value_type: "numeric" },
      { name: "Eosinophils", unit: "%", ref_range: "1–6", value_type: "numeric" },
      { name: "Monocytes", unit: "%", ref_range: "2–8", value_type: "numeric" },
      { name: "Basophils", unit: "%", ref_range: "0–1", value_type: "numeric" },
      { name: "Absolute Neutrophil Count", unit: "/µL", ref_range: "2000–7000", value_type: "numeric" },
      { name: "Absolute Lymphocyte Count", unit: "/µL", ref_range: "1000–3000", value_type: "numeric" },
      { name: "Absolute Eosinophil Count", unit: "/µL", ref_range: "20–500", value_type: "numeric" },
      { name: "Absolute Monocyte Count", unit: "/µL", ref_range: "200–1000", value_type: "numeric" },
      { name: "Platelet Count", unit: "/µL", ref_range: "150000–410000", value_type: "numeric" },
      { name: "MPV", unit: "fL", ref_range: "6.5–12.0", value_type: "numeric" },
    ],
  },
  {
    code: "lft",
    name: "LFT (Liver Function Test)",
    category: "Biochemistry",
    components: [
      { name: "Total Bilirubin", unit: "mg/dL", ref_range: "0.1–1.2", value_type: "numeric" },
      { name: "Direct Bilirubin", unit: "mg/dL", ref_range: "0–0.3", value_type: "numeric" },
      { name: "Indirect Bilirubin", unit: "mg/dL", ref_range: "0.1–0.9", value_type: "numeric" },
      { name: "SGOT (AST)", unit: "U/L", ref_range: "8–45", value_type: "numeric" },
      { name: "SGPT (ALT)", unit: "U/L", ref_range: "7–56", value_type: "numeric" },
      { name: "Alkaline Phosphatase (ALP)", unit: "U/L", ref_range: "44–147", value_type: "numeric" },
      { name: "GGT", unit: "U/L", ref_range: "M 8–61 / F 5–36", value_type: "numeric" },
      { name: "Total Protein", unit: "g/dL", ref_range: "6.4–8.3", value_type: "numeric" },
      { name: "Albumin", unit: "g/dL", ref_range: "3.5–5.2", value_type: "numeric" },
      { name: "Globulin", unit: "g/dL", ref_range: "2.3–3.5", value_type: "numeric" },
      { name: "A:G Ratio", unit: null, ref_range: "1.0–2.1", value_type: "numeric" },
    ],
  },
  {
    code: "kft",
    name: "KFT / RFT (Kidney Function Test)",
    category: "Biochemistry",
    components: [
      { name: "Blood Urea", unit: "mg/dL", ref_range: "15–40", value_type: "numeric" },
      { name: "Blood Urea Nitrogen (BUN)", unit: "mg/dL", ref_range: "7–20", value_type: "numeric" },
      { name: "Serum Creatinine", unit: "mg/dL", ref_range: "M 0.7–1.3 / F 0.6–1.1", value_type: "numeric" },
      { name: "Serum Uric Acid", unit: "mg/dL", ref_range: "M 3.5–7.2 / F 2.6–6.0", value_type: "numeric" },
      { name: "Sodium (Na)", unit: "mmol/L", ref_range: "135–145", value_type: "numeric" },
      { name: "Potassium (K)", unit: "mmol/L", ref_range: "3.5–5.1", value_type: "numeric" },
      { name: "Chloride (Cl)", unit: "mmol/L", ref_range: "98–107", value_type: "numeric" },
      { name: "Serum Calcium", unit: "mg/dL", ref_range: "8.5–10.5", value_type: "numeric" },
      { name: "Serum Phosphorus", unit: "mg/dL", ref_range: "2.5–4.5", value_type: "numeric" },
    ],
  },
  {
    code: "lipid",
    name: "Lipid Profile",
    category: "Biochemistry",
    components: [
      { name: "Total Cholesterol", unit: "mg/dL", ref_range: "<200", value_type: "numeric" },
      { name: "Triglycerides", unit: "mg/dL", ref_range: "<150", value_type: "numeric" },
      { name: "HDL Cholesterol", unit: "mg/dL", ref_range: ">40", value_type: "numeric" },
      { name: "LDL Cholesterol", unit: "mg/dL", ref_range: "<100", value_type: "numeric" },
      { name: "VLDL Cholesterol", unit: "mg/dL", ref_range: "7–35", value_type: "numeric" },
      { name: "Total Cholesterol / HDL Ratio", unit: null, ref_range: "<5", value_type: "numeric" },
      { name: "LDL / HDL Ratio", unit: null, ref_range: "<3.5", value_type: "numeric" },
    ],
  },
  {
    code: "tft",
    name: "TFT (Thyroid Function Test)",
    category: "Endocrinology",
    components: [
      { name: "T3 (Triiodothyronine)", unit: "ng/dL", ref_range: "80–200", value_type: "numeric" },
      { name: "T4 (Thyroxine)", unit: "µg/dL", ref_range: "5–12", value_type: "numeric" },
      { name: "TSH", unit: "µIU/mL", ref_range: "0.4–4.0", value_type: "numeric" },
    ],
  },
  {
    code: "electrolytes",
    name: "Serum Electrolytes",
    category: "Biochemistry",
    components: [
      { name: "Sodium (Na)", unit: "mmol/L", ref_range: "135–145", value_type: "numeric" },
      { name: "Potassium (K)", unit: "mmol/L", ref_range: "3.5–5.1", value_type: "numeric" },
      { name: "Chloride (Cl)", unit: "mmol/L", ref_range: "98–107", value_type: "numeric" },
    ],
  },
  {
    code: "diabetes",
    name: "Blood Sugar Panel",
    category: "Diabetes",
    components: [
      { name: "Fasting Blood Sugar (FBS)", unit: "mg/dL", ref_range: "70–100", value_type: "numeric" },
      { name: "Post-Prandial Blood Sugar (PP2BS)", unit: "mg/dL", ref_range: "<140", value_type: "numeric" },
      { name: "Random Blood Sugar (RBS)", unit: "mg/dL", ref_range: "<140", value_type: "numeric" },
      { name: "HbA1c", unit: "%", ref_range: "Non-diabetic <5.7", value_type: "numeric" },
    ],
  },
  {
    code: "coagulation",
    name: "Coagulation Profile (PT/INR)",
    category: "Hematology",
    components: [
      { name: "Prothrombin Time (PT)", unit: "sec", ref_range: "11–13.5", value_type: "numeric" },
      { name: "INR", unit: null, ref_range: "0.8–1.2", value_type: "numeric" },
      { name: "APTT", unit: "sec", ref_range: "25–35", value_type: "numeric" },
    ],
  },
  {
    code: "iron",
    name: "Iron Studies",
    category: "Biochemistry",
    components: [
      { name: "Serum Iron", unit: "µg/dL", ref_range: "60–170", value_type: "numeric" },
      { name: "TIBC", unit: "µg/dL", ref_range: "250–450", value_type: "numeric" },
      { name: "Transferrin Saturation", unit: "%", ref_range: "20–50", value_type: "numeric" },
      { name: "Serum Ferritin", unit: "ng/mL", ref_range: "M 30–400 / F 15–150", value_type: "numeric" },
    ],
  },
  {
    code: "urine_routine",
    name: "Urine Routine & Microscopy",
    category: "Clinical Pathology",
    components: [
      { name: "Colour", unit: null, ref_range: "Pale yellow", value_type: "text" },
      { name: "Appearance", unit: null, ref_range: "Clear", value_type: "text" },
      { name: "pH", unit: null, ref_range: "5.0–8.0", value_type: "numeric" },
      { name: "Specific Gravity", unit: null, ref_range: "1.005–1.030", value_type: "numeric" },
      { name: "Protein / Albumin", unit: null, ref_range: "Nil", value_type: "text" },
      { name: "Glucose (Sugar)", unit: null, ref_range: "Nil", value_type: "text" },
      { name: "Ketones", unit: null, ref_range: "Nil", value_type: "text" },
      { name: "Bilirubin", unit: null, ref_range: "Nil", value_type: "text" },
      { name: "Urobilinogen", unit: null, ref_range: "Normal", value_type: "text" },
      { name: "Nitrite", unit: null, ref_range: "Negative", value_type: "text" },
      { name: "Blood", unit: null, ref_range: "Nil", value_type: "text" },
      { name: "Pus Cells (WBC)", unit: "/hpf", ref_range: "0–5", value_type: "text" },
      { name: "RBC", unit: "/hpf", ref_range: "0–2", value_type: "text" },
      { name: "Epithelial Cells", unit: "/hpf", ref_range: "0–5", value_type: "text" },
      { name: "Casts", unit: null, ref_range: "Nil", value_type: "text" },
      { name: "Crystals", unit: null, ref_range: "Nil", value_type: "text" },
      { name: "Bacteria", unit: null, ref_range: "Nil", value_type: "text" },
    ],
  },
  {
    code: "widal",
    name: "Widal Test",
    category: "Serology",
    components: [
      { name: "S. Typhi O", unit: "titre", ref_range: "<1:80", value_type: "text" },
      { name: "S. Typhi H", unit: "titre", ref_range: "<1:80", value_type: "text" },
      { name: "S. Paratyphi AH", unit: "titre", ref_range: "<1:80", value_type: "text" },
      { name: "S. Paratyphi BH", unit: "titre", ref_range: "<1:80", value_type: "text" },
    ],
  },
  {
    code: "dengue",
    name: "Dengue Profile",
    category: "Serology",
    components: [
      { name: "Dengue NS1 Antigen", unit: null, ref_range: "Negative", value_type: "text" },
      { name: "Dengue IgM", unit: null, ref_range: "Negative", value_type: "text" },
      { name: "Dengue IgG", unit: null, ref_range: "Negative", value_type: "text" },
    ],
  },
];

export function getLabPanel(code: string): LabPanel | undefined {
  return LAB_PANELS.find((p) => p.code === code);
}
