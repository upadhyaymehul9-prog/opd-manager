export type PrescriptionStatus =
  | "draft"
  | "sent_to_pharmacy"
  | "partially_dispensed"
  | "dispensed";

export type Medicine = {
  id: string;
  name: string;
  brand: string | null;
  form: string | null;
  strength: string | null;
  is_active: boolean;
};

export type PrescriptionItem = {
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
  dispensed_at: string | null;
  substituted_note: string | null;
  sort_order: number;
};

export type Prescription = {
  id: string;
  patient_visit_id: string;
  doctor_id: string;
  notes: string | null;
  status: PrescriptionStatus;
  sent_to_pharmacy_at: string | null;
  created_at: string;
  updated_at: string;
  items: PrescriptionItem[];
};

export type PrescriptionItemInput = {
  id?: string;
  medicine_id?: string | null;
  medicine_name: string;
  dose?: string | null;
  frequency?: string | null;
  duration_days?: number | null;
  quantity?: number | null;
  instructions?: string | null;
  sort_order?: number;
};

export type UpsertPrescriptionInput = {
  patient_visit_id: string;
  doctor_id: string;
  notes?: string | null;
  items: PrescriptionItemInput[];
};
