import type { PatientStatus } from "@/lib/types";
import type { UserRole } from "@/lib/auth-types";
import { AppError } from "@/lib/api-error";

/**
 * Allowed from→to edges for the OPD visit status machine.
 * UI action lists are advisory; this graph is enforced on the API.
 */
const TRANSITIONS: Record<PatientStatus, readonly PatientStatus[]> = {
  registered: ["calling"],
  calling: ["in_consultation"],
  in_consultation: ["to_lab", "to_radiology", "to_pharmacy", "completed"],
  to_lab: ["lab_calling", "at_lab"],
  lab_calling: ["at_lab"],
  at_lab: ["lab_processing"],
  lab_processing: ["lab_ready"],
  lab_ready: ["return_to_doctor", "in_followup"],
  to_radiology: ["radio_calling", "at_radiology"],
  radio_calling: ["at_radiology"],
  at_radiology: ["radio_processing"],
  radio_processing: ["radio_ready"],
  radio_ready: ["return_to_doctor", "in_followup"],
  return_to_doctor: [
    "in_consultation",
    "in_followup",
    "to_lab",
    "to_radiology",
    "to_pharmacy",
    "completed",
  ],
  in_followup: [
    "in_consultation",
    "to_lab",
    "to_radiology",
    "to_pharmacy",
    "completed",
  ],
  to_pharmacy: ["at_pharmacy", "completed"],
  at_pharmacy: ["completed"],
  completed: [],
};

const CLINICAL_ROLES: UserRole[] = ["doctor", "reception", "admin", "manager"];
const LAB_ROLES: UserRole[] = ["lab", "admin", "manager"];
const RADIO_ROLES: UserRole[] = ["radiology", "admin", "manager"];
const PHARMACY_ROLES: UserRole[] = ["pharmacy", "admin", "manager"];
const SUPER_ROLES: UserRole[] = ["admin", "manager"];

const LAB_STATUSES: PatientStatus[] = [
  "to_lab",
  "lab_calling",
  "at_lab",
  "lab_processing",
  "lab_ready",
];
const RADIO_STATUSES: PatientStatus[] = [
  "to_radiology",
  "radio_calling",
  "at_radiology",
  "radio_processing",
  "radio_ready",
];
const PHARMACY_STATUSES: PatientStatus[] = ["to_pharmacy", "at_pharmacy"];
const DOCTOR_QUEUE_STATUSES: PatientStatus[] = [
  "registered",
  "calling",
  "in_consultation",
  "return_to_doctor",
  "in_followup",
  "to_lab",
  "to_radiology",
  "to_pharmacy",
  "completed",
];

export function allowedTransitionsFrom(
  from: PatientStatus,
): readonly PatientStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function isValidStatusTransition(
  from: PatientStatus,
  to: PatientStatus,
): boolean {
  if (from === to) return true;
  return allowedTransitionsFrom(from).includes(to);
}

/** Who may request a given target status (excluding admin/manager override). */
export function roleMaySetStatus(
  role: UserRole,
  from: PatientStatus,
  to: PatientStatus,
): boolean {
  if (SUPER_ROLES.includes(role)) return true;

  if (to === "completed") {
    // Pharmacy may only complete from pharmacy stages (bill gates checked separately).
    if (PHARMACY_ROLES.includes(role)) {
      return from === "to_pharmacy" || from === "at_pharmacy";
    }
    return CLINICAL_ROLES.includes(role);
  }

  if (LAB_STATUSES.includes(to) || (from.startsWith("lab") && to === "return_to_doctor") || (from === "lab_ready" && to === "in_followup")) {
    if (to === "to_lab") return CLINICAL_ROLES.includes(role);
    return LAB_ROLES.includes(role) || CLINICAL_ROLES.includes(role);
  }

  if (
    RADIO_STATUSES.includes(to) ||
    (from.startsWith("radio") && to === "return_to_doctor") ||
    (from === "radio_ready" && to === "in_followup")
  ) {
    if (to === "to_radiology") return CLINICAL_ROLES.includes(role);
    return RADIO_ROLES.includes(role) || CLINICAL_ROLES.includes(role);
  }

  if (PHARMACY_STATUSES.includes(to)) {
    if (to === "to_pharmacy") return CLINICAL_ROLES.includes(role);
    return PHARMACY_ROLES.includes(role) || CLINICAL_ROLES.includes(role);
  }

  if (DOCTOR_QUEUE_STATUSES.includes(to)) {
    return CLINICAL_ROLES.includes(role);
  }

  return false;
}

export function assertStatusTransition(opts: {
  from: PatientStatus;
  to: PatientStatus;
  role: UserRole;
  /** Admin/manager may force an edge outside the graph (still subject to discharge gates). */
  allowForce?: boolean;
}) {
  const { from, to, role } = opts;
  if (from === to) return;

  const force = Boolean(opts.allowForce && SUPER_ROLES.includes(role));

  if (!force && !isValidStatusTransition(from, to)) {
    throw new AppError(
      `Invalid status change: ${from} → ${to}. Follow the OPD workflow steps.`,
      400,
    );
  }

  if (!roleMaySetStatus(role, from, to)) {
    throw new AppError(
      `Your role (${role}) cannot set status to ${to}`,
      403,
    );
  }
}

export function clinicalRolesMayEditVisitMeta(role: UserRole) {
  return CLINICAL_ROLES.includes(role);
}
