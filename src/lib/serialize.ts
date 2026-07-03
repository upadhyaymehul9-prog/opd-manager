import type { Doctor, DoctorOpdStatus, PatientType, PatientVisit } from "@/lib/types";
import type {
  Medicine,
  Prescription,
  PrescriptionItem,
} from "@/lib/prescription-types";

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
  consultation_fee: number | null;
  consultation_bill_no: string | null;
  consultation_payment_mode: string | null;
  consultation_paid_at: Date | null;
  updated_at: Date;
  doctors: {
    id: string;
    name: string;
    room_number: string;
    specialty: string | null;
    opd_status: string;
  };
  patient?: { id: string; patient_number: number } | null;
};

export function serializeDoctor(doctor: {
  id: string;
  name: string;
  room_number: string;
  specialty: string | null;
  bio?: string | null;
  qualifications?: string | null;
  photo_url?: string | null;
  consultation_fee?: number | null;
  opd_status: string;
}): Doctor {
  return {
    id: doctor.id,
    name: doctor.name,
    room_number: doctor.room_number,
    specialty: doctor.specialty,
    bio: doctor.bio ?? null,
    qualifications: doctor.qualifications ?? null,
    photo_url: doctor.photo_url ?? null,
    consultation_fee: doctor.consultation_fee ?? null,
    opd_status: doctor.opd_status as DoctorOpdStatus,
  };
}

export function serializeVisit(visit: VisitWithDoctor): PatientVisit {
  return {
    id: visit.id,
    patient_id: visit.patient?.id ?? null,
    patient_number: visit.patient?.patient_number ?? null,
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
    consultation_fee: visit.consultation_fee ?? null,
    consultation_bill_no: visit.consultation_bill_no ?? null,
    consultation_payment_mode: visit.consultation_payment_mode ?? null,
    consultation_paid_at: visit.consultation_paid_at?.toISOString() ?? null,
    updated_at: visit.updated_at.toISOString(),
    doctors: serializeDoctor(visit.doctors),
  };
}

export function serializeMedicine(m: {
  id: string;
  name: string;
  brand: string | null;
  form: string | null;
  strength: string | null;
  is_active: boolean;
}): Medicine {
  return {
    id: m.id,
    name: m.name,
    brand: m.brand,
    form: m.form,
    strength: m.strength,
    is_active: m.is_active,
  };
}

export function serializePrescriptionItem(i: {
  id: string;
  prescription_id: string;
  medicine_id: string | null;
  medicine_name: string;
  dose: string | null;
  frequency: string | null;
  duration_days: number | null;
  quantity: number | null;
  instructions: string | null;
  dispensed: boolean;
  dispensed_at: Date | null;
  substituted_note: string | null;
  sort_order: number;
}): PrescriptionItem {
  return {
    id: i.id,
    prescription_id: i.prescription_id,
    medicine_id: i.medicine_id,
    medicine_name: i.medicine_name,
    dose: i.dose,
    frequency: i.frequency,
    duration_days: i.duration_days,
    quantity: i.quantity,
    instructions: i.instructions,
    dispensed: i.dispensed,
    dispensed_at: i.dispensed_at?.toISOString() ?? null,
    substituted_note: i.substituted_note,
    sort_order: i.sort_order,
  };
}

export function serializePrescription(p: {
  id: string;
  patient_visit_id: string;
  doctor_id: string;
  notes: string | null;
  status: string;
  sent_to_pharmacy_at: Date | null;
  created_at: Date;
  updated_at: Date;
  items: Parameters<typeof serializePrescriptionItem>[0][];
}): Prescription {
  return {
    id: p.id,
    patient_visit_id: p.patient_visit_id,
    doctor_id: p.doctor_id,
    notes: p.notes,
    status: p.status as Prescription["status"],
    sent_to_pharmacy_at: p.sent_to_pharmacy_at?.toISOString() ?? null,
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString(),
    items: [...p.items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(serializePrescriptionItem),
  };
}
