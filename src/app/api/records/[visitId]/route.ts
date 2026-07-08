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
        patient: true,
        prescription: {
          include: {
            items: { where: { voided_at: null }, orderBy: { sort_order: "asc" } },
          },
        },
        pharmacy_bill: { include: { items: true } },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const priorVisits = visit.patient_id
      ? await prisma.patientVisit.findMany({
          where: {
            patient_id: visit.patient_id,
            id: { not: visitId },
          },
          include: {
            doctors: true,
            patient: true,
            pharmacy_bill: { select: { grand_total: true, bill_no: true } },
            prescription: {
              select: { items: { where: { voided_at: null }, select: { id: true } } },
            },
          },
          orderBy: { registered_at: "desc" },
          take: 20,
        })
      : [];

    return NextResponse.json({
      visit: serializeVisit({ ...visit, doctors: visit.doctors }),
      prescription: visit.prescription
        ? serializePrescription(visit.prescription)
        : null,
      bill: visit.pharmacy_bill ? serializeBill(visit.pharmacy_bill) : null,
      prior_visits: priorVisits.map((v) => ({
        visit: serializeVisit({ ...v, doctors: v.doctors }),
        medicine_count: v.prescription?.items.length ?? 0,
        bill_total: v.pharmacy_bill?.grand_total ?? null,
        bill_no: v.pharmacy_bill?.bill_no ?? null,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Record error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
