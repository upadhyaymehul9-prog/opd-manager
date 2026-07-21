import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { canWritePrescription } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { serializePrescription } from "@/lib/serialize";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import type { PatientStatus } from "@/lib/types";

const prescriptionInclude = { items: { where: { voided_at: null } } };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const session = guard.session;

    const { id } = await params;
    const rawBody = await request.text();
    const body = rawBody
      ? (JSON.parse(rawBody) as { acknowledged_warnings?: unknown[] })
      : {};

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        ...prescriptionInclude,
        patient_visit: { select: { status: true } },
      },
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

    const visitStatus = prescription.patient_visit.status as PatientStatus;
    const alreadyAtPharmacy =
      visitStatus === "to_pharmacy" || visitStatus === "at_pharmacy";
    // Sending is only valid from consult-side stages — never from lab/radiology
    // queues or a completed visit (that would silently yank the patient's
    // status out of the current workflow step).
    if (!alreadyAtPharmacy && !canWritePrescription(visitStatus)) {
      return NextResponse.json(
        {
          error: `Cannot send to pharmacy while patient is "${visitStatus}" — finish the current step first`,
        },
        { status: 400 },
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      if (!alreadyAtPharmacy) {
        await tx.patientVisit.update({
          where: { id: prescription.patient_visit_id },
          data: { status: "to_pharmacy" },
        });
      }

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
    return errorResponse("prescriptions/[id]/send", e, "Send failed");
  }
}
