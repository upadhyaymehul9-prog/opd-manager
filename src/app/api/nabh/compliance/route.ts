import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getNabhComplianceSnapshot } from "@/lib/nabh-compliance";

export async function GET() {
  try {
    const compliance = await getNabhComplianceSnapshot();
    const todayStart = startOfDay(new Date());

    const recentAudits = await prisma.auditLog.findMany({
      where: { created_at: { gte: todayStart } },
      orderBy: { created_at: "desc" },
      take: 25,
      select: {
        id: true,
        username: true,
        role: true,
        action: true,
        entity_type: true,
        entity_id: true,
        summary: true,
        created_at: true,
      },
    });

    return NextResponse.json({ ...compliance, recentAudits });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load compliance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
