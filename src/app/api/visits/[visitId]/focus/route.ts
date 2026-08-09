import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { serializeBill } from "@/lib/billing";
import { visitInclude } from "@/lib/db-includes";
import { serializePrescription, serializeVisit } from "@/lib/serialize";
import { withClinicScope } from "@/lib/tenant";

/**
 * Everything the doctor "patient focus" view needs in one round trip: the
 * visit, its current prescription/bill, whether it came from a booked
 * appointment, and a short vitals history (for the BP/RBS trends) drawn
 * from the same patient's other visits.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { visitId } = await params;

    const { visit, vitalsHistory } = await withClinicScope(
      session.clinicId,
      async (tx) => {
        const visit = await tx.patientVisit.findUnique({
          where: { id: visitId },
          include: {
            ...visitInclude,
            prescription: {
              include: {
                items: { where: { voided_at: null }, orderBy: { sort_order: "asc" } },
              },
            },
            pharmacy_bill: { include: { items: true } },
            appointment: { select: { scheduled_at: true, source: true } },
          },
        });

        const vitalsHistory = visit?.patient_id
          ? await tx.patientVisit.findMany({
              where: {
                patient_id: visit.patient_id,
                id: { not: visitId },
                OR: [{ vitals_bp: { not: null } }, { vitals_rbs: { not: null } }],
              },
              select: { id: true, registered_at: true, vitals_bp: true, vitals_rbs: true },
              orderBy: { registered_at: "desc" },
              take: 8,
            })
          : [];

        return { visit, vitalsHistory };
      },
    );

    if (!visit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      visit: serializeVisit({ ...visit, doctors: visit.doctors }),
      prescription: visit.prescription
        ? serializePrescription(visit.prescription)
        : null,
      bill: visit.pharmacy_bill ? serializeBill(visit.pharmacy_bill) : null,
      appointment: visit.appointment
        ? {
            scheduled_at: visit.appointment.scheduled_at.toISOString(),
            source: visit.appointment.source,
          }
        : null,
      vitals_history: vitalsHistory
        .map((v) => ({
          id: v.id,
          registered_at: v.registered_at.toISOString(),
          vitals_bp: v.vitals_bp,
          vitals_rbs: v.vitals_rbs,
        }))
        .reverse(),
    });
  } catch (e) {
    return errorResponse("visits/[visitId]/focus GET", e, "Failed to load patient focus view");
  }
}
