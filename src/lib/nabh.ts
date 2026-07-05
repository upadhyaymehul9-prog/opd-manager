export type NabhCheckItem = {
  id: string;
  standard: string;
  requirement: string;
  status: "met" | "partial" | "gap";
  note: string;
};

export function buildNabhChecklist(input: {
  todayVisits: number;
  visitsWithConsent: number;
  visitsWithEmr: number;
  visitsWithAbhaToday: number;
  openIncidents: number;
  auditLogsToday: number;
  visitsCompleted: number;
  visitsWithTwoIdentifiers: number;
  mlcVisits: number;
  mlcDocumented: number;
  feedbackToday: number;
  visitsSigned: number;
}): { score: number; items: NabhCheckItem[] } {
  const noneToday = input.todayVisits === 0;

  // Standard codes below were cross-checked line-by-line against the NABH
  // 6th Edition Objective Elements (639 OEs, AAC/COP/MOM/PRE/IPC/PSQ/ROM/FMS/HRM/IMS).
  // Items with no matching OE are labelled "Internal practice" rather than a
  // fabricated code — they're useful operational metrics but aren't themselves
  // an accreditation requirement.
  const items: NabhCheckItem[] = [
    {
      id: "aac-id",
      standard: "AAC.2b (CORE)",
      requirement: "Unique permanent patient ID generated at registration",
      status: noneToday ? "partial" : "met",
      note: noneToday
        ? "No registrations today."
        : "P-number assigned automatically at registration; ABHA supported as secondary ID.",
    },
    {
      id: "cop-two-identifiers",
      standard: "COP.1b (CORE)",
      requirement: "Uniform process to identify patients using at least two identifiers",
      status: noneToday
        ? "partial"
        : input.visitsWithTwoIdentifiers >= Math.ceil(input.todayVisits * 0.8)
          ? "met"
          : input.visitsWithTwoIdentifiers > 0
            ? "partial"
            : "gap",
      note: `${input.visitsWithTwoIdentifiers}/${input.todayVisits} visits captured with a second identifier (mobile/age) alongside the P-number today.`,
    },
    {
      id: "pre-consent",
      standard: "PRE.4a (CORE)",
      requirement: "Informed consent obtained from patient/family for care",
      status: noneToday
        ? "partial"
        : input.visitsWithConsent >= input.todayVisits
          ? "met"
          : input.visitsWithConsent > 0
            ? "partial"
            : "gap",
      note: noneToday
        ? "No registrations today."
        : `${input.visitsWithConsent}/${input.todayVisits} visits with consent recorded today.`,
    },
    {
      id: "ims-record",
      standard: "IMS.4a-c",
      requirement: "Medical record contains diagnosis, findings and care details",
      status: noneToday
        ? "partial"
        : input.visitsWithEmr >= Math.ceil(input.todayVisits * 0.8)
          ? "met"
          : input.visitsWithEmr > 0
            ? "partial"
            : "gap",
      note: `${input.visitsWithEmr}/${input.todayVisits} visits with EMR notes today.`,
    },
    {
      id: "ims-signed",
      standard: "IMS.3e",
      requirement: "Medical record entries signed, dated and timed",
      status:
        noneToday || input.visitsWithEmr === 0
          ? "partial"
          : input.visitsSigned >= input.visitsWithEmr
            ? "met"
            : input.visitsSigned > 0
              ? "partial"
              : "gap",
      note: `${input.visitsSigned}/${input.visitsWithEmr} EMR record(s) with a practitioner signature today.`,
    },
    {
      id: "ims-discharge-summary",
      standard: "IMS.4f / AAC.13a-d",
      requirement: "Structured discharge/OPD summary provided to patient",
      status:
        input.visitsCompleted === 0
          ? "partial"
          : input.visitsSigned >= input.visitsCompleted
            ? "met"
            : "partial",
      note: "Printable OPD summary available on Records with Hindi labels alongside the clinician's original text.",
    },
    {
      id: "aac-origin",
      standard: "Internal practice",
      requirement: "Point of origin captured at registration",
      status: noneToday ? "partial" : "met",
      note: "Walk-in, referral, website, phone, health camp, BookMyClinic. Not itself an NABH OE, but supports AAC.2 registration guidance.",
    },
    {
      id: "aac-dup",
      standard: "Internal practice",
      requirement: "Duplicate registration detection",
      status: "met",
      note: "Live duplicate alert; new registration blocked until staff confirms or selects existing patient. Protects the AAC.2b unique-ID guarantee.",
    },
    {
      id: "pre-feedback",
      standard: "PRE.7a",
      requirement: "Mechanism to capture patient feedback, incl. satisfaction",
      status: input.feedbackToday > 0 ? "met" : "partial",
      note:
        input.feedbackToday > 0
          ? `${input.feedbackToday} survey(s) submitted today.`
          : "Public /feedback page active; share QR/link at discharge.",
    },
    {
      id: "cop-mlc",
      standard: "COP.2c (CORE)",
      requirement: "Medico-legal cases handled per statutory requirements",
      status:
        input.mlcVisits === 0
          ? "partial"
          : input.mlcDocumented >= input.mlcVisits
            ? "met"
            : "gap",
      note:
        input.mlcVisits === 0
          ? "No MLC cases today."
          : `${input.mlcDocumented}/${input.mlcVisits} MLC visits with Annexure D details.`,
    },
    {
      id: "mom-allergy",
      standard: "MOM.4c",
      requirement: "Drug allergies ascertained before prescribing",
      status: "met",
      note: "Allergies stored on patient file with alert on doctor queue.",
    },
    {
      id: "mom-nearmiss",
      standard: "MOM.8c (CORE)",
      requirement: "Near-misses, medication errors and adverse drug reactions captured",
      status: "met",
      note: "Incident module supports medication_error, adverse_reaction and near_miss categories.",
    },
    {
      id: "ims-audit",
      standard: "Internal practice",
      requirement: "Audit trail for critical events",
      status: input.auditLogsToday > 0 ? "met" : "partial",
      note: `${input.auditLogsToday} audit events logged today. Supports IMS.3 record-authorship traceability; not itself a distinct OE.`,
    },
    {
      id: "psq-incident",
      standard: "PSQ.7a (CORE)",
      requirement: "Incident management system implemented",
      status: "met",
      note:
        input.openIncidents > 0
          ? `${input.openIncidents} open incident(s) under review.`
          : "Incident module active; no open incidents.",
    },
    {
      id: "abdm",
      standard: "Govt initiative (ABDM)",
      requirement: "ABHA linkage at registration",
      status:
        noneToday
          ? "partial"
          : input.visitsWithAbhaToday > 0
            ? "partial"
            : "gap",
      note:
        noneToday
          ? "No registrations today."
          : `${input.visitsWithAbhaToday}/${input.todayVisits} today's visits linked to ABHA; manual entry supported. Not itself an NABH OE (supports IMS.1h digital health, Excellence level).`,
    },
  ];

  const score = Math.round(
    (items.filter((i) => i.status === "met").length / items.length) * 100,
  );

  return { score, items };
}

export function visitHasEmr(visit: {
  chief_complaint: string | null;
  diagnosis: string | null;
  final_diagnosis?: string | null;
  examination_notes: string | null;
  advice: string | null;
  vitals_bp: string | null;
  vitals_pulse: number | null;
  vitals_temp: number | null;
  vitals_weight: number | null;
  vitals_spo2: number | null;
}): boolean {
  const dx = visit.final_diagnosis?.trim() || visit.diagnosis?.trim();
  return Boolean(
    visit.chief_complaint?.trim() ||
      dx ||
      visit.examination_notes?.trim() ||
      visit.advice?.trim() ||
      visit.vitals_bp?.trim() ||
      visit.vitals_pulse != null ||
      visit.vitals_temp != null ||
      visit.vitals_weight != null ||
      visit.vitals_spo2 != null,
  );
}

/** Minimum EMR fields required before a visit can be marked completed (discharge readiness gate) */
export function visitEmrCompleteForDischarge(visit: {
  chief_complaint: string | null;
  diagnosis: string | null;
  final_diagnosis?: string | null;
}): boolean {
  const dx = visit.final_diagnosis?.trim() || visit.diagnosis?.trim();
  return Boolean(visit.chief_complaint?.trim() && dx);
}

export const INCIDENT_CATEGORIES = [
  { id: "medication_error", label: "Medication error" },
  { id: "adverse_reaction", label: "Adverse drug reaction" },
  { id: "near_miss", label: "Near miss" },
  { id: "patient_fall", label: "Patient fall / injury" },
  { id: "wrong_patient", label: "Wrong patient / ID error" },
  { id: "equipment", label: "Equipment / facility" },
  { id: "other", label: "Other" },
] as const;

export const INCIDENT_SEVERITIES = [
  { id: "low", label: "Low" },
  { id: "moderate", label: "Moderate" },
  { id: "high", label: "High" },
] as const;

export const CONSENT_TEXT_V1 = `I consent to examination and treatment at this clinic. I understand my health information will be stored securely for continuity of care. I may request a copy of my records. (NABH consent v1.0)`;
