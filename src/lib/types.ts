export type PatientType = "new" | "old";

export type DoctorOpdStatus =
  | "offline"
  | "available"
  | "busy"
  | "on_leave"
  | "on_round"
  | "in_surgery"
  | "in_dressing";

export type PatientStatus =
  | "registered"
  | "calling"
  | "in_consultation"
  | "to_lab"
  | "lab_calling"
  | "at_lab"
  | "lab_processing"
  | "lab_ready"
  | "to_radiology"
  | "radio_calling"
  | "at_radiology"
  | "radio_processing"
  | "radio_ready"
  | "return_to_doctor"
  | "in_followup"
  | "to_pharmacy"
  | "at_pharmacy"
  | "completed";

export type Doctor = {
  id: string;
  name: string;
  room_number: string;
  specialty: string | null;
  bio: string | null;
  qualifications: string | null;
  photo_url: string | null;
  consultation_fee: number | null;
  opd_status: DoctorOpdStatus;
};

export type PatientVisit = {
  id: string;
  patient_id: string | null;
  patient_number: number | null;
  token_number: number;
  patient_name: string;
  doctor_id: string;
  room_number: string;
  status: PatientStatus;
  patient_type: PatientType;
  age: number | null;
  gender: string | null;
  medico_legal: boolean;
  mobile: string | null;
  address: string | null;
  lab_referred: boolean;
  radio_referred: boolean;
  lab_eta: string | null;
  radio_eta: string | null;
  registered_at: string;
  completed_at: string | null;
  consultation_fee: number | null;
  consultation_bill_no: string | null;
  consultation_payment_mode: string | null;
  consultation_paid_at: string | null;
  updated_at: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  examination_notes: string | null;
  advice: string | null;
  vitals_bp: string | null;
  vitals_pulse: number | null;
  vitals_temp: number | null;
  vitals_weight: number | null;
  vitals_spo2: number | null;
  patient_allergies: string | null;
  patient_blood_group: string | null;
  patient_abha_id: string | null;
  point_of_origin: string | null;
  provisional_diagnosis: string | null;
  final_diagnosis: string | null;
  lifestyle_advice: string | null;
  investigations_ordered: string | null;
  follow_up_instructions: string | null;
  referral_notes: string | null;
  follow_up_date: string | null;
  signed_at: string | null;
  signed_by: string | null;
  mlc_details: string | null;
  doctors?: Doctor | null;
};

export type CreatePatientInput = {
  patient_name: string;
  doctor_id: string;
  patient_id?: string;
  patient_type?: PatientType;
  age?: number | null;
  mobile?: string | null;
  address?: string | null;
  abha_id?: string | null;
  gender?: string | null;
  emergency_contact?: string | null;
  medico_legal?: boolean;
  consent_accepted?: boolean;
  witness_name?: string | null;
  point_of_origin?: string | null;
  date_of_birth?: string | null;
  occupation?: string | null;
  national_id_type?: string | null;
  national_id?: string | null;
  duplicate_confirmed?: boolean;
  consultation_fee?: number | null;
  consultation_payment_mode?: string | null;
};

export type UpdatePatientInput = {
  status?: PatientStatus;
  doctor_id?: string;
  lab_eta?: string | null;
  radio_eta?: string | null;
  room_number?: string;
  medico_legal?: boolean;
  mlc_details?: string | null;
  /** Doctor/admin/manager may bypass the "chief complaint + diagnosis" NABH
   * gate at discharge — logged to the audit trail when used. */
  override_emr_gate?: boolean;
};

export const PROCEDURE_TYPES = [
  "iv_drip",
  "dressing",
  "nebulisation",
  "injection",
  "other",
] as const;

export type ProcedureType = (typeof PROCEDURE_TYPES)[number];

export type UpdateDoctorInput = {
  opd_status?: DoctorOpdStatus;
  name?: string;
  room_number?: string;
  specialty?: string | null;
  bio?: string | null;
  qualifications?: string | null;
  photo_url?: string | null;
  consultation_fee?: number | null;
};
