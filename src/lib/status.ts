import type { PatientStatus } from "./types";

export const STATUS_LABELS: Record<PatientStatus, string> = {
  registered: "Registered — Waiting",
  calling: "Calling Patient",
  in_consultation: "In Consultation",
  to_lab: "Go to Lab",
  lab_calling: "Lab — Calling Patient",
  at_lab: "At Lab",
  lab_processing: "Lab — Processing",
  lab_ready: "Lab Report Ready",
  to_radiology: "Go to Radiology",
  radio_calling: "Radiology — Calling Patient",
  at_radiology: "At Radiology",
  radio_processing: "Radiology — Processing",
  radio_ready: "Radiology Report Ready",
  return_to_doctor: "Return to Doctor",
  in_followup: "Follow-up Consultation",
  to_pharmacy: "Go to Pharmacy",
  at_pharmacy: "At Pharmacy",
  completed: "Completed — Exit",
};

export const STATUS_COLORS: Record<PatientStatus, string> = {
  registered: "bg-slate-100 text-slate-800",
  calling: "bg-amber-100 text-amber-900 animate-pulse",
  in_consultation: "bg-blue-100 text-blue-900",
  to_lab: "bg-purple-100 text-purple-900",
  lab_calling: "bg-amber-100 text-amber-900 animate-pulse",
  at_lab: "bg-purple-200 text-purple-950",
  lab_processing: "bg-violet-100 text-violet-900",
  lab_ready: "bg-green-100 text-green-900",
  to_radiology: "bg-indigo-100 text-indigo-900",
  radio_calling: "bg-amber-100 text-amber-900 animate-pulse",
  at_radiology: "bg-indigo-200 text-indigo-950",
  radio_processing: "bg-sky-100 text-sky-900",
  radio_ready: "bg-emerald-100 text-emerald-900",
  return_to_doctor: "bg-amber-100 text-amber-900",
  in_followup: "bg-blue-200 text-blue-950",
  to_pharmacy: "bg-teal-100 text-teal-900",
  at_pharmacy: "bg-teal-200 text-teal-950",
  completed: "bg-gray-200 text-gray-600",
};

export const TV_DESTINATIONS: Partial<Record<PatientStatus, string>> = {
  calling: "Please proceed to your doctor's room",
  to_lab: "Please go to the Laboratory",
  lab_calling: "Lab is calling — please proceed to Laboratory",
  to_radiology: "Please go to Radiology",
  radio_calling: "Radiology is calling — please proceed to Radiology",
  lab_ready: "Lab report ready — return to your doctor",
  radio_ready: "Radiology report ready — return to your doctor",
  return_to_doctor: "Please return to your doctor's room",
  to_pharmacy: "Please go to the Pharmacy",
  completed: "Thank you — you may leave the clinic",
};

export type StatusAction = {
  label: string;
  status: PatientStatus;
  variant?: "primary" | "secondary" | "danger" | "lab" | "radio" | "pharmacy";
  needsEta?: "lab" | "radio";
};

export const DOCTOR_ACTIONS: StatusAction[] = [
  { label: "Call Patient", status: "calling", variant: "primary" },
  { label: "In Consultation", status: "in_consultation", variant: "primary" },
  { label: "Send to Lab", status: "to_lab", variant: "lab" },
  { label: "Send to Radiology", status: "to_radiology", variant: "radio" },
  { label: "Send to Pharmacy", status: "to_pharmacy", variant: "pharmacy" },
  { label: "Follow-up Done → Pharmacy", status: "to_pharmacy", variant: "primary" },
  { label: "Discharge (Exit)", status: "completed", variant: "danger" },
];

export const LAB_ACTIONS: StatusAction[] = [
  { label: "Call Patient", status: "lab_calling", variant: "primary" },
  { label: "Patient Arrived", status: "at_lab" },
  {
    label: "Set ready time & start",
    status: "lab_processing",
    needsEta: "lab",
    variant: "lab",
  },
  { label: "Report Ready", status: "lab_ready" },
  { label: "Send Back to Doctor", status: "return_to_doctor", variant: "primary" },
];

export const RADIOLOGY_ACTIONS: StatusAction[] = [
  { label: "Call Patient", status: "radio_calling", variant: "primary" },
  { label: "Patient Arrived", status: "at_radiology" },
  {
    label: "Set ready time & start",
    status: "radio_processing",
    needsEta: "radio",
    variant: "radio",
  },
  { label: "Report Ready", status: "radio_ready" },
  { label: "Send Back to Doctor", status: "return_to_doctor", variant: "primary" },
];

export const PHARMACY_ACTIONS: StatusAction[] = [
  { label: "Patient Arrived", status: "at_pharmacy" },
  { label: "Medicines Given — Exit", status: "completed", variant: "primary" },
];

export const PRESCRIPTION_STATUSES: PatientStatus[] = [
  "calling",
  "in_consultation",
  "return_to_doctor",
  "in_followup",
  "to_pharmacy",
  "at_pharmacy",
];

export function getDoctorActions(status: PatientStatus): StatusAction[] {
  switch (status) {
    case "registered":
      return DOCTOR_ACTIONS.filter((a) => a.status === "calling");
    case "calling":
      return DOCTOR_ACTIONS.filter((a) => a.status === "in_consultation");
    case "in_consultation":
      return DOCTOR_ACTIONS.filter(
        (a) =>
          ["to_lab", "to_radiology", "to_pharmacy", "completed"].includes(
            a.status,
          ) && a.label !== "Follow-up Done → Pharmacy",
      );
    case "return_to_doctor":
      return DOCTOR_ACTIONS.filter(
        (a) =>
          ["in_consultation", "to_lab", "to_radiology", "to_pharmacy", "completed"].includes(
            a.status,
          ) && a.label !== "Follow-up Done → Pharmacy",
      );
    case "in_followup":
      return DOCTOR_ACTIONS.filter(
        (a) =>
          ["in_consultation", "to_lab", "to_radiology", "to_pharmacy", "completed"].includes(
            a.status,
          ) && a.label !== "Send to Pharmacy",
      );
    default:
      return [];
  }
}

export function getLabActions(status: PatientStatus): StatusAction[] {
  switch (status) {
    case "to_lab":
      return LAB_ACTIONS.filter((a) =>
        ["lab_calling", "at_lab"].includes(a.status),
      );
    case "lab_calling":
      return LAB_ACTIONS.filter((a) => a.status === "at_lab");
    case "at_lab":
      return LAB_ACTIONS.filter((a) => a.status === "lab_processing");
    case "lab_processing":
      return LAB_ACTIONS.filter((a) =>
        ["lab_ready", "return_to_doctor"].includes(a.status),
      );
    case "lab_ready":
      return LAB_ACTIONS.filter((a) => a.status === "return_to_doctor");
    default:
      return [];
  }
}

export function getRadiologyActions(status: PatientStatus): StatusAction[] {
  switch (status) {
    case "to_radiology":
      return RADIOLOGY_ACTIONS.filter((a) =>
        ["radio_calling", "at_radiology"].includes(a.status),
      );
    case "radio_calling":
      return RADIOLOGY_ACTIONS.filter((a) => a.status === "at_radiology");
    case "at_radiology":
      return RADIOLOGY_ACTIONS.filter((a) => a.status === "radio_processing");
    case "radio_processing":
      return RADIOLOGY_ACTIONS.filter((a) =>
        ["radio_ready", "return_to_doctor"].includes(a.status),
      );
    case "radio_ready":
      return RADIOLOGY_ACTIONS.filter((a) => a.status === "return_to_doctor");
    default:
      return [];
  }
}

export function getPharmacyActions(status: PatientStatus): StatusAction[] {
  switch (status) {
    case "to_pharmacy":
      return PHARMACY_ACTIONS.filter((a) => a.status === "at_pharmacy");
    case "at_pharmacy":
      return PHARMACY_ACTIONS.filter((a) => a.status === "completed");
    default:
      return [];
  }
}

export function canWritePrescription(status: PatientStatus) {
  return PRESCRIPTION_STATUSES.includes(status);
}

export function getRelevantPatients<T extends { status: PatientStatus; doctor_id: string }>(
  visits: T[],
  filter: "doctor" | "lab" | "radiology" | "pharmacy" | "active",
  doctorId?: string,
): T[] {
  const labStatuses: PatientStatus[] = [
    "to_lab",
    "lab_calling",
    "at_lab",
    "lab_processing",
    "lab_ready",
  ];
  const radioStatuses: PatientStatus[] = [
    "to_radiology",
    "radio_calling",
    "at_radiology",
    "radio_processing",
    "radio_ready",
  ];
  const pharmacyStatuses: PatientStatus[] = ["to_pharmacy", "at_pharmacy"];
  const doctorStatuses: PatientStatus[] = [
    "registered",
    "calling",
    "in_consultation",
    "to_lab",
    "lab_calling",
    "at_lab",
    "lab_processing",
    "lab_ready",
    "to_radiology",
    "radio_calling",
    "at_radiology",
    "radio_processing",
    "radio_ready",
    "return_to_doctor",
    "in_followup",
    "to_pharmacy",
    "at_pharmacy",
  ];

  return visits.filter((v) => {
    if (filter === "doctor" && doctorId) {
      return v.doctor_id === doctorId && doctorStatuses.includes(v.status);
    }
    if (filter === "lab") return labStatuses.includes(v.status);
    if (filter === "radiology") return radioStatuses.includes(v.status);
    if (filter === "pharmacy") return pharmacyStatuses.includes(v.status);
    if (filter === "active") return v.status !== "completed";
    return true;
  });
}
