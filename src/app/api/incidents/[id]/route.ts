import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, diffFields, getSessionFromCookies, logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

    const existing = await prisma.incidentReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const incident = await prisma.incidentReport.update({
      where: { id },
      data: {
        status,
        closed_at: status === "closed" ? new Date() : null,
      },
    });

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
