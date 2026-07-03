import { NextResponse } from "next/server";
import { serializeBill } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { serializePrescription, serializeVisit } from "@/lib/serialize";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;

    const visit = await prisma.patientVisit.findUnique({
      where: { id: visitId },
      include: {
        doctors: true,
        prescription: {
          include: { items: { orderBy: { sort_order: "asc" } } },
        },
        pharmacy_bill: { include: { items: true } },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      visit: serializeVisit({ ...visit, doctors: visit.doctors }),
      prescription: visit.prescription
        ? serializePrescription(visit.prescription)
        : null,
      bill: visit.pharmacy_bill ? serializeBill(visit.pharmacy_bill) : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Record error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
