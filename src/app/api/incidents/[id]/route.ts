import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const status = String(body.status ?? "").trim();

    if (status !== "open" && status !== "reviewing" && status !== "closed") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const incident = await prisma.incidentReport.update({
      where: { id },
      data: {
        status,
        closed_at: status === "closed" ? new Date() : null,
      },
    });

    if (status === "closed") {
      await logAudit({
        action: AUDIT_ACTIONS.INCIDENT_CLOSE,
        entity_type: "incident",
        entity_id: id,
        summary: `Incident closed for ${incident.patient_name}`,
        session,
      });
    }

    return NextResponse.json(incident);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
