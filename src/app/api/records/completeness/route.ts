import { NextResponse } from "next/server";
import { resolveRange } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";
import { buildRecordCompletenessReport } from "@/lib/record-completeness";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { rangeStart, rangeEndExclusive, from, to } = resolveRange(searchParams);

    const visits = await prisma.patientVisit.findMany({
      where: {
        registered_at: {
          gte: rangeStart,
          lt: rangeEndExclusive,
        },
      },
      select: {
        id: true,
        token_number: true,
        patient_name: true,
        doctor_id: true,
        status: true,
        registered_at: true,
        completed_at: true,
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
        signed_at: true,
        medico_legal: true,
        doctors: { select: { name: true } },
        patient: { select: { patient_number: true } },
        mlc_record: {
          select: { arrival_at: true, police_intimated_at: true },
        },
      },
      orderBy: { registered_at: "desc" },
    });

    return NextResponse.json(buildRecordCompletenessReport(visits, from, to));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
