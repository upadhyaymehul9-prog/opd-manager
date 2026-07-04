import { NextResponse } from "next/server";
import { computePrescriptionStatus } from "@/lib/prescription-status";
import { prisma } from "@/lib/prisma";
import { serializePrescription } from "@/lib/serialize";
import type { PrescriptionItemInput } from "@/lib/prescription-types";

const prescriptionInclude = {
  items: { orderBy: { sort_order: "asc" as const } },
};

const EDITABLE_RX_STATUSES = ["draft", "sent_to_pharmacy", "partially_dispensed"];

function itemData(
  prescriptionId: string,
  item: PrescriptionItemInput,
  index: number,
) {
  return {
    prescription_id: prescriptionId,
    medicine_id: item.medicine_id || null,
    medicine_name: item.medicine_name.trim(),
    dose: item.dose?.trim() || null,
    frequency: item.frequency?.trim() || null,
    duration_days:
      item.duration_days != null && item.duration_days > 0
        ? Math.round(item.duration_days)
        : null,
    quantity:
      item.quantity != null && item.quantity > 0
        ? Math.round(item.quantity)
        : null,
    instructions: item.instructions?.trim() || null,
    sort_order: item.sort_order ?? index,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get("visit_id")?.trim();

    if (!visitId) {
      return NextResponse.json(
        { error: "visit_id is required" },
        { status: 400 },
      );
    }

    const prescription = await prisma.prescription.findUnique({
      where: { patient_visit_id: visitId },
      include: prescriptionInclude,
    });

    if (!prescription) {
      return NextResponse.json(null);
    }

    return NextResponse.json(serializePrescription(prescription));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patient_visit_id, doctor_id, notes, items } = body as {
      patient_visit_id: string;
      doctor_id: string;
      notes?: string | null;
      items: PrescriptionItemInput[];
    };

    if (!patient_visit_id || !doctor_id) {
      return NextResponse.json(
        { error: "patient_visit_id and doctor_id are required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one medicine line is required" },
        { status: 400 },
      );
    }

    const existing = await prisma.prescription.findUnique({
      where: { patient_visit_id },
      include: prescriptionInclude,
    });

    if (existing && !EDITABLE_RX_STATUSES.includes(existing.status)) {
      return NextResponse.json(
        { error: "Prescription is closed — all medicines dispensed" },
        { status: 400 },
      );
    }

    const prescription = await prisma.$transaction(async (tx) => {
      const rx = await tx.prescription.upsert({
        where: { patient_visit_id },
        create: {
          patient_visit_id,
          doctor_id,
          notes: notes?.trim() || null,
          status: "draft",
        },
        update: {
          doctor_id,
          notes: notes?.trim() || null,
        },
      });

      if (existing && existing.status !== "draft") {
        const currentItems = existing.items;
        const incomingIds = new Set(
          items.filter((i) => i.id).map((i) => i.id as string),
        );

        for (const cur of currentItems) {
          if (cur.dispensed && !incomingIds.has(cur.id)) {
            throw new Error(
              `Cannot remove ${cur.medicine_name} — already dispensed at pharmacy`,
            );
          }
        }

        const toDelete = currentItems.filter(
          (c) => !c.dispensed && !incomingIds.has(c.id),
        );
        if (toDelete.length > 0) {
          await tx.prescriptionItem.deleteMany({
            where: { id: { in: toDelete.map((d) => d.id) } },
          });
        }

        let order = 0;
        for (const item of items) {
          if (item.id) {
            const cur = currentItems.find((c) => c.id === item.id);
            if (cur?.dispensed) {
              order += 1;
              continue;
            }
            if (cur) {
              await tx.prescriptionItem.update({
                where: { id: item.id },
                data: itemData(rx.id, item, order),
              });
            } else {
              await tx.prescriptionItem.create({
                data: itemData(rx.id, item, order),
              });
            }
          } else {
            await tx.prescriptionItem.create({
              data: itemData(rx.id, item, order),
            });
          }
          order += 1;
        }

        const allItems = await tx.prescriptionItem.findMany({
          where: { prescription_id: rx.id },
        });

        await tx.prescription.update({
          where: { id: rx.id },
          data: {
            status: computePrescriptionStatus(allItems, existing.status),
          },
        });
      } else {
        await tx.prescriptionItem.deleteMany({
          where: { prescription_id: rx.id },
        });

        for (const [index, item] of items.entries()) {
          await tx.prescriptionItem.create({
            data: itemData(rx.id, item, index),
          });
        }
      }

      return tx.prescription.findUniqueOrThrow({
        where: { id: rx.id },
        include: prescriptionInclude,
      });
    });

    return NextResponse.json(serializePrescription(prescription));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
