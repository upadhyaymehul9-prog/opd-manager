import { NextResponse } from "next/server";
import { startOfDay, subDays } from "date-fns";
import { errorResponse } from "@/lib/api-error";
import { buildAnalytics } from "@/lib/analytics";
import type { AnalyticsPharmacySales } from "@/lib/analytics-types";
import { resolveRange } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { rangeStart, rangeEndExclusive, from, to, isToday } =
      resolveRange(searchParams);
    const now = new Date();
    const todayStart = startOfDay(now);
    const recentStart = subDays(todayStart, 14);

    const [periodVisits, recentVisits, periodBills, procedures] =
      await Promise.all([
        prisma.patientVisit.findMany({
          where: {
            registered_at: { gte: rangeStart, lt: rangeEndExclusive },
          },
          include: { doctors: { select: { name: true } } },
          orderBy: { registered_at: "asc" },
        }),
        isToday
          ? prisma.patientVisit.findMany({
              where: { registered_at: { gte: recentStart } },
              include: { doctors: { select: { name: true } } },
              orderBy: { registered_at: "asc" },
            })
          : Promise.resolve([]),
        prisma.pharmacyBill.findMany({
          where: {
            created_at: { gte: rangeStart, lt: rangeEndExclusive },
          },
          orderBy: { created_at: "asc" },
        }),
        prisma.visitProcedure.findMany({
          where: { created_at: { gte: rangeStart, lt: rangeEndExclusive } },
        }),
      ]);

    const pharmacy: AnalyticsPharmacySales = {
      billsCount: periodBills.length,
      revenue: periodBills.reduce((s, b) => s + b.grand_total, 0),
      gst: periodBills.reduce((s, b) => s + b.gst_total, 0),
      byPayment: ["cash", "upi", "card"].map((mode) => {
        const rows = periodBills.filter((b) => b.payment_mode === mode);
        return {
          mode,
          count: rows.length,
          amount: rows.reduce((s, b) => s + b.grand_total, 0),
        };
      }),
    };

    const procedureRevenue = procedures.reduce((s, p) => s + (p.fee ?? 0), 0);

    const payload = buildAnalytics(
      periodVisits,
      recentVisits,
      now,
      pharmacy,
      {
        from,
        to,
        isToday,
        rangeStart,
        rangeEndExclusive,
      },
      procedureRevenue,
    );
    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse("analytics GET", e, "Analytics error");
  }
}
