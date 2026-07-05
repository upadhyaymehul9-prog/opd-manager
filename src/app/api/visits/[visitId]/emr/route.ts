import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeVisitEmr, visitEmrSelect } from "@/lib/emr";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";
import type { UpdateVisitEmrInput } from "@/lib/emr-types";

function trimOrNull(v: string | null | undefined) {
  return v?.trim() || null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;
    const visit = await prisma.patientVisit.findUnique({
      where: { id: visitId },
      select: visitEmrSelect,
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
    const session = await getSessionFromCookies();

    const existing = await prisma.patientVisit.findUnique({
      where: { id: visitId },
      select: { ...visitEmrSelect, medico_legal: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // A completed/discharged visit's signed record is final. Only
    // admin/manager can amend it afterwards (e.g. to correct an error),
    // and doing so re-stamps the signature below so the change is traceable.
    if (existing.status === "completed" && session?.role !== "admin" && session?.role !== "manager") {
      return NextResponse.json(
        { error: "Visit is completed — ask a manager/admin to amend a signed record" },
        { status: 403 },
      );
    }

    const visitData: Record<string, unknown> = {};

    if (body.chief_complaint !== undefined) {
      visitData.chief_complaint = trimOrNull(body.chief_complaint);
    }
    if (body.provisional_diagnosis !== undefined) {
      visitData.provisional_diagnosis = trimOrNull(body.provisional_diagnosis);
    }
    if (body.final_diagnosis !== undefined) {
      const finalDx = trimOrNull(body.final_diagnosis);
      visitData.final_diagnosis = finalDx;
      visitData.diagnosis = finalDx;
    }
    if (body.diagnosis !== undefined && body.final_diagnosis === undefined) {
      const dx = trimOrNull(body.diagnosis);
      visitData.diagnosis = dx;
      visitData.final_diagnosis = dx;
    }
    if (body.examination_notes !== undefined) {
      visitData.examination_notes = trimOrNull(body.examination_notes);
    }
    if (body.advice !== undefined) visitData.advice = trimOrNull(body.advice);
    if (body.lifestyle_advice !== undefined) {
      visitData.lifestyle_advice = trimOrNull(body.lifestyle_advice);
    }
    if (body.investigations_ordered !== undefined) {
      visitData.investigations_ordered = trimOrNull(body.investigations_ordered);
    }
    if (body.follow_up_instructions !== undefined) {
      visitData.follow_up_instructions = trimOrNull(body.follow_up_instructions);
    }
    if (body.referral_notes !== undefined) {
      visitData.referral_notes = trimOrNull(body.referral_notes);
    }
    if (body.follow_up_date !== undefined) {
      visitData.follow_up_date = body.follow_up_date
        ? new Date(body.follow_up_date)
        : null;
    }
    if (body.mlc_details !== undefined) {
      visitData.mlc_details = body.mlc_details?.trim() || null;
      if (body.mlc_details?.trim()) visitData.medico_legal = true;
    }
    if (body.vitals_bp !== undefined) visitData.vitals_bp = trimOrNull(body.vitals_bp);
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

    const hasClinicalChanges = Object.keys(visitData).length > 0;

    if (session && hasClinicalChanges) {
      visitData.signed_at = new Date();
      visitData.signed_by = session.displayName || session.username;
      visitData.signed_by_role = session.role;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Snapshot the clinical fields as they stood before this edit so the
      // prior version is retained forever — corrections append, they never
      // overwrite history.
      if (hasClinicalChanges) {
        await tx.visitEmrRevision.create({
          data: {
            patient_visit_id: visitId,
            snapshot: JSON.stringify(serializeVisitEmr(existing)),
            changed_by: session?.displayName || session?.username || "unknown",
            changed_by_role: session?.role ?? "unknown",
          },
        });
      }

      if (
        existing.patient_id &&
        (body.patient_allergies !== undefined || body.patient_blood_group !== undefined)
      ) {
        await tx.patient.update({
          where: { id: existing.patient_id },
          data: {
            ...(body.patient_allergies !== undefined && {
              allergies: trimOrNull(body.patient_allergies),
            }),
            ...(body.patient_blood_group !== undefined && {
              blood_group: trimOrNull(body.patient_blood_group),
            }),
          },
        });
      }

      return tx.patientVisit.update({
        where: { id: visitId },
        data: visitData,
        select: visitEmrSelect,
      });
    });

    await logAudit({
      action: AUDIT_ACTIONS.EMR_UPDATE,
      entity_type: "visit",
      entity_id: visitId,
      summary: `EMR updated for visit ${visitId.slice(0, 8)}…`,
      session,
    });

    return NextResponse.json(serializeVisitEmr(result));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
