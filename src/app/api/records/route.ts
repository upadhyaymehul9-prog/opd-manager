import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { serializeBill } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { serializePrescription } from "@/lib/serialize";
import { serializeVisit } from "@/lib/serialize";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const dayStart = dateParam
      ? startOfDay(new Date(dateParam))
      : startOfDay(new Date());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const visits = await prisma.patientVisit.findMany({
      where: {
        registered_at: { gte: dayStart, lt: dayEnd },
      },
      include: {
        doctors: true,
        prescription: {
          include: {
            items: { orderBy: { sort_order: "asc" } },
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
      date: dayStart.toISOString().slice(0, 10),
      total: rows.length,
      completed: rows.filter((r) => r.visit.status === "completed").length,
      rows,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Records error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
