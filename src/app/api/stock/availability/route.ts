import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams
      .get("ids")
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (!ids?.length) {
      return NextResponse.json(
        { error: "ids query param required" },
        { status: 400 },
      );
    }

    const batches = await prisma.stockBatch.groupBy({
      by: ["medicine_id"],
      where: { medicine_id: { in: ids }, quantity: { gt: 0 } },
      _sum: { quantity: true },
    });

    const availability: Record<
      string,
      { available: number; low: boolean; out_of_stock: boolean }
    > = {};

    for (const id of ids) {
      const row = batches.find((b) => b.medicine_id === id);
      const available = row?._sum.quantity ?? 0;
      availability[id] = {
        available,
        low: available > 0 && available <= LOW_STOCK_THRESHOLD,
        out_of_stock: available === 0,
      };
    }

    return NextResponse.json(availability);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stock error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
