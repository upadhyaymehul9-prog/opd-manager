import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { withClinicScope } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const incidents = await withClinicScope(session.clinicId, (tx) =>
      tx.incidentReport.findMany({
        where: status ? { status } : undefined,
        orderBy: { created_at: "desc" },
        take: 100,
      }),
    );

    return NextResponse.json(incidents);
  } catch (e) {
    return errorResponse("incidents GET", e, "Failed to load incidents");
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const body = await request.json();
    const patient_name = String(body.patient_name ?? "").trim();
    const category = String(body.category ?? "").trim();
    const severity = String(body.severity ?? "").trim();
    const description = String(body.description ?? "").trim();

    if (!patient_name || !category || !severity || !description) {
      return NextResponse.json(
        { error: "Patient name, category, severity, and description are required" },
        { status: 400 },
      );
    }

    const incident = await withClinicScope(session.clinicId, (tx) =>
      tx.incidentReport.create({
        data: {
          clinic_id: session.clinicId,
          patient_visit_id: body.patient_visit_id || null,
          patient_name,
          category,
          severity,
          description,
          immediate_action: body.immediate_action?.trim() || null,
          reported_by: session.displayName || session.username,
          reported_by_role: session.role,
        },
      }),
    );

    await logAudit({
      action: AUDIT_ACTIONS.INCIDENT_REPORT,
      entity_type: "incident",
      entity_id: incident.id,
      summary: `${category} incident reported for ${patient_name}`,
      details: { severity, category },
      session,
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (e) {
    return errorResponse("incidents POST", e, "Failed to report incident");
  }
}
