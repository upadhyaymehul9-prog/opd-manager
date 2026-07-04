import type {
  ConsultationTemplate,
  VisitEmr,
  VisitEmrView,
  VisitVitals,
} from "@/lib/emr-types";

type VisitEmrRow = {
  id: string;
  patient_id: string | null;
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
  follow_up_date: Date | null;
  signed_at: Date | null;
  signed_by: string | null;
  vitals_bp: string | null;
  vitals_pulse: number | null;
  vitals_temp: number | null;
  vitals_weight: number | null;
  vitals_spo2: number | null;
  updated_at: Date;
  patient?: {
    allergies: string | null;
    blood_group: string | null;
  } | null;
};

export function extractVitals(row: {
  vitals_bp: string | null;
  vitals_pulse: number | null;
  vitals_temp: number | null;
  vitals_weight: number | null;
  vitals_spo2: number | null;
}): VisitVitals {
  return {
    bp: row.vitals_bp,
    pulse: row.vitals_pulse,
    temp: row.vitals_temp,
    weight: row.vitals_weight,
    spo2: row.vitals_spo2,
  };
}

export function extractVisitEmr(row: VisitEmrRow): VisitEmr {
  return {
    chief_complaint: row.chief_complaint,
    provisional_diagnosis: row.provisional_diagnosis,
    final_diagnosis: row.final_diagnosis,
    diagnosis: row.final_diagnosis ?? row.diagnosis,
    examination_notes: row.examination_notes,
    advice: row.advice,
    lifestyle_advice: row.lifestyle_advice,
    investigations_ordered: row.investigations_ordered,
    follow_up_instructions: row.follow_up_instructions,
    referral_notes: row.referral_notes,
    follow_up_date: row.follow_up_date?.toISOString().slice(0, 10) ?? null,
    signed_at: row.signed_at?.toISOString() ?? null,
    signed_by: row.signed_by,
    vitals: extractVitals(row),
  };
}

export function serializeVisitEmr(row: VisitEmrRow): VisitEmrView {
  return {
    visit_id: row.id,
    patient_id: row.patient_id,
    ...extractVisitEmr(row),
    patient: {
      allergies: row.patient?.allergies ?? null,
      blood_group: row.patient?.blood_group ?? null,
    },
    updated_at: row.updated_at.toISOString(),
  };
}

export function serializeTemplate(t: {
  id: string;
  doctor_id: string | null;
  title: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  examination_notes: string | null;
  advice: string | null;
  sort_order: number;
}): ConsultationTemplate {
  return {
    id: t.id,
    doctor_id: t.doctor_id,
    title: t.title,
    chief_complaint: t.chief_complaint,
    diagnosis: t.diagnosis,
    examination_notes: t.examination_notes,
    advice: t.advice,
    sort_order: t.sort_order,
  };
}

export function hasEmrData(emr: VisitEmr): boolean {
  return Boolean(
    emr.chief_complaint?.trim() ||
      emr.diagnosis?.trim() ||
      emr.final_diagnosis?.trim() ||
      emr.examination_notes?.trim() ||
      emr.advice?.trim() ||
      emr.vitals.bp?.trim() ||
      emr.vitals.pulse != null ||
      emr.vitals.temp != null ||
      emr.vitals.weight != null ||
      emr.vitals.spo2 != null,
  );
}

export const visitEmrSelect = {
  id: true,
  patient_id: true,
  chief_complaint: true,
  provisional_diagnosis: true,
  final_diagnosis: true,
  diagnosis: true,
  examination_notes: true,
  advice: true,
  lifestyle_advice: true,
  investigations_ordered: true,
  follow_up_instructions: true,
  referral_notes: true,
  follow_up_date: true,
  signed_at: true,
  signed_by: true,
  vitals_bp: true,
  vitals_pulse: true,
  vitals_temp: true,
  vitals_weight: true,
  vitals_spo2: true,
  updated_at: true,
  patient: {
    select: { allergies: true, blood_group: true },
  },
} as const;
