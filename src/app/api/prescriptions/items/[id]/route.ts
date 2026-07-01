import { NextResponse } from "next/server";
import { computePrescriptionStatus } from "@/lib/prescription-status";
import { prisma } from "@/lib/prisma";
import {
  deductFromStock,
  getAvailableQuantity,
  restoreToStock,
} from "@/lib/stock";
import { serializePrescriptionItem } from "@/lib/serialize";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const item = await prisma.prescriptionItem.findUnique({
      where: { id },
      include: { prescription: { include: { items: true } } },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const dispensed = Boolean(body.dispensed);
    const substitutedNote =
      body.substituted_note != null
        ? String(body.substituted_note).trim() || null
        : undefined;

    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;

    const updatedItem = await prisma.$transaction(async (tx) => {
      if (dispensed && !item.dispensed && item.medicine_id) {
        const available = await getAvailableQuantity(tx, item.medicine_id);
        if (available < qty) {
          throw new Error(
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
          ...(substitutedNote !== undefined
            ? { substituted_note: substitutedNote }
            : {}),
        },
      });

      const allItems = item.prescription.items.map((row) =>
        row.id === id ? { ...row, dispensed } : row,
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
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
