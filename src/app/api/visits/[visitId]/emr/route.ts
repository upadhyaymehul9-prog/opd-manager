import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeVisitEmr } from "@/lib/emr";
import type { UpdateVisitEmrInput } from "@/lib/emr-types";

const emrSelect = {
  id: true,
  patient_id: true,
  chief_complaint: true,
  diagnosis: true,
  examination_notes: true,
  advice: true,
  vitals_bp: true,
  vitals_pulse: true,
  vitals_temp: true,
  vitals_weight: true,
  vitals_spo2: true,
  updated_at: true,
  patient: {
    select: { allergies: true, blood_group: true },
  },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;
    const visit = await prisma.patientVisit.findUnique({
      where: { id: visitId },
      select: emrSelect,
    });

    if (!visit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(serializeVisitEmr(visit));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load EMR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;
    const body = (await request.json()) as UpdateVisitEmrInput;

    const existing = await prisma.patientVisit.findUnique({
      where: { id: visitId },
      select: { id: true, patient_id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const visitData: Record<string, unknown> = {};
    if (body.chief_complaint !== undefined) {
      visitData.chief_complaint = body.chief_complaint?.trim() || null;
    }
    if (body.diagnosis !== undefined) {
      visitData.diagnosis = body.diagnosis?.trim() || null;
    }
    if (body.examination_notes !== undefined) {
      visitData.examination_notes = body.examination_notes?.trim() || null;
    }
    if (body.advice !== undefined) {
      visitData.advice = body.advice?.trim() || null;
    }
    if (body.vitals_bp !== undefined) {
      visitData.vitals_bp = body.vitals_bp?.trim() || null;
    }
    if (body.vitals_pulse !== undefined) {
      visitData.vitals_pulse =
        body.vitals_pulse != null && body.vitals_pulse > 0
          ? Math.round(body.vitals_pulse)
          : null;
    }
    if (body.vitals_temp !== undefined) {
      visitData.vitals_temp =
        body.vitals_temp != null && body.vitals_temp > 0 ? body.vitals_temp : null;
    }
    if (body.vitals_weight !== undefined) {
      visitData.vitals_weight =
        body.vitals_weight != null && body.vitals_weight > 0
          ? body.vitals_weight
          : null;
    }
    if (body.vitals_spo2 !== undefined) {
      visitData.vitals_spo2 =
        body.vitals_spo2 != null && body.vitals_spo2 > 0
          ? Math.min(100, Math.round(body.vitals_spo2))
          : null;
    }

    const result = await prisma.$transaction(async (tx) => {
      if (
        existing.patient_id &&
        (body.patient_allergies !== undefined || body.patient_blood_group !== undefined)
      ) {
        await tx.patient.update({
          where: { id: existing.patient_id },
          data: {
            ...(body.patient_allergies !== undefined && {
              allergies: body.patient_allergies?.trim() || null,
            }),
            ...(body.patient_blood_group !== undefined && {
              blood_group: body.patient_blood_group?.trim() || null,
            }),
          },
        });
      }

      return tx.patientVisit.update({
        where: { id: visitId },
        data: visitData,
        select: emrSelect,
      });
    });

    return NextResponse.json(serializeVisitEmr(result));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
