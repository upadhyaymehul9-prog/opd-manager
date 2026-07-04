import { addDays, startOfDay } from "date-fns";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = addDays(todayStart, 1);
    const date = todayStart.toISOString().slice(0, 10);

    const payload: {
      date: string;
      reception?: { bills: number; amount: number };
      pharmacy?: { bills: number; amount: number; gst: number };
    } = { date };

    if (["reception", "admin", "manager"].includes(session.role)) {
      const visits = await prisma.patientVisit.findMany({
        where: {
          consultation_paid_at: { gte: todayStart, lt: todayEnd },
          consultation_fee: { not: null },
        },
      });
      payload.reception = {
        bills: visits.length,
        amount: visits.reduce((s, v) => s + (v.consultation_fee ?? 0), 0),
      };
    }

    if (["pharmacy", "admin", "manager"].includes(session.role)) {
      const bills = await prisma.pharmacyBill.findMany({
        where: { created_at: { gte: todayStart, lt: todayEnd } },
      });
      payload.pharmacy = {
        bills: bills.length,
        amount: bills.reduce((s, b) => s + b.grand_total, 0),
        gst: bills.reduce((s, b) => s + b.gst_total, 0),
      };
    }

    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Collection error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
