import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { AUDIT_ACTIONS, logAuditTx } from "@/lib/audit";
import { serializeBill } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

/**
 * Financial correction only: marks a bill voided so it drops out of revenue
 * totals/reconciliation, but never deletes it — the row, its line items, and
 * this event are all permanent. This does NOT reopen the visit or restore
 * stock/un-dispense medicines; that's a separate clinical action (deliberately
 * out of scope — reopening a completed/discharged visit has much bigger
 * implications than reversing a billing mistake).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    if (session.role !== "admin" && session.role !== "manager") {
      throw new AppError("Only admin/manager can void a bill", 403);
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) {
      throw new AppError("A reason is required to void a bill", 400);
    }

    const existing = await prisma.pharmacyBill.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }
    if (existing.voided_at) {
      throw new AppError("Bill is already voided", 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const bill = await tx.pharmacyBill.update({
        where: { id },
        data: {
          voided_at: new Date(),
          voided_by: session.displayName || session.username,
          voided_by_role: session.role,
          void_reason: reason,
        },
        include: { items: true },
      });

      await logAuditTx(tx, {
        action: AUDIT_ACTIONS.BILL_VOID,
        entity_type: "pharmacy_bill",
        entity_id: bill.id,
        summary: `Bill ${bill.bill_no} (₹${bill.grand_total.toFixed(2)}) voided — ${reason}`,
        details: {
          bill_no: bill.bill_no,
          grand_total: bill.grand_total,
          void_reason: reason,
        },
        session,
      });

      return bill;
    });

    return NextResponse.json(serializeBill(updated));
  } catch (e) {
    return errorResponse("bills/[id]/void POST", e, "Void failed");
  }
}
