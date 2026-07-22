import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;

    const { visitId } = await params;
    const revisions = await prisma.visitEmrRevision.findMany({
      where: { patient_visit_id: visitId },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(
      revisions.map((r) => ({
        id: r.id,
        changed_by: r.changed_by,
        changed_by_role: r.changed_by_role,
        changed_at: r.created_at.toISOString(),
        snapshot: JSON.parse(r.snapshot),
      })),
    );
  } catch (e) {
    return errorResponse("visits/[visitId]/emr/history GET", e, "Failed to load history");
  }
}
