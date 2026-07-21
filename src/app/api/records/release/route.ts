import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { resolveRange } from "@/lib/date-range";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { rangeStart, rangeEndExclusive } = resolveRange(searchParams);

    const rows = await prisma.roiRelease.findMany({
      where: {
        released_at: {
          gte: rangeStart,
          lt: rangeEndExclusive,
        },
      },
      orderBy: { released_at: "desc" },
      include: {
        visit: { select: { token_number: true } },
      },
      take: 300,
    });

    return NextResponse.json(rows);
  } catch (e) {
    return errorResponse("records/release GET", e, "Failed to load ROI log");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const patient_name = String(body.patient_name ?? "").trim();
    const requested_by = String(body.requested_by ?? "").trim();
    const purpose = String(body.purpose ?? "").trim();
    const information_released = String(body.information_released ?? "").trim();
    const release_mode = String(body.release_mode ?? "printed_copy").trim();
    const released_at_raw = String(body.released_at ?? "").trim();
    const released_at = released_at_raw ? new Date(released_at_raw) : new Date();
    const visit_id = body.patient_visit_id ? String(body.patient_visit_id) : null;

    if (
      !patient_name ||
      !requested_by ||
      !purpose ||
      !information_released ||
      Number.isNaN(released_at.getTime())
    ) {
      return NextResponse.json(
        {
          error:
            "Patient name, requested by, purpose, information released, and valid released date-time are required",
        },
        { status: 400 },
      );
    }

    let patient_id: string | null = null;
    let patient_number: number | null = null;
    if (visit_id) {
      const visit = await prisma.patientVisit.findUnique({
        where: { id: visit_id },
        select: { patient_id: true, patient: { select: { patient_number: true } } },
      });
      patient_id = visit?.patient_id ?? null;
      patient_number = visit?.patient?.patient_number ?? null;
    }

    const row = await prisma.roiRelease.create({
      data: {
        patient_visit_id: visit_id,
        patient_id,
        patient_name,
        patient_number,
        requested_by,
        requester_relation: body.requester_relation?.trim() || null,
        purpose,
        information_released,
        release_mode,
        identity_verified: Boolean(body.identity_verified),
        id_proof_type: body.id_proof_type?.trim() || null,
        id_proof_ref: body.id_proof_ref?.trim() || null,
        approved_by: body.approved_by?.trim() || null,
        released_by: session.displayName || session.username,
        released_by_role: session.role,
        released_at,
        remarks: body.remarks?.trim() || null,
      },
      include: { visit: { select: { token_number: true } } },
    });

    await logAudit({
      action: AUDIT_ACTIONS.ROI_RELEASE_CREATE,
      entity_type: "roi_release",
      entity_id: row.id,
      summary: `ROI released for ${row.patient_name} to ${row.requested_by}`,
      details: {
        patient_visit_id: row.patient_visit_id,
        purpose: row.purpose,
        information_released: row.information_released,
        release_mode: row.release_mode,
      },
      session,
    });

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return errorResponse("records/release POST", e, "Failed to create ROI log");
  }
}
