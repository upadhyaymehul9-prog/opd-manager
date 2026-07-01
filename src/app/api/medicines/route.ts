import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeMedicine } from "@/lib/serialize";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const medicines = await prisma.medicine.findMany({
      where: {
        is_active: true,
        ...(q
          ? { name: { contains: q, mode: "insensitive" } }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 20,
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
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const medicine = await prisma.medicine.create({
      data: {
        name,
        form: body.form?.trim() || null,
        strength: body.strength?.trim() || null,
      },
    });

    return NextResponse.json(serializeMedicine(medicine), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
