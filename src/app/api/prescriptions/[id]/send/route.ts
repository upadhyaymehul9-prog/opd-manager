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

    if (prescription.status !== "draft") {
      return NextResponse.json(
        { error: "Prescription already sent" },
        { status: 400 },
      );
    }

    if (prescription.items.length === 0) {
      return NextResponse.json(
        { error: "Add at least one medicine before sending" },
        { status: 400 },
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.patientVisit.update({
        where: { id: prescription.patient_visit_id },
        data: { status: "to_pharmacy" },
      });

      return tx.prescription.update({
        where: { id },
        data: {
          status: "sent_to_pharmacy",
          sent_to_pharmacy_at: now,
        },
        include: prescriptionInclude,
      });
    });

    return NextResponse.json(serializePrescription(updated));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
