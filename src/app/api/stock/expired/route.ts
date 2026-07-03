import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeMedicine } from "@/lib/serialize";
import { serializeBatch, startOfDay } from "@/lib/stock";

export async function GET() {
  try {
    const today = startOfDay(new Date());

    const batches = await prisma.stockBatch.findMany({
      where: {
        quantity: { gt: 0 },
        expiry_date: { lt: today },
      },
      include: { medicine: true },
      orderBy: [{ expiry_date: "asc" }, { medicine: { name: "asc" } }],
    });

    return NextResponse.json(
      batches.map((b) => ({
        batch: serializeBatch(b),
        medicine: serializeMedicine(b.medicine),
      })),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Expired stock error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
