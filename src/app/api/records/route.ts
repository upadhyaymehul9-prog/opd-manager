import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { resolveRange, todayStr } from "@/lib/date-range";
import { serializeBill } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { serializePrescription } from "@/lib/serialize";
import { serializeVisit } from "@/lib/serialize";

export async function GET(request: Request) {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;

    let { searchParams } = new URL(request.url);
    if (session?.role === "pharmacy" || session?.role === "reception") {
      const today = todayStr();
      searchParams = new URLSearchParams({ from: today, to: today });
    }

    const { rangeStart, rangeEndExclusive, from } = resolveRange(searchParams);

    const visits = await prisma.patientVisit.findMany({
      where: {
        registered_at: { gte: rangeStart, lt: rangeEndExclusive },
      },
      include: {
        doctors: true,
        patient: true,
        prescription: {
          include: {
            items: { where: { voided_at: null }, orderBy: { sort_order: "asc" } },
          },
        },
        pharmacy_bill: { include: { items: true } },
      },
      orderBy: [{ token_number: "desc" }],
    });

    const rows = visits.map((v) => {
      const rx = v.prescription;
      const bill = v.pharmacy_bill;
      const dispensed =
        rx?.items.filter((i) => i.dispensed).length ?? 0;
      return {
        visit: serializeVisit({
          ...v,
          doctors: v.doctors,
        }),
        prescription: rx ? serializePrescription(rx) : null,
        bill: bill ? serializeBill(bill) : null,
        summary: {
          medicine_count: rx?.items.length ?? 0,
          dispensed_count: dispensed,
          has_bill: Boolean(bill),
          bill_total: bill?.grand_total ?? null,
        },
      };
    });

    return NextResponse.json({
      date: from,
      total: rows.length,
      completed: rows.filter((r) => r.visit.status === "completed").length,
      rows,
    });
  } catch (e) {
    return errorResponse("records GET", e, "Records error");
  }
}
