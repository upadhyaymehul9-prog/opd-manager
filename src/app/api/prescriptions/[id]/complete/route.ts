import { NextResponse } from "next/server";
import { createPharmacyBill, isPaymentMode, serializeBill } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { serializePrescription } from "@/lib/serialize";

const prescriptionInclude = { items: true };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const payment_mode = String(body.payment_mode ?? "cash");

    if (!isPaymentMode(payment_mode)) {
      return NextResponse.json(
        { error: "payment_mode must be cash, upi, or card" },
        { status: 400 },
      );
    }

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

    const priceOverrides = new Map<string, number>();
    if (Array.isArray(body.lines)) {
      for (const line of body.lines) {
        if (line.prescription_item_id && line.unit_price != null) {
          priceOverrides.set(
            String(line.prescription_item_id),
            Number(line.unit_price),
          );
        }
      }
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const bill = await createPharmacyBill(
        tx,
        id,
        payment_mode,
        priceOverrides.size > 0 ? priceOverrides : undefined,
      );

      await tx.patientVisit.update({
        where: { id: prescription.patient_visit_id },
        data: { status: "completed", completed_at: now },
      });

      const updatedRx = await tx.prescription.update({
        where: { id },
        data: { status: "dispensed" },
        include: prescriptionInclude,
      });

      return { bill, prescription: updatedRx };
    });

    return NextResponse.json({
      bill: serializeBill(result.bill),
      prescription: serializePrescription(result.prescription),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Complete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
