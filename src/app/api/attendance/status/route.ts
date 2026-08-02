import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { addDays, startOfDay } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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
      select: { id: true, clock_in: true, clock_out: true },
    });

    if (!record) {
      return NextResponse.json({ state: "absent" });
    }
    if (record.clock_out === null) {
      return NextResponse.json({
        state: "clocked_in",
        record: { id: record.id, clock_in: record.clock_in },
      });
    }
    return NextResponse.json({ state: "clocked_out", record });
  } catch (e) {
    return errorResponse("attendance/status GET", e, "Failed to fetch attendance status");
  }
}
