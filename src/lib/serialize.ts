import type { Doctor, DoctorOpdStatus, PatientType, PatientVisit } from "@/lib/types";

type VisitWithDoctor = {
  id: string;
  token_number: number;
  patient_name: string;
  doctor_id: string;
  room_number: string;
  status: string;
  patient_type: string;
  age: number | null;
  mobile: string | null;
  lab_referred: boolean;
  radio_referred: boolean;
  lab_eta: Date | null;
  radio_eta: Date | null;
  registered_at: Date;
  completed_at: Date | null;
  updated_at: Date;
  doctors: {
    id: string;
    name: string;
    room_number: string;
    specialty: string | null;
    opd_status: string;
  };
};

export function serializeDoctor(doctor: {
  id: string;
  name: string;
  room_number: string;
  specialty: string | null;
  opd_status: string;
}): Doctor {
  return {
    id: doctor.id,
    name: doctor.name,
    room_number: doctor.room_number,
    specialty: doctor.specialty,
    opd_status: doctor.opd_status as DoctorOpdStatus,
  };
}

export function serializeVisit(visit: VisitWithDoctor): PatientVisit {
  return {
    id: visit.id,
    token_number: visit.token_number,
    patient_name: visit.patient_name,
    doctor_id: visit.doctor_id,
    room_number: visit.room_number,
    status: visit.status as PatientVisit["status"],
    patient_type: visit.patient_type as PatientType,
    age: visit.age,
    mobile: visit.mobile,
    lab_referred: visit.lab_referred,
    radio_referred: visit.radio_referred,
    lab_eta: visit.lab_eta?.toISOString() ?? null,
    radio_eta: visit.radio_eta?.toISOString() ?? null,
    registered_at: visit.registered_at.toISOString(),
    completed_at: visit.completed_at?.toISOString() ?? null,
    updated_at: visit.updated_at.toISOString(),
    doctors: serializeDoctor(visit.doctors),
  };
}
