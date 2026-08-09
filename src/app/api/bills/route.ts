import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import {
  buildBillPreview,
  createPharmacyBill,
  isPaymentMode,
  parseUnitPriceOverride,
  serializeBill,
} from "@/lib/billing";
import {
  hasDispensedForBilling,
  pendingRxItems,
} from "@/lib/prescription-status";
import { withClinicScope } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get("visit_id")?.trim();
    const prescriptionId = searchParams.get("prescription_id")?.trim();

    if (visitId) {
      const bill = await withClinicScope(session.clinicId, (tx) =>
        tx.pharmacyBill.findUnique({
          where: { patient_visit_id: visitId },
          include: { items: true },
        }),
      );
      if (!bill) {
        return NextResponse.json(null);
      }
      return NextResponse.json(serializeBill(bill));
    }

    if (prescriptionId) {
      const bill = await withClinicScope(session.clinicId, (tx) =>
        tx.pharmacyBill.findUnique({
          where: { prescription_id: prescriptionId },
          include: { items: true },
        }),
      );
      if (bill) {
        return NextResponse.json(serializeBill(bill));
      }
      const preview = await withClinicScope(session.clinicId, (tx) =>
        buildBillPreview(tx, prescriptionId),
      );
      return NextResponse.json({ preview });
    }

    return NextResponse.json(
      { error: "visit_id or prescription_id required" },
      { status: 400 },
    );
  } catch (e) {
    return errorResponse("bills GET", e, "Bill error");
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const body = await request.json();
    const visit_id = String(body.visit_id ?? "").trim();
    const payment_mode = String(body.payment_mode ?? "cash");

    if (!visit_id) {
      return NextResponse.json({ error: "visit_id required" }, { status: 400 });
    }
    if (!isPaymentMode(payment_mode)) {
      return NextResponse.json(
        { error: "payment_mode must be cash, upi, or card" },
        { status: 400 },
      );
    }

    const visit = await withClinicScope(session.clinicId, (tx) =>
      tx.patientVisit.findUnique({
        where: { id: visit_id },
        include: {
          prescription: {
            include: {
              items: { where: { voided_at: null }, orderBy: { sort_order: "asc" } },
            },
          },
          pharmacy_bill: true,
        },
      }),
    );

    if (!visit?.prescription) {
      return NextResponse.json({ error: "No prescription found" }, { status: 404 });
    }

    if (visit.pharmacy_bill) {
      const bill = await withClinicScope(session.clinicId, (tx) =>
        tx.pharmacyBill.findUniqueOrThrow({
          where: { id: visit.pharmacy_bill!.id },
          include: { items: true },
        }),
      );
      return NextResponse.json(serializeBill(bill));
    }

    const pending = pendingRxItems(visit.prescription.items);
    if (pending.length > 0) {
      return NextResponse.json(
        {
          error: `${pending.length} medicine(s) still pending — dispense or skip before billing`,
        },
        { status: 400 },
      );
    }

    if (!hasDispensedForBilling(visit.prescription.items)) {
      return NextResponse.json(
        { error: "Dispense at least one medicine before generating bill" },
        { status: 400 },
      );
    }

    const priceOverrides = new Map<string, number>();
    if (Array.isArray(body.lines)) {
      for (const line of body.lines) {
        if (line.prescription_item_id != null && line.unit_price != null) {
          const price = parseUnitPriceOverride(line.unit_price);
          if (price === null) {
            return NextResponse.json(
              { error: "Unit price must be a number of 0 or more" },
              { status: 400 },
            );
          }
          priceOverrides.set(String(line.prescription_item_id), price);
        }
      }
    }

    const discount_amount = Math.max(0, Number(body.discount_amount) || 0);
    const discount_reason =
      typeof body.discount_reason === "string" && body.discount_reason.trim()
        ? body.discount_reason.trim()
        : null;

    const bill = await withClinicScope(session.clinicId, (tx) =>
      createPharmacyBill(
        tx,
        session.clinicId,
        visit.prescription!.id,
        payment_mode,
        priceOverrides.size > 0 ? priceOverrides : undefined,
        undefined,
        { amount: discount_amount, reason: discount_reason },
      ),
    );

    return NextResponse.json(serializeBill(bill), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("pharmacy_bills") || message.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "Billing not set up on database — run npm run db:push, then redeploy.",
        },
        { status: 503 },
      );
    }
    return errorResponse("bills POST", e, "Bill error");
  }
}
