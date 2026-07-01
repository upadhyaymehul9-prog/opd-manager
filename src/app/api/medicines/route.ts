import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeMedicine } from "@/lib/serialize";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
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

    return NextResponse.json(medicines.map(serializeMedicine));
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
