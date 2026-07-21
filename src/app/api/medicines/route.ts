import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { serializeMedicine } from "@/lib/serialize";
import { LOW_STOCK_THRESHOLD, startOfDay } from "@/lib/stock";

function stockTotalsForMedicines(
  medicineIds: string[],
  batches: { medicine_id: string; quantity: number }[],
) {
  const totals = new Map<string, number>();
  for (const batch of batches) {
    if (!medicineIds.includes(batch.medicine_id)) continue;
    totals.set(
      batch.medicine_id,
      (totals.get(batch.medicine_id) ?? 0) + batch.quantity,
    );
  }
  return totals;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const withStock = searchParams.get("stock") === "true";
    const inStockOnly = searchParams.get("in_stock") === "true";
    const limit = Math.min(
      Number(searchParams.get("limit") ?? (q ? 50 : 200)),
      500,
    );

    const today = startOfDay(new Date());

    const usableBatches = await prisma.stockBatch.findMany({
      where: {
        quantity: { gt: 0 },
        expiry_date: { gte: today },
      },
      select: { medicine_id: true, quantity: true },
    });

    const stockedIds = [
      ...new Set(usableBatches.map((b) => b.medicine_id)),
    ];

    if (inStockOnly && stockedIds.length === 0) {
      return NextResponse.json([]);
    }

    const medicines = await prisma.medicine.findMany({
      where: {
        is_active: true,
        ...(inStockOnly ? { id: { in: stockedIds } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { brand: { contains: q, mode: "insensitive" } },
                { strength: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { strength: "asc" }],
      take: limit,
    });

    if (!withStock || medicines.length === 0) {
      return NextResponse.json(medicines.map(serializeMedicine));
    }

    const totals = stockTotalsForMedicines(
      medicines.map((m) => m.id),
      usableBatches,
    );

    return NextResponse.json(
      medicines
        .map((m) => {
          const available = totals.get(m.id) ?? 0;
          return {
            ...serializeMedicine(m),
            stock: {
              available,
              low: available > 0 && available <= LOW_STOCK_THRESHOLD,
              out_of_stock: available === 0,
            },
          };
        })
        .filter((m) => !inStockOnly || m.stock.available > 0)
        .sort((a, b) => {
          const aStock = a.stock?.available ?? 0;
          const bStock = b.stock?.available ?? 0;
          if (aStock > 0 && bStock === 0) return -1;
          if (bStock > 0 && aStock === 0) return 1;
          return a.name.localeCompare(b.name);
        }),
    );
  } catch (e) {
    return errorResponse("medicines GET", e, "Database error");
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Generic name is required" },
        { status: 400 },
      );
    }

    const brand = body.brand?.trim() || null;
    const form = body.form?.trim() || null;
    const strength = body.strength?.trim() || null;

    const existing = await prisma.medicine.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        brand: brand,
        form: form,
        strength: strength,
      },
    });
    if (existing) {
      return NextResponse.json(serializeMedicine(existing));
    }

    const medicine = await prisma.medicine.create({
      data: { name, brand, form, strength },
    });

    return NextResponse.json(serializeMedicine(medicine), { status: 201 });
  } catch (e) {
    return errorResponse("medicines POST", e, "Database error");
  }
}
