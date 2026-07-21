import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;
    const record = await prisma.mlcRecord.findUnique({
      where: { patient_visit_id: visitId },
      select: { id: true },
    });
    if (!record) {
      return NextResponse.json([]);
    }

    const revisions = await prisma.mlcRecordRevision.findMany({
      where: { mlc_record_id: record.id },
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
    return errorResponse("visits/[visitId]/mlc/history GET", e, "Failed to load history");
  }
}
