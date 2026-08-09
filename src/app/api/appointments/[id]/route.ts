import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { withClinicScope } from "@/lib/tenant";
import {
  assertSlotAvailable,
  runBookingTransaction,
  serializeAppointment,
} from "@/lib/appointments";

const VALID_STATUSES = ["booked", "arrived", "cancelled", "no_show"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body as { status?: string; notes?: string };

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await withClinicScope(session.clinicId, (tx) =>
      tx.appointment.findUnique({ where: { id } }),
    );
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const appointment = await runBookingTransaction(session.clinicId, async (tx) => {
      // Reverting a cancelled/no-show appointment back to booked can only
      // happen if the slot hasn't since been taken by someone else.
      if (status === "booked" && existing.status !== "booked") {
        await assertSlotAvailable(
          existing.doctor_id,
          existing.scheduled_at,
          existing.duration_minutes,
          existing.id,
          tx,
        );
      }

      return tx.appointment.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
        },
        include: { doctor: { select: { name: true } } },
      });
    });

    return NextResponse.json(serializeAppointment(appointment));
  } catch (e) {
    return errorResponse("appointments/[id] PATCH", e, "Update failed");
  }
}
