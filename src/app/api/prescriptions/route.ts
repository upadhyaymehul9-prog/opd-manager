import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializePrescription } from "@/lib/serialize";
import type { UpsertPrescriptionInput } from "@/lib/prescription-types";

const prescriptionInclude = { items: true };

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
    const body = (await request.json()) as UpsertPrescriptionInput;
    const { patient_visit_id, doctor_id, notes, items } = body;

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
    });

    if (existing && existing.status !== "draft") {
      return NextResponse.json(
        { error: "Prescription already sent to pharmacy" },
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

      await tx.prescriptionItem.deleteMany({
        where: { prescription_id: rx.id },
      });

      await tx.prescriptionItem.createMany({
        data: items.map((item, index) => ({
          prescription_id: rx.id,
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
        })),
      });

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
