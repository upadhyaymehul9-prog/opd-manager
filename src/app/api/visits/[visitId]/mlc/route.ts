import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { withClinicScope } from "@/lib/tenant";
import {
  AUDIT_ACTIONS,
  logAudit,
  logAuditTx,
} from "@/lib/audit";
import { nextCasualtyNumber, serializeMlcRecord } from "@/lib/mlc";
import type { UpdateMlcRecordInput } from "@/lib/mlc";

function trimOrNull(v: string | null | undefined) {
  return v?.trim() || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { visitId } = await params;
    const record = await withClinicScope(session.clinicId, (tx) =>
      tx.mlcRecord.findUnique({
        where: { patient_visit_id: visitId },
      }),
    );
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
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { visitId } = await params;

    const rawBody = await request.text();
    const body = rawBody
      ? (JSON.parse(rawBody) as { arrival_at?: string })
      : {};

    const record = await withClinicScope(session.clinicId, async (tx) => {
      const visit = await tx.patientVisit.findUnique({
        where: { id: visitId },
        select: { id: true, registered_at: true },
      });
      if (!visit) {
        throw new AppError("Visit not found", 404);
      }

      const existing = await tx.mlcRecord.findUnique({
        where: { patient_visit_id: visitId },
      });
      if (existing) {
        throw new AppError("MLC record already exists for this visit", 400);
      }

      const casualty_number = await nextCasualtyNumber(tx, session.clinicId);
      const created = await tx.mlcRecord.create({
        data: {
          clinic_id: session.clinicId,
          patient_visit_id: visitId,
          casualty_number,
          arrival_at: body.arrival_at ? new Date(body.arrival_at) : visit.registered_at,
          created_by: session.displayName || session.username,
          created_by_role: session.role,
        },
      });

      await tx.patientVisit.update({
        where: { id: visitId },
        data: { medico_legal: true },
      });

      return created;
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
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { visitId } = await params;
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

    const hasChanges = Object.keys(data).length > 0;

    const { existing, updated } = await withClinicScope(session.clinicId, async (tx) => {
      const existing = await tx.mlcRecord.findUnique({
        where: { patient_visit_id: visitId },
      });
      if (!existing) {
        throw new AppError("MLC record not found", 404);
      }

      if (!hasChanges) {
        return { existing, updated: existing };
      }

      // Append-only: snapshot the pre-edit state before overwriting, same
      // pattern as EMR revisions — an MLC record must never silently change
      // without a retained trace of what it said before.
      await tx.mlcRecordRevision.create({
        data: {
          clinic_id: session.clinicId,
          mlc_record_id: existing.id,
          snapshot: JSON.stringify(serializeMlcRecord(existing)),
          changed_by: session.displayName || session.username,
          changed_by_role: session.role,
        },
      });

      const updated = await tx.mlcRecord.update({
        where: { id: existing.id },
        data,
      });

      return { existing, updated };
    });

    if (!hasChanges) {
      return NextResponse.json(serializeMlcRecord(existing));
    }

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const allowedRoles = ["doctor", "admin", "manager"];
    if (!allowedRoles.includes(session.role)) {
      throw new AppError("Only doctor/admin/manager can delete an MLC case", 403);
    }

    const { visitId } = await params;

    await withClinicScope(session.clinicId, async (tx) => {
      const existing = await tx.mlcRecord.findUnique({
        where: { patient_visit_id: visitId },
        include: { revisions: true },
      });
      if (!existing) {
        throw new AppError("MLC record not found", 404);
      }

      // Opened by mistake or a mislabeled MLC — deletable, but nothing is
      // silently lost: the full record and its edit history are archived to
      // the audit log in the same transaction that removes them, and the
      // visit's medico_legal flag is cleared so discharge isn't stuck
      // requiring a record that no longer exists.
      await tx.mlcRecordRevision.deleteMany({
        where: { mlc_record_id: existing.id },
      });
      await tx.mlcRecord.delete({ where: { id: existing.id } });
      await tx.patientVisit.update({
        where: { id: visitId },
        data: { medico_legal: false },
      });

      await logAuditTx(tx, {
        action: AUDIT_ACTIONS.MLC_RECORD_DELETE,
        entity_type: "mlc_record",
        entity_id: existing.id,
        summary: `MLC case #${existing.casualty_number} deleted for visit ${visitId.slice(0, 8)}… — archived to audit log`,
        details: {
          mlc_record_archive: serializeMlcRecord(existing),
          revisions_archive: existing.revisions.length > 0 ? existing.revisions : undefined,
          removed_by: session.displayName || session.username,
          removed_by_role: session.role,
        },
        session,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse("visits/[visitId]/mlc DELETE", e, "Failed to delete MLC record");
  }
}
