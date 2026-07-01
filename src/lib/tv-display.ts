import type { PatientStatus } from "./types";

/** Short labels for the TV tokens table */
export const TV_TOKEN_STATUS_LABELS: Record<PatientStatus, string> = {
  registered: "Waiting",
  calling: "Doctor Calling",
  in_consultation: "In Consultation",
  to_lab: "Go to Lab",
  at_lab: "At Lab",
  lab_processing: "Lab Pending",
  lab_ready: "Lab Ready",
  to_radiology: "Go to Radiology",
  at_radiology: "At Radiology",
  radio_processing: "Radiology Pending",
  radio_ready: "Radiology Ready",
  return_to_doctor: "Return to Doctor",
  in_followup: "Follow-up",
  to_pharmacy: "Pharmacy",
  at_pharmacy: "At Pharmacy",
  completed: "Completed",
};

export const LAB_REPORT_STATUSES: PatientStatus[] = [
  "to_lab",
  "at_lab",
  "lab_processing",
  "lab_ready",
];

export function getLabReportStatusLabel(status: PatientStatus): string {
  if (status === "lab_ready") return "READY";
  return "PENDING";
}

export function isLabPending(status: PatientStatus) {
  return ["to_lab", "at_lab", "lab_processing"].includes(status);
}

export function isLabReady(status: PatientStatus) {
  return status === "lab_ready";
}

export function isTokenWaiting(status: PatientStatus) {
  return ["registered", "calling", "return_to_doctor", "in_followup"].includes(
    status,
  );
}
