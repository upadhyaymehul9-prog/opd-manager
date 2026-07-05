import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
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
    const message = e instanceof Error ? e.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
