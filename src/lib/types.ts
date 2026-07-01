export type DoctorOpdStatus =
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
  token_number: number;
  patient_name: string;
  doctor_id: string;
  room_number: string;
  status: PatientStatus;
  lab_eta: string | null;
  radio_eta: string | null;
  registered_at: string;
  updated_at: string;
  doctors?: Doctor | null;
};

export type CreatePatientInput = {
  patient_name: string;
  doctor_id: string;
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
