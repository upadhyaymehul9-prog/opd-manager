export type VisitVitals = {
  bp: string | null;
  pulse: number | null;
  temp: number | null;
  weight: number | null;
  spo2: number | null;
};

export type VisitEmr = {
  chief_complaint: string | null;
  provisional_diagnosis: string | null;
  final_diagnosis: string | null;
  diagnosis: string | null;
  examination_notes: string | null;
  advice: string | null;
  lifestyle_advice: string | null;
  investigations_ordered: string | null;
  follow_up_instructions: string | null;
  referral_notes: string | null;
  follow_up_date: string | null;
  signed_at: string | null;
  signed_by: string | null;
  vitals: VisitVitals;
};

export type PatientEmrProfile = {
  allergies: string | null;
  blood_group: string | null;
};

export type VisitEmrView = VisitEmr & {
  visit_id: string;
  patient_id: string | null;
  patient: PatientEmrProfile;
  updated_at: string;
};

export type UpdateVisitEmrInput = {
  chief_complaint?: string | null;
  provisional_diagnosis?: string | null;
  final_diagnosis?: string | null;
  diagnosis?: string | null;
  examination_notes?: string | null;
  advice?: string | null;
  lifestyle_advice?: string | null;
  investigations_ordered?: string | null;
  follow_up_instructions?: string | null;
  referral_notes?: string | null;
  follow_up_date?: string | null;
  mlc_details?: string | null;
  vitals_bp?: string | null;
  vitals_pulse?: number | null;
  vitals_temp?: number | null;
  vitals_weight?: number | null;
  vitals_spo2?: number | null;
  patient_allergies?: string | null;
  patient_blood_group?: string | null;
};

export type ConsultationTemplate = {
  id: string;
  doctor_id: string | null;
  title: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  examination_notes: string | null;
  advice: string | null;
  sort_order: number;
};

export const DEFAULT_CONSULTATION_TEMPLATES: Omit<
  ConsultationTemplate,
  "id" | "doctor_id"
>[] = [
  {
    title: "Viral fever",
    chief_complaint: "Fever, body ache, weakness",
    diagnosis: "Viral fever",
    examination_notes: "Temp raised, throat mild congestion",
    advice: "Rest, fluids, paracetamol SOS. Review if fever >3 days.",
    sort_order: 0,
  },
  {
    title: "Hypertension follow-up",
    chief_complaint: "Routine BP check",
    diagnosis: "Essential hypertension — controlled",
    examination_notes: "BP stable on current medication",
    advice: "Continue current Rx. Low salt diet. Monthly BP log.",
    sort_order: 1,
  },
  {
    title: "Upper respiratory infection",
    chief_complaint: "Cough, cold, sore throat",
    diagnosis: "Upper respiratory tract infection",
    examination_notes: "Chest clear, no wheeze",
    advice: "Steam inhalation, warm fluids. Antibiotics if purulent sputum.",
    sort_order: 2,
  },
  {
    title: "Diabetes follow-up",
    chief_complaint: "Diabetes review",
    diagnosis: "Type 2 DM — on treatment",
    examination_notes: "No hypoglycemia symptoms. Foot exam normal.",
    advice: "Continue medicines. Fasting sugar weekly. Diet + walk daily.",
    sort_order: 3,
  },
];
