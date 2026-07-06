import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";
import { mergePatients } from "@/lib/patient-merge";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin" && session.role !== "manager") {
      return NextResponse.json(
        { error: "Only manager/admin can merge patient records" },
        { status: 403 },
      );
    }

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

    const summary = await prisma.$transaction((tx) =>
      mergePatients(tx, {
        sourceId,
        targetId,
        mergedBy: session.displayName || session.username,
        reason,
      }),
    );

    const [source, target] = await Promise.all([
      prisma.patient.findUnique({ where: { id: sourceId } }),
      prisma.patient.findUnique({ where: { id: targetId } }),
    ]);

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
    const message = e instanceof Error ? e.message : "Merge failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
