import { differenceInHours } from "date-fns";
import { isPoliceIntimationOverdue } from "@/lib/mlc";
import { visitEmrCompleteForDischarge, visitHasEmr } from "@/lib/nabh";
import type { PatientStatus } from "@/lib/types";

/** Hours after registration before an unfinished EMR is flagged (MRD delinquent threshold). */
export const EMR_DELINQUENT_HOURS = 48;

export type DelinquencyIssue =
  | "completed_without_emr"
  | "emr_incomplete"
  | "emr_unsigned"
  | "mlc_no_record"
  | "mlc_police_overdue";

export type DelinquentVisit = {
  visit_id: string;
  token_number: number;
  patient_number: number | null;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  status: PatientStatus;
  registered_at: string;
  completed_at: string | null;
  hours_since_registration: number;
  issues: DelinquencyIssue[];
  missing_fields: string[];
};

export type RecordCompletenessSummary = {
  from: string;
  to: string;
  total_visits: number;
  emr_complete: number;
  emr_started: number;
  delinquent_count: number;
  delinquent_rate: number;
  by_issue: Record<DelinquencyIssue, number>;
  by_doctor: {
    doctor_id: string;
    doctor_name: string;
    total: number;
    delinquent: number;
    rate: number;
  }[];
  items: DelinquentVisit[];
};

const POST_CONSULTATION_STATUSES: PatientStatus[] = [
  "in_consultation",
  "return_to_doctor",
  "in_followup",
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
  "to_pharmacy",
  "at_pharmacy",
  "completed",
];

type VisitRow = {
  id: string;
  token_number: number;
  patient_name: string;
  doctor_id: string;
  status: string;
  registered_at: Date;
  completed_at: Date | null;
  chief_complaint: string | null;
  diagnosis: string | null;
  final_diagnosis: string | null;
  examination_notes: string | null;
  advice: string | null;
  vitals_bp: string | null;
  vitals_pulse: number | null;
  vitals_temp: number | null;
  vitals_weight: number | null;
  vitals_spo2: number | null;
  signed_at: Date | null;
  medico_legal: boolean;
  doctors: { name: string } | null;
  patient: { patient_number: number } | null;
  mlc_record: {
    arrival_at: Date;
    police_intimated_at: Date | null;
  } | null;
};

function missingEmrFields(visit: VisitRow): string[] {
  const missing: string[] = [];
  if (!visit.chief_complaint?.trim()) missing.push("chief complaint");
  const dx = visit.final_diagnosis?.trim() || visit.diagnosis?.trim();
  if (!dx) missing.push("diagnosis");
  return missing;
}

function assessVisit(visit: VisitRow, now = new Date()): DelinquencyIssue[] {
  const issues: DelinquencyIssue[] = [];
  const status = visit.status as PatientStatus;
  const emrComplete = visitEmrCompleteForDischarge(visit);
  const hours = differenceInHours(now, visit.registered_at);

  if (status === "completed" && !emrComplete) {
    issues.push("completed_without_emr");
  }

  const emrDue =
    POST_CONSULTATION_STATUSES.includes(status) ||
    (hours >= EMR_DELINQUENT_HOURS && status !== "registered" && status !== "calling");

  if (emrDue && !emrComplete && status !== "completed") {
    issues.push("emr_incomplete");
  }

  if (
    emrComplete &&
    visitHasEmr(visit) &&
    !visit.signed_at &&
    POST_CONSULTATION_STATUSES.includes(status)
  ) {
    issues.push("emr_unsigned");
  }

  if (visit.medico_legal && !visit.mlc_record) {
    issues.push("mlc_no_record");
  }

  if (visit.mlc_record && isPoliceIntimationOverdue(visit.mlc_record)) {
    issues.push("mlc_police_overdue");
  }

  return issues;
}

export function buildRecordCompletenessReport(
  visits: VisitRow[],
  from: string,
  to: string,
): RecordCompletenessSummary {
  const now = new Date();
  const byIssue: Record<DelinquencyIssue, number> = {
    completed_without_emr: 0,
    emr_incomplete: 0,
    emr_unsigned: 0,
    mlc_no_record: 0,
    mlc_police_overdue: 0,
  };

  const items: DelinquentVisit[] = [];
  let emrComplete = 0;
  let emrStarted = 0;

  const doctorMap = new Map<
    string,
    { doctor_name: string; total: number; delinquent: number }
  >();

  for (const visit of visits) {
    if (visitHasEmr(visit)) emrStarted++;
    if (visitEmrCompleteForDischarge(visit)) emrComplete++;

    const docName = visit.doctors?.name ?? "Unknown";
    const docStats = doctorMap.get(visit.doctor_id) ?? {
      doctor_name: docName,
      total: 0,
      delinquent: 0,
    };
    docStats.total++;

    const issues = assessVisit(visit, now);
    if (issues.length > 0) {
      docStats.delinquent++;
      for (const issue of issues) byIssue[issue]++;
      items.push({
        visit_id: visit.id,
        token_number: visit.token_number,
        patient_number: visit.patient?.patient_number ?? null,
        patient_name: visit.patient_name,
        doctor_id: visit.doctor_id,
        doctor_name: docName,
        status: visit.status as PatientStatus,
        registered_at: visit.registered_at.toISOString(),
        completed_at: visit.completed_at?.toISOString() ?? null,
        hours_since_registration: differenceInHours(now, visit.registered_at),
        issues,
        missing_fields: missingEmrFields(visit),
      });
    }

    doctorMap.set(visit.doctor_id, docStats);
  }

  items.sort((a, b) => {
    const rank = (v: DelinquentVisit) =>
      v.issues.includes("completed_without_emr")
        ? 0
        : v.issues.includes("mlc_police_overdue")
          ? 1
          : v.issues.includes("mlc_no_record")
            ? 2
            : 3;
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return b.hours_since_registration - a.hours_since_registration;
  });

  const delinquent_count = items.length;
  const total_visits = visits.length;

  return {
    from,
    to,
    total_visits,
    emr_complete: emrComplete,
    emr_started: emrStarted,
    delinquent_count,
    delinquent_rate:
      total_visits > 0
        ? Math.round((delinquent_count / total_visits) * 1000) / 10
        : 0,
    by_issue: byIssue,
    by_doctor: [...doctorMap.entries()]
      .map(([doctor_id, s]) => ({
        doctor_id,
        doctor_name: s.doctor_name,
        total: s.total,
        delinquent: s.delinquent,
        rate:
          s.total > 0 ? Math.round((s.delinquent / s.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.delinquent - a.delinquent || b.rate - a.rate),
    items,
  };
}

export const ISSUE_LABELS: Record<DelinquencyIssue, string> = {
  completed_without_emr: "Completed without EMR",
  emr_incomplete: "EMR incomplete",
  emr_unsigned: "EMR not signed",
  mlc_no_record: "MLC — no register entry",
  mlc_police_overdue: "MLC — police intimation overdue",
};

export const ISSUE_STYLES: Record<DelinquencyIssue, string> = {
  completed_without_emr: "bg-red-100 text-red-900",
  emr_incomplete: "bg-amber-100 text-amber-900",
  emr_unsigned: "bg-slate-100 text-slate-800",
  mlc_no_record: "bg-orange-100 text-orange-900",
  mlc_police_overdue: "bg-red-200 text-red-950",
};
