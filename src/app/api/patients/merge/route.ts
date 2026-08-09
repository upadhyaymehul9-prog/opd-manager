import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { withClinicScope } from "@/lib/tenant";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { mergePatients } from "@/lib/patient-merge";

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const body = await request.json();
    const sourceId = String(body.source_patient_id ?? "").trim();
    const targetId = String(body.target_patient_id ?? "").trim();
    const reason = String(body.reason ?? "").trim();

    if (!sourceId || !targetId) {
      return NextResponse.json(
        { error: "source_patient_id and target_patient_id are required" },
        { status: 400 },
      );
    }
    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required for merging two patient records" },
        { status: 400 },
      );
    }

    const { summary, source, target } = await withClinicScope(
      session.clinicId,
      async (tx) => {
        const summary = await mergePatients(tx, {
          sourceId,
          targetId,
          mergedBy: session.displayName || session.username,
          reason,
        });

        const [source, target] = await Promise.all([
          tx.patient.findUnique({ where: { id: sourceId } }),
          tx.patient.findUnique({ where: { id: targetId } }),
        ]);

        return { summary, source, target };
      },
    );

    await logAudit({
      action: AUDIT_ACTIONS.PATIENT_MERGE,
      entity_type: "patient",
      entity_id: targetId,
      summary: `Merged P-${source?.patient_number} into P-${target?.patient_number}: ${reason}`,
      details: { source_patient_id: sourceId, target_patient_id: targetId, reason, ...summary },
      session,
    });

    return NextResponse.json({ ok: true, target, summary });
  } catch (e) {
    return errorResponse("patients/merge POST", e, "Merge failed");
  }
}
