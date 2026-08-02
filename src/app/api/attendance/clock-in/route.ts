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

    const existing = await prisma.staffAttendance.findFirst({
      where: {
        user_id: session.userId,
        clock_in: { gte: todayStart, lt: tomorrowStart },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "Already clocked in today" }, { status: 409 });
    }

    const record = await prisma.staffAttendance.create({
      data: {
        user_id: session.userId,
        username: session.username,
        role: session.role,
        display_name: session.displayName,
        clock_in: new Date(),
      },
      select: { id: true, clock_in: true },
    });

    await logAudit({
      action: AUDIT_ACTIONS.CLOCK_IN,
      entity_type: "staff_attendance",
      entity_id: record.id,
      summary: `${session.username} clocked in`,
      session,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    return errorResponse("attendance/clock-in POST", e, "Failed to clock in");
  }
}
