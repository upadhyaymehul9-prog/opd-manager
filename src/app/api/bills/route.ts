import { NextResponse } from "next/server";
import { buildBillPreview, serializeBill } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get("visit_id")?.trim();
    const prescriptionId = searchParams.get("prescription_id")?.trim();

    if (visitId) {
      const bill = await prisma.pharmacyBill.findUnique({
        where: { patient_visit_id: visitId },
        include: { items: true },
      });
      if (!bill) {
        return NextResponse.json(null);
      }
      return NextResponse.json(serializeBill(bill));
    }

    if (prescriptionId) {
      const bill = await prisma.pharmacyBill.findUnique({
        where: { prescription_id: prescriptionId },
        include: { items: true },
      });
      if (bill) {
        return NextResponse.json(serializeBill(bill));
      }
      const preview = await prisma.$transaction((tx) =>
        buildBillPreview(tx, prescriptionId),
      );
      return NextResponse.json({ preview });
    }

    return NextResponse.json(
      { error: "visit_id or prescription_id required" },
      { status: 400 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bill error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
