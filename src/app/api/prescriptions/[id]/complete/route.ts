import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializePrescription } from "@/lib/serialize";

const prescriptionInclude = { items: true };

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: prescriptionInclude,
    });

    if (!prescription) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const pending = prescription.items.filter((i) => !i.dispensed);
    if (pending.length > 0) {
      return NextResponse.json(
        { error: `${pending.length} medicine(s) still not dispensed` },
        { status: 400 },
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.patientVisit.update({
        where: { id: prescription.patient_visit_id },
        data: { status: "completed", completed_at: now },
      });

      return tx.prescription.update({
        where: { id },
        data: { status: "dispensed" },
        include: prescriptionInclude,
      });
    });

    return NextResponse.json(serializePrescription(updated));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Complete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
