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
  visitsWithMobile: number;
  visitsMobileVerified: number;
  mlcVisits: number;
  mlcDocumented: number;
  feedbackToday: number;
  visitsSigned: number;
}): { score: number; items: NabhCheckItem[] } {
  const noneToday = input.todayVisits === 0;

  const items: NabhCheckItem[] = [
    {
      id: "aac-id",
      standard: "AAC.1d",
      requirement: "Unique permanent patient ID (P-number + optional ABHA)",
      status: noneToday ? "partial" : "met",
      note: noneToday
        ? "No registrations today."
        : "P-number assigned at registration; ABHA supported.",
    },
    {
      id: "aac-consent",
      standard: "PRE / IMS",
      requirement: "Informed consent documented at registration",
      status: noneToday
        ? "partial"
        : input.visitsWithConsent >= input.todayVisits
          ? "met"
          : input.visitsWithConsent > 0
            ? "partial"
            : "gap",
      note: noneToday
        ? "No registrations today."
        : `${input.visitsWithConsent}/${input.todayVisits} visits with consent text stored today.`,
    },
    {
      id: "aac-emr",
      standard: "COP.1a",
      requirement: "OPD consultation documented (complaint, findings, diagnosis)",
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
      id: "cop-summary",
      standard: "COP.1i / COP.1k",
      requirement: "Structured OPD summary + multilingual (English/Hindi)",
      status:
        input.visitsCompleted === 0 && noneToday
          ? "partial"
          : input.visitsSigned >= input.visitsWithEmr && input.visitsWithEmr > 0
            ? "met"
            : "partial",
      note:
        "Printable summary on Records with Hindi labels. Clinical text remains as entered by doctor.",
    },
    {
      id: "aac-origin",
      standard: "AAC.1c",
      requirement: "Point of origin captured at registration",
      status: noneToday ? "partial" : "met",
      note: "Walk-in, referral, website, phone, health camp, BookMyClinic.",
    },
    {
      id: "aac-dup",
      standard: "AAC.1g",
      requirement: "Duplicate registration detection",
      status: "met",
      note: "Live duplicate alert; new registration blocked until staff confirms or selects existing patient.",
    },
    {
      id: "aac-mobile",
      standard: "AAC.1b",
      requirement: "Mobile number verification",
      status:
        input.visitsWithMobile === 0
          ? "partial"
          : input.visitsMobileVerified >= input.visitsWithMobile
            ? "met"
            : input.visitsMobileVerified > 0
              ? "partial"
              : "gap",
      note:
        input.visitsWithMobile === 0
          ? "No mobiles captured today."
          : `${input.visitsMobileVerified}/${input.visitsWithMobile} mobiles verified today.`,
    },
    {
      id: "aac-feedback",
      standard: "AAC.6a",
      requirement: "Patient satisfaction survey (5 questions, 5-point scale)",
      status:
        input.feedbackToday > 0 ? "met" : noneToday ? "partial" : "partial",
      note:
        input.feedbackToday > 0
          ? `${input.feedbackToday} survey(s) submitted today.`
          : "Public /feedback page active; share QR/link at discharge.",
    },
    {
      id: "cop-mlc",
      standard: "COP.3a",
      requirement: "Medico-legal case documentation",
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
      id: "cop-sign",
      standard: "COP.1j",
      requirement: "Practitioner authentication on clinical records",
      status:
        input.visitsSigned === 0 && noneToday
          ? "partial"
          : input.visitsSigned >= input.visitsWithEmr && input.visitsWithEmr > 0
            ? "met"
            : "partial",
      note: `${input.visitsSigned} EMR record(s) authenticated today.`,
    },
    {
      id: "mom-allergy",
      standard: "MOM",
      requirement: "Allergy documentation on patient file",
      status: "met",
      note: "Allergies in EMR with alert on doctor queue.",
    },
    {
      id: "ims-audit",
      standard: "IMS.8",
      requirement: "Audit trail for critical events",
      status: input.auditLogsToday > 0 ? "met" : "partial",
      note: `${input.auditLogsToday} audit events logged today.`,
    },
    {
      id: "patient-safety",
      standard: "PSG",
      requirement: "Incident / adverse event reporting",
      status: "met",
      note:
        input.openIncidents > 0
          ? `${input.openIncidents} open incident(s) under review.`
          : "Incident module active; no open incidents.",
    },
    {
      id: "abdm",
      standard: "ABDM",
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
          : `${input.visitsWithAbhaToday}/${input.todayVisits} today's visits linked to ABHA; manual entry supported.`,
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

/** NABH COP.1i: minimum fields before OPD discharge */
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
