import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { startOfDay } from "@/lib/date-range";
import { withClinicScope } from "@/lib/tenant";
import { getNabhComplianceSnapshot } from "@/lib/nabh-compliance";

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const todayStart = startOfDay(new Date());

    const { compliance, recentAudits } = await withClinicScope(
      session.clinicId,
      async (tx) => {
        const compliance = await getNabhComplianceSnapshot(tx);

        const recentAudits = await tx.auditLog.findMany({
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

        return { compliance, recentAudits };
      },
    );

    return NextResponse.json({ ...compliance, recentAudits });
  } catch (e) {
    return errorResponse("nabh/compliance GET", e, "Failed to load compliance");
  }
}
