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
  diagnosis: string | null;
  examination_notes: string | null;
  advice: string | null;
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
    diagnosis: row.diagnosis,
    examination_notes: row.examination_notes,
    advice: row.advice,
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
      emr.examination_notes?.trim() ||
      emr.advice?.trim() ||
      emr.vitals.bp?.trim() ||
      emr.vitals.pulse != null ||
      emr.vitals.temp != null ||
      emr.vitals.weight != null ||
      emr.vitals.spo2 != null,
  );
}
