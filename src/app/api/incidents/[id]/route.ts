import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { AUDIT_ACTIONS, diffFields, logAudit } from "@/lib/audit";
import { withClinicScope } from "@/lib/tenant";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;
    if (session.role !== "admin" && session.role !== "manager") {
      return NextResponse.json(
        { error: "Only manager/admin can review or close incidents" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const status = String(body.status ?? "").trim();

    if (status !== "open" && status !== "reviewing" && status !== "closed") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { existing, incident } = await withClinicScope(session.clinicId, async (tx) => {
      const existing = await tx.incidentReport.findUnique({ where: { id } });
      if (!existing) return { existing: null, incident: null };

      const incident = await tx.incidentReport.update({
        where: { id },
        data: {
          status,
          closed_at: status === "closed" ? new Date() : null,
        },
      });
      return { existing, incident };
    });

    if (!existing || !incident) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const diff = diffFields(existing, incident, ["status", "closed_at"]);
    if (Object.keys(diff).length > 0) {
      await logAudit({
        action: status === "closed" ? AUDIT_ACTIONS.INCIDENT_CLOSE : AUDIT_ACTIONS.INCIDENT_STATUS_CHANGE,
        entity_type: "incident",
        entity_id: id,
        summary: `Incident status → ${status} for ${incident.patient_name}`,
        details: { changes: diff },
        session,
      });
    }

    return NextResponse.json(incident);
  } catch (e) {
    return errorResponse("incidents/[id] PATCH", e, "Update failed");
  }
}
