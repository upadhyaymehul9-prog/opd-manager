import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { addDays, startOfDay } from "@/lib/date-range";
import { withClinicScope } from "@/lib/tenant";

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const todayStart = startOfDay(new Date());
    const tomorrowStart = addDays(todayStart, 1);

    const updated = await withClinicScope(session.clinicId, async (tx) => {
      const record = await tx.staffAttendance.findFirst({
        where: {
          user_id: session.userId,
          clock_in: { gte: todayStart, lt: tomorrowStart },
        },
      });

      if (!record) {
        throw new AppError("Not clocked in today", 409);
      }
      if (record.clock_out !== null) {
        throw new AppError("Already clocked out", 409);
      }

      return tx.staffAttendance.update({
        where: { id: record.id },
        data: { clock_out: new Date() },
        select: { id: true, clock_in: true, clock_out: true },
      });
    });

    await logAudit({
      action: AUDIT_ACTIONS.CLOCK_OUT,
      entity_type: "staff_attendance",
      entity_id: updated.id,
      summary: `${session.username} clocked out`,
      details: { clock_in: updated.clock_in, clock_out: updated.clock_out },
      session,
    });

    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse("attendance/clock-out POST", e, "Failed to clock out");
  }
}
