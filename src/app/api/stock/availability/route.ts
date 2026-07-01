import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LOW_STOCK_THRESHOLD, usableBatchWhere } from "@/lib/stock";

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

    const batches = await prisma.stockBatch.findMany({
      where: {
        medicine_id: { in: ids },
        ...usableBatchWhere(),
      },
    });

    const totals = new Map<string, number>();
    for (const batch of batches) {
      totals.set(
        batch.medicine_id,
        (totals.get(batch.medicine_id) ?? 0) + batch.quantity,
      );
    }

    const availability: Record<
      string,
      { available: number; low: boolean; out_of_stock: boolean }
    > = {};

    for (const id of ids) {
      const available = totals.get(id) ?? 0;
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
