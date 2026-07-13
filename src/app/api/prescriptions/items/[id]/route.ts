import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/api-error";
import { computePrescriptionStatus } from "@/lib/prescription-status";
import { getSessionFromCookies } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  deductFromStock,
  getAvailableQuantity,
  restoreToStock,
} from "@/lib/stock";
import { serializePrescriptionItem } from "@/lib/serialize";

/**
 * Stock read+deduct runs at Serializable isolation so two concurrent
 * dispenses of the same medicine can't both read the same available
 * quantity and over-deduct. Postgres aborts the losing transaction with a
 * P2034 serialization error, which we retry a few times before giving up.
 */
async function runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e) {
      const isConflict =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!isConflict || attempt === 3) throw e;
    }
  }
  throw new Error("Unreachable");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const item = await prisma.prescriptionItem.findUnique({
      where: { id },
      include: {
        prescription: { include: { items: { where: { voided_at: null } } } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const dispensed = body.dispensed !== undefined ? Boolean(body.dispensed) : item.dispensed;
    const skipped =
      body.skipped !== undefined ? Boolean(body.skipped) : item.skipped ?? false;
    const substitutedNote =
      body.substituted_note != null
        ? String(body.substituted_note).trim() || null
        : undefined;

    let quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
    if (body.quantity !== undefined) {
      if (item.dispensed) {
        return NextResponse.json(
          { error: "Cannot change quantity after medicine is dispensed" },
          { status: 400 },
        );
      }
      const nextQty =
        body.quantity != null && Number(body.quantity) > 0
          ? Math.round(Number(body.quantity))
          : null;
      if (!nextQty) {
        return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
      }
      quantity = nextQty;
    }

    if (item.skipped || skipped) {
      if (dispensed && !item.dispensed) {
        return NextResponse.json(
          { error: "Skipped medicines cannot be dispensed — unskip first" },
          { status: 400 },
        );
      }
    }

    if (dispensed && skipped) {
      return NextResponse.json(
        {
          error:
            "Cannot skip a dispensed medicine — un-dispense it first so stock is restored",
        },
        { status: 400 },
      );
    }

    if (dispensed && !item.dispensed && !item.medicine_id) {
      return NextResponse.json(
        {
          error:
            "Outside pharmacy medicine — use Skip instead of dispense, or remove the line",
        },
        { status: 400 },
      );
    }

    const qty = quantity;

    const updatedItem = await runSerializable(async (tx) => {
      if (dispensed && !item.dispensed && item.medicine_id) {
        const available = await getAvailableQuantity(tx, item.medicine_id);
        if (available < qty) {
          throw new AppError(
            `Insufficient stock for ${item.medicine_name} — available ${available}, need ${qty}`,
          );
        }
        await deductFromStock(tx, item.medicine_id, qty);
      }

      if (!dispensed && item.dispensed && item.medicine_id) {
        await restoreToStock(tx, item.medicine_id, qty);
      }

      const saved = await tx.prescriptionItem.update({
        where: { id },
        data: {
          dispensed,
          dispensed_at: dispensed ? new Date() : null,
          quantity,
          skipped: body.skipped !== undefined ? skipped : undefined,
          skip_reason:
            body.skipped !== undefined
              ? skipped
                ? String(body.skip_reason ?? "outside_stock").trim() || "outside_stock"
                : null
              : undefined,
          ...(substitutedNote !== undefined
            ? { substituted_note: substitutedNote }
            : {}),
        },
      });

      const allItems = item.prescription.items.map((row) =>
        row.id === id
          ? {
              ...row,
              dispensed,
              skipped: body.skipped !== undefined ? skipped : row.skipped,
            }
          : row,
      );

      await tx.prescription.update({
        where: { id: item.prescription_id },
        data: {
          status: computePrescriptionStatus(
            allItems,
            item.prescription.status,
          ),
        },
      });

      if (dispensed) {
        await tx.patientVisit.update({
          where: { id: item.prescription.patient_visit_id },
          data: { status: "at_pharmacy" },
        });
      }

      return saved;
    });

    return NextResponse.json(serializePrescriptionItem(updatedItem));
  } catch (e) {
    return errorResponse("prescriptions/items PATCH", e, "Update failed");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const item = await prisma.prescriptionItem.findUnique({
      where: { id },
      include: {
        prescription: { include: { items: { where: { voided_at: null } } } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (item.dispensed) {
      return NextResponse.json(
        { error: "Cannot remove a medicine already dispensed — uncheck dispensed first" },
        { status: 400 },
      );
    }

    if (item.skipped) {
      return NextResponse.json(
        { error: "Use unskip instead of remove for skipped medicines" },
        { status: 400 },
      );
    }

    const session = await getSessionFromCookies();

    await prisma.$transaction(async (tx) => {
      // Never hard-delete a prescribed medicine — void it so the fact it
      // was once prescribed (and by whom it was removed) is retained
      // permanently, just excluded from the active view.
      await tx.prescriptionItem.update({
        where: { id },
        data: {
          voided_at: new Date(),
          voided_by: session?.displayName || session?.username || "unknown",
          void_reason: "removed_by_doctor",
        },
      });

      const remaining = item.prescription.items.filter((row) => row.id !== id);

      await tx.prescription.update({
        where: { id: item.prescription_id },
        data: {
          status: computePrescriptionStatus(
            remaining,
            item.prescription.status,
          ),
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse("prescriptions/items DELETE", e, "Delete failed");
  }
}
