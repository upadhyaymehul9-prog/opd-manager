import { startOfDay } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";
import { buildNabhChecklist, visitHasEmr } from "@/lib/nabh";
import { isPoliceIntimationOverdue } from "@/lib/mlc";

export async function getNabhComplianceSnapshot() {
  const todayStart = startOfDay(new Date());

  const [visits, auditCount, openIncidents, feedbackToday, feedbackAvg] =
    await Promise.all([
      prisma.patientVisit.findMany({
        where: { registered_at: { gte: todayStart } },
        select: {
          id: true,
          chief_complaint: true,
          diagnosis: true,
          final_diagnosis: true,
          examination_notes: true,
          advice: true,
          vitals_bp: true,
          vitals_pulse: true,
          vitals_temp: true,
          vitals_weight: true,
          vitals_spo2: true,
          status: true,
          medico_legal: true,
          signed_at: true,
          age: true,
          mobile: true,
          consent: { select: { id: true, consent_text: true } },
          patient: {
            select: { abha_id: true },
          },
        },
      }),
      prisma.auditLog.count({
        where: { created_at: { gte: todayStart } },
      }),
      prisma.incidentReport.count({ where: { status: "open" } }),
      prisma.patientFeedback.count({
        where: { created_at: { gte: todayStart } },
      }),
      prisma.patientFeedback.aggregate({
        _avg: {
          q1_overall: true,
          q2_care_quality: true,
          q3_communication: true,
          q4_environment: true,
          q5_registration: true,
        },
      }),
    ]);

  const visitsWithConsent = visits.filter((v) => v.consent).length;
  const visitsWithEmr = visits.filter((v) => visitHasEmr(v)).length;
  const visitsCompleted = visits.filter((v) => v.status === "completed").length;
  const visitsWithAbhaToday = visits.filter((v) => v.patient?.abha_id).length;
  const mlcVisits = visits.filter((v) => v.medico_legal);
  const mlcRecords =
    mlcVisits.length > 0
      ? await prisma.mlcRecord.findMany({
          where: { patient_visit_id: { in: mlcVisits.map((v) => v.id) } },
          select: { arrival_at: true, police_intimated_at: true },
        })
      : [];
  const mlcDocumented = mlcRecords.filter(
    (r) => !isPoliceIntimationOverdue(r),
  ).length;
  const visitsSigned = visits.filter((v) => v.signed_at).length;
  const visitsWithTwoIdentifiers = visits.filter(
    (v) => v.mobile && v.age != null,
  ).length;

  const avgParts = [
    feedbackAvg._avg.q1_overall,
    feedbackAvg._avg.q2_care_quality,
    feedbackAvg._avg.q3_communication,
    feedbackAvg._avg.q4_environment,
    feedbackAvg._avg.q5_registration,
  ].filter((v): v is number => v != null);
  const feedbackAverage =
    avgParts.length > 0
      ? Math.round(
          (avgParts.reduce((a, b) => a + b, 0) / avgParts.length) * 10,
        ) / 10
      : null;

  return {
    ...buildNabhChecklist({
      todayVisits: visits.length,
      visitsWithConsent,
      visitsWithEmr,
      visitsWithAbhaToday,
      openIncidents,
      auditLogsToday: auditCount,
      visitsCompleted,
      visitsWithTwoIdentifiers,
      mlcVisits: mlcVisits.length,
      mlcDocumented,
      feedbackToday,
      visitsSigned,
    }),
    feedbackAverage,
    feedbackToday,
  };
}
