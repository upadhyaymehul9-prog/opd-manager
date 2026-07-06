import { NextResponse } from "next/server";
import { createPharmacyBill, isPaymentMode, serializeBill, buildBillPreview } from "@/lib/billing";
import { visitEmrCompleteForDischarge } from "@/lib/nabh";
import {
  hasDispensedForBilling,
  pendingRxItems,
} from "@/lib/prescription-status";
import { prisma } from "@/lib/prisma";
import { serializePrescription } from "@/lib/serialize";

const prescriptionInclude = {
  items: { where: { voided_at: null }, orderBy: { sort_order: "asc" as const } },
};

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

    const visit = await prisma.patientVisit.findUnique({
      where: { id: prescription.patient_visit_id },
    });
    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
    if (!visitEmrCompleteForDischarge(visit)) {
      return NextResponse.json(
        {
          error:
            "NABH: complete EMR (chief complaint and diagnosis) before marking visit completed",
        },
        { status: 400 },
      );
    }

    const pending = pendingRxItems(prescription.items);
    if (pending.length > 0) {
      return NextResponse.json(
        {
          error: `${pending.length} medicine(s) still pending — dispense in-stock items or skip outside/unavailable medicines`,
        },
        { status: 400 },
      );
    }

    if (!hasDispensedForBilling(prescription.items)) {
      return NextResponse.json(
        { error: "Dispense at least one medicine before generating bill" },
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

    const preview = await buildBillPreview(
      prisma,
      id,
      priceOverrides.size > 0 ? priceOverrides : undefined,
    );

    const result = await prisma.$transaction(
      async (tx) => {
        const bill = await createPharmacyBill(
          tx,
          id,
          payment_mode,
          priceOverrides.size > 0 ? priceOverrides : undefined,
          preview,
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
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    return NextResponse.json({
      bill: serializeBill(result.bill),
      prescription: serializePrescription(result.prescription),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Complete failed";
    if (message.includes("pharmacy_bills") || message.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "Billing not set up on database — run npm run db:push, then redeploy.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
