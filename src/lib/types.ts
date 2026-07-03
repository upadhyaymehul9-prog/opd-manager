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
  | "at_lab"
  | "lab_processing"
  | "lab_ready"
  | "to_radiology"
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
  mobile: string | null;
  lab_referred: boolean;
  radio_referred: boolean;
  lab_eta: string | null;
  radio_eta: string | null;
  registered_at: string;
  completed_at: string | null;
  updated_at: string;
  doctors?: Doctor | null;
};

export type CreatePatientInput = {
  patient_name: string;
  doctor_id: string;
  patient_type?: PatientType;
  age?: number | null;
  mobile?: string | null;
};

export type UpdatePatientInput = {
  status?: PatientStatus;
  lab_eta?: string | null;
  radio_eta?: string | null;
  room_number?: string;
};

export type UpdateDoctorInput = {
  opd_status: DoctorOpdStatus;
};
