import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";
import { nextCasualtyNumber, serializeMlcRecord } from "@/lib/mlc";
import type { UpdateMlcRecordInput } from "@/lib/mlc";

function trimOrNull(v: string | null | undefined) {
  return v?.trim() || null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;
    const record = await prisma.mlcRecord.findUnique({
      where: { patient_visit_id: visitId },
    });
    return NextResponse.json(record ? serializeMlcRecord(record) : null);
  } catch (e) {
    return errorResponse("visits/[visitId]/mlc GET", e, "Failed to load MLC record");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const visit = await prisma.patientVisit.findUnique({
      where: { id: visitId },
      select: { id: true, registered_at: true },
    });
    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const existing = await prisma.mlcRecord.findUnique({
      where: { patient_visit_id: visitId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "MLC record already exists for this visit" },
        { status: 400 },
      );
    }

    const rawBody = await request.text();
    const body = rawBody
      ? (JSON.parse(rawBody) as { arrival_at?: string })
      : {};

    const record = await prisma.$transaction(async (tx) => {
      const casualty_number = await nextCasualtyNumber(tx);
      return tx.mlcRecord.create({
        data: {
          patient_visit_id: visitId,
          casualty_number,
          arrival_at: body.arrival_at ? new Date(body.arrival_at) : visit.registered_at,
          created_by: session.displayName || session.username,
          created_by_role: session.role,
        },
      });
    });

    await prisma.patientVisit.update({
      where: { id: visitId },
      data: { medico_legal: true },
    });

    await logAudit({
      action: AUDIT_ACTIONS.MLC_RECORD_CREATE,
      entity_type: "mlc_record",
      entity_id: record.id,
      summary: `MLC record #${record.casualty_number} opened for visit ${visitId.slice(0, 8)}…`,
      session,
    });

    return NextResponse.json(serializeMlcRecord(record), { status: 201 });
  } catch (e) {
    return errorResponse("visits/[visitId]/mlc POST", e, "Failed to create MLC record");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.mlcRecord.findUnique({
      where: { patient_visit_id: visitId },
    });
    if (!existing) {
      return NextResponse.json({ error: "MLC record not found" }, { status: 404 });
    }

    const body = (await request.json()) as UpdateMlcRecordInput;
    const data: Record<string, unknown> = {};

    if (body.arrival_at !== undefined) data.arrival_at = new Date(body.arrival_at);
    if (body.brought_by_name !== undefined) data.brought_by_name = trimOrNull(body.brought_by_name);
    if (body.brought_by_relation !== undefined) data.brought_by_relation = trimOrNull(body.brought_by_relation);
    if (body.history_own_words !== undefined) data.history_own_words = trimOrNull(body.history_own_words);
    if (body.identification_mark_1 !== undefined) data.identification_mark_1 = trimOrNull(body.identification_mark_1);
    if (body.identification_mark_2 !== undefined) data.identification_mark_2 = trimOrNull(body.identification_mark_2);
    if (body.injury_description !== undefined) data.injury_description = trimOrNull(body.injury_description);
    if (body.treatment_given !== undefined) data.treatment_given = trimOrNull(body.treatment_given);
    if (body.patient_status !== undefined) data.patient_status = trimOrNull(body.patient_status);
    if (body.dying_declaration_needed !== undefined) data.dying_declaration_needed = Boolean(body.dying_declaration_needed);
    if (body.evidence_collected !== undefined) data.evidence_collected = trimOrNull(body.evidence_collected);
    if (body.police_station !== undefined) data.police_station = trimOrNull(body.police_station);
    if (body.police_officer_name !== undefined) data.police_officer_name = trimOrNull(body.police_officer_name);
    if (body.fir_ddr_number !== undefined) data.fir_ddr_number = trimOrNull(body.fir_ddr_number);
    if (body.police_intimated_at !== undefined) {
      data.police_intimated_at = body.police_intimated_at ? new Date(body.police_intimated_at) : null;
    }
    if (body.acknowledgment_receipt_ref !== undefined) data.acknowledgment_receipt_ref = trimOrNull(body.acknowledgment_receipt_ref);
    if (body.acknowledgment_received_at !== undefined) {
      data.acknowledgment_received_at = body.acknowledgment_received_at
        ? new Date(body.acknowledgment_received_at)
        : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(serializeMlcRecord(existing));
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Append-only: snapshot the pre-edit state before overwriting, same
      // pattern as EMR revisions — an MLC record must never silently change
      // without a retained trace of what it said before.
      await tx.mlcRecordRevision.create({
        data: {
          mlc_record_id: existing.id,
          snapshot: JSON.stringify(serializeMlcRecord(existing)),
          changed_by: session.displayName || session.username,
          changed_by_role: session.role,
        },
      });

      return tx.mlcRecord.update({
        where: { id: existing.id },
        data,
      });
    });

    await logAudit({
      action: AUDIT_ACTIONS.MLC_RECORD_UPDATE,
      entity_type: "mlc_record",
      entity_id: existing.id,
      summary: `MLC record #${existing.casualty_number} updated`,
      session,
    });

    return NextResponse.json(serializeMlcRecord(updated));
  } catch (e) {
    return errorResponse("visits/[visitId]/mlc PATCH", e, "Failed to update MLC record");
  }
}
