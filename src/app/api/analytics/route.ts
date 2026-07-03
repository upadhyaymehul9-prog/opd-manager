import { NextResponse } from "next/server";
import { startOfDay, subDays } from "date-fns";
import { buildAnalytics } from "@/lib/analytics";
import type { AnalyticsPharmacySales } from "@/lib/analytics-types";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const recentStart = subDays(todayStart, 14);

    const [recentVisits, todayBills] = await Promise.all([
      prisma.patientVisit.findMany({
        where: { registered_at: { gte: recentStart } },
        include: { doctors: { select: { name: true } } },
        orderBy: { registered_at: "asc" },
      }),
      prisma.pharmacyBill.findMany({
        where: { created_at: { gte: todayStart } },
        orderBy: { created_at: "asc" },
      }),
    ]);

    const todayVisits = recentVisits.filter((v) => v.registered_at >= todayStart);

    const pharmacy: AnalyticsPharmacySales = {
      billsToday: todayBills.length,
      revenueToday: todayBills.reduce((s, b) => s + b.grand_total, 0),
      gstToday: todayBills.reduce((s, b) => s + b.gst_total, 0),
      byPayment: ["cash", "upi", "card"].map((mode) => {
        const rows = todayBills.filter((b) => b.payment_mode === mode);
        return {
          mode,
          count: rows.length,
          amount: rows.reduce((s, b) => s + b.grand_total, 0),
        };
      }),
    };

    const payload = buildAnalytics(todayVisits, recentVisits, now, pharmacy);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analytics error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
