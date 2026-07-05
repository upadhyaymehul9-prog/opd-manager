import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { visitInclude } from "@/lib/db-includes";
import { serializeVisit } from "@/lib/serialize";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;

    const visit = await prisma.patientVisit.findUnique({
      where: { id: visitId },
      include: {
        ...visitInclude,
        consent: true,
        patient: true,
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const prescription = await prisma.prescription.findFirst({
      where: { patient_visit_id: visitId },
      include: {
        items: { where: { voided_at: null }, orderBy: { sort_order: "asc" } },
      },
    });

    return NextResponse.json({
      visit: serializeVisit(visit),
      consent: visit.consent,
      prescription: prescription
        ? {
            items: prescription.items.map((item) => ({
              medicine_name: item.medicine_name,
              dosage: item.dose,
              frequency: item.frequency,
              duration:
                item.duration_days != null ? `${item.duration_days} days` : null,
              quantity: item.quantity,
            })),
          }
        : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
