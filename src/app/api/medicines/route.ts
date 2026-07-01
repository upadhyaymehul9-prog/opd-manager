import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeMedicine } from "@/lib/serialize";
import { LOW_STOCK_THRESHOLD, startOfDay } from "@/lib/stock";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const withStock = searchParams.get("stock") === "true";
    const limit = Math.min(
      Number(searchParams.get("limit") ?? (q ? 50 : 200)),
      500,
    );

    const medicines = await prisma.medicine.findMany({
      where: {
        is_active: true,
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

    const today = startOfDay(new Date());
    const batches = await prisma.stockBatch.findMany({
      where: {
        medicine_id: { in: medicines.map((m) => m.id) },
        quantity: { gt: 0 },
        expiry_date: { gte: today },
      },
    });

    const totals = new Map<string, number>();
    for (const batch of batches) {
      totals.set(
        batch.medicine_id,
        (totals.get(batch.medicine_id) ?? 0) + batch.quantity,
      );
    }

    return NextResponse.json(
      medicines.map((m) => {
        const available = totals.get(m.id) ?? 0;
        return {
          ...serializeMedicine(m),
          stock: {
            available,
            low: available > 0 && available <= LOW_STOCK_THRESHOLD,
            out_of_stock: available === 0,
          },
        };
      }),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
