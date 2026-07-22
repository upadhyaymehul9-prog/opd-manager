import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { AUDIT_ACTIONS, logAuditTx } from "@/lib/audit";
import {
  createPharmacyBill,
  isPaymentMode,
  parseUnitPriceOverride,
  serializeBill,
} from "@/lib/billing";
import {
  hasDispensedForBilling,
  pendingRxItems,
} from "@/lib/prescription-status";
import { assertVisitReadyForDischarge, canExitWithoutPharmacyBill } from "@/lib/discharge-gates";
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
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const payment_mode = String(body.payment_mode ?? "cash");
    const overrideEmrGate =
      Boolean(body.override_emr_gate) &&
      (session.role === "doctor" ||
        session.role === "admin" ||
        session.role === "manager");

    if (!isPaymentMode(payment_mode)) {
      throw new AppError("payment_mode must be cash, upi, or card", 400);
    }

    const priceOverrides = new Map<string, number>();
    if (Array.isArray(body.lines)) {
      for (const line of body.lines) {
        if (line.prescription_item_id && line.unit_price != null) {
          const parsed = parseUnitPriceOverride(line.unit_price);
          if (parsed == null) {
            throw new AppError("Invalid unit_price on bill line", 400);
          }
          priceOverrides.set(String(line.prescription_item_id), parsed);
        }
      }
    }

    const now = new Date();

    const result = await prisma.$transaction(
      async (tx) => {
        const prescription = await tx.prescription.findUnique({
          where: { id },
          include: prescriptionInclude,
        });
        if (!prescription) {
          throw new AppError("Not found", 404);
        }

        const visit = await tx.patientVisit.findUnique({
          where: { id: prescription.patient_visit_id },
          include: {
            pharmacy_bill: { select: { id: true } },
            mlc_record: { select: { id: true } },
            lab_tests: {
              where: { status: { in: ["ordered", "collected"] } },
              select: { id: true },
            },
          },
        });
        if (!visit) {
          throw new AppError("Visit not found", 404);
        }

        if (visit.status === "completed") {
          throw new AppError("Visit is already completed", 409);
        }
        // Pharmacy exit only applies to visits actually at the pharmacy —
        // a patient still in consult/lab must finish those steps first.
        if (visit.status !== "to_pharmacy" && visit.status !== "at_pharmacy") {
          throw new AppError(
            `Patient is "${visit.status}" — send to pharmacy before completing the visit`,
            400,
          );
        }

        const pending = pendingRxItems(prescription.items);
        if (pending.length > 0) {
          throw new AppError(
            `${pending.length} medicine(s) still pending — dispense in-stock items or skip outside/unavailable medicines`,
            400,
          );
        }

        const exitWithoutBill = canExitWithoutPharmacyBill(prescription.items);
        if (!hasDispensedForBilling(prescription.items) && !exitWithoutBill) {
          throw new AppError(
            "Dispense at least one medicine before generating bill, or skip all lines to exit without billing",
            400,
          );
        }

        // Discharge gates (EMR / MLC / pending labs). Bill may be created in this same TX.
        assertVisitReadyForDischarge({
          visit,
          prescriptionItems: prescription.items,
          hasPharmacyBill:
            Boolean(visit.pharmacy_bill) || hasDispensedForBilling(prescription.items),
          hasMlcRecord: Boolean(visit.mlc_record),
          pendingLabTests: visit.lab_tests.length,
          overrideEmrGate,
        });

        if (overrideEmrGate) {
          await logAuditTx(tx, {
            action: AUDIT_ACTIONS.VISIT_UPDATE,
            entity_type: "visit",
            entity_id: prescription.patient_visit_id,
            summary: `Visit ${prescription.patient_visit_id.slice(0, 8)}… discharged without EMR notes (override)`,
            details: { emr_gate_overridden: true },
            session,
          });
        }

        let bill = visit.pharmacy_bill
          ? await tx.pharmacyBill.findUniqueOrThrow({
              where: { id: visit.pharmacy_bill.id },
              include: { items: true },
            })
          : null;

        if (!bill && hasDispensedForBilling(prescription.items)) {
          // Preview is rebuilt inside createPharmacyBill within this TX so
          // concurrent un-dispense cannot produce a stale bill.
          bill = await createPharmacyBill(
            tx,
            id,
            payment_mode,
            priceOverrides.size > 0 ? priceOverrides : undefined,
          );
        }

        await tx.patientVisit.update({
          where: { id: prescription.patient_visit_id },
          data: { status: "completed", completed_at: now },
        });

        const updatedRx = await tx.prescription.update({
          where: { id },
          data: {
            status: hasDispensedForBilling(prescription.items)
              ? "dispensed"
              : "sent_to_pharmacy",
          },
          include: prescriptionInclude,
        });

        return { bill, prescription: updatedRx };
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    return NextResponse.json({
      bill: result.bill ? serializeBill(result.bill) : null,
      prescription: serializePrescription(result.prescription),
    });
  } catch (e) {
    if (e instanceof Error) {
      const message = e.message;
      if (message.includes("pharmacy_bills") || message.includes("does not exist")) {
        return NextResponse.json(
          {
            error:
              "Billing not set up on database — run npm run db:push, then redeploy.",
          },
          { status: 503 },
        );
      }
    }
    return errorResponse("prescriptions/[id]/complete POST", e, "Complete failed");
  }
}
