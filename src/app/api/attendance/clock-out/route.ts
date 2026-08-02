import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { addDays, startOfDay } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const todayStart = startOfDay(new Date());
    const tomorrowStart = addDays(todayStart, 1);

    const record = await prisma.staffAttendance.findFirst({
      where: {
        user_id: session.userId,
        clock_in: { gte: todayStart, lt: tomorrowStart },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Not clocked in today" }, { status: 409 });
    }
    if (record.clock_out !== null) {
      return NextResponse.json({ error: "Already clocked out" }, { status: 409 });
    }

    const updated = await prisma.staffAttendance.update({
      where: { id: record.id },
      data: { clock_out: new Date() },
      select: { id: true, clock_in: true, clock_out: true },
    });

    await logAudit({
      action: AUDIT_ACTIONS.CLOCK_OUT,
      entity_type: "staff_attendance",
      entity_id: record.id,
      summary: `${session.username} clocked out`,
      details: { clock_in: updated.clock_in, clock_out: updated.clock_out },
      session,
    });

    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse("attendance/clock-out POST", e, "Failed to clock out");
  }
}
