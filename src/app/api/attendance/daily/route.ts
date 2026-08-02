import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { addDays, dateStrIST, parseDateParam, startOfDay } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;

    const { searchParams } = new URL(request.url);
    const dayStart =
      parseDateParam(searchParams.get("date")) ?? startOfDay(new Date());
    const dayEnd = addDays(dayStart, 1);

    const records = await prisma.staffAttendance.findMany({
      where: {
        clock_in: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { clock_in: "asc" },
      select: {
        id: true,
        user_id: true,
        username: true,
        role: true,
        display_name: true,
        clock_in: true,
        clock_out: true,
      },
    });

    return NextResponse.json({ date: dateStrIST(dayStart), records });
  } catch (e) {
    return errorResponse("attendance/daily GET", e, "Failed to load daily attendance");
  }
}
