import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializePrescription } from "@/lib/serialize";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";

const prescriptionInclude = { items: true };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSessionFromCookies();
    const rawBody = await request.text();
    const body = rawBody
      ? (JSON.parse(rawBody) as { acknowledged_warnings?: unknown[] })
      : {};

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: prescriptionInclude,
    });

    if (!prescription) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (prescription.status !== "draft") {
      return NextResponse.json(
        { error: "Prescription already sent" },
        { status: 400 },
      );
    }

    if (prescription.items.length === 0) {
      return NextResponse.json(
        { error: "Add at least one medicine before sending" },
        { status: 400 },
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.patientVisit.update({
        where: { id: prescription.patient_visit_id },
        data: { status: "to_pharmacy" },
      });

      return tx.prescription.update({
        where: { id },
        data: {
          status: "sent_to_pharmacy",
          sent_to_pharmacy_at: now,
        },
        include: prescriptionInclude,
      });
    });

    await logAudit({
      action: AUDIT_ACTIONS.PRESCRIPTION_SEND,
      entity_type: "prescription",
      entity_id: id,
      summary: `Prescription sent to pharmacy for visit ${prescription.patient_visit_id.slice(0, 8)}…`,
      details:
        body.acknowledged_warnings && body.acknowledged_warnings.length > 0
          ? { acknowledged_safety_warnings: body.acknowledged_warnings }
          : undefined,
      session,
    });

    return NextResponse.json(serializePrescription(updated));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
