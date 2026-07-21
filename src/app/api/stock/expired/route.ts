import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
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
    return errorResponse("stock/expired GET", e, "Expired stock error");
  }
}
