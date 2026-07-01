import { NextResponse } from "next/server";
import { startOfDay, subDays } from "date-fns";
import { buildAnalytics } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const recentStart = subDays(todayStart, 14);

    const recentVisits = await prisma.patientVisit.findMany({
      where: { registered_at: { gte: recentStart } },
      include: { doctors: { select: { name: true } } },
      orderBy: { registered_at: "asc" },
    });

    const todayVisits = recentVisits.filter((v) => v.registered_at >= todayStart);

    const payload = buildAnalytics(todayVisits, recentVisits, now);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analytics error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
