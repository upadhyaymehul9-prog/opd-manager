import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { PROCEDURE_TYPES, type ProcedureType } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;

    const { visitId } = await params;
    const rows = await prisma.visitProcedure.findMany({
      where: { patient_visit_id: visitId },
      orderBy: { created_at: "asc" },
    });
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        procedure_type: r.procedure_type,
        notes: r.notes,
        fee: r.fee,
        created_at: r.created_at.toISOString(),
      })),
    );
  } catch (e) {
    return errorResponse("visits/procedures GET", e, "Procedure error");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;

    const { visitId } = await params;
    const body = await request.json();
    const procedure_type = String(body.procedure_type ?? "") as ProcedureType;

    if (!PROCEDURE_TYPES.includes(procedure_type)) {
      return NextResponse.json(
        { error: "Invalid procedure type" },
        { status: 400 },
      );
    }

    const visit = await prisma.patientVisit.findUnique({
      where: { id: visitId },
    });
    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const row = await prisma.visitProcedure.create({
      data: {
        patient_visit_id: visitId,
        procedure_type,
        notes: body.notes?.trim() || null,
        fee:
          body.fee != null && body.fee !== "" && Number(body.fee) > 0
            ? Number(body.fee)
            : null,
      },
    });

    return NextResponse.json(
      {
        id: row.id,
        procedure_type: row.procedure_type,
        notes: row.notes,
        fee: row.fee,
        created_at: row.created_at.toISOString(),
      },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse("visits/procedures POST", e, "Procedure error");
  }
}
