import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { serializeMedicine } from "@/lib/serialize";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lowOnly = searchParams.get("low") === "true";

    const medicines = await prisma.medicine.findMany({
      where: { is_active: true },
      include: {
        stock_batches: {
          where: { quantity: { gt: 0 } },
          orderBy: [{ expiry_date: "asc" }, { created_at: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    });

    const rows = medicines.map((med) => {
      const available = med.stock_batches.reduce((sum, b) => sum + b.quantity, 0);
      return {
        medicine: serializeMedicine(med),
        available,
        low: available > 0 && available <= LOW_STOCK_THRESHOLD,
        out_of_stock: available === 0,
        batches: med.stock_batches.map((b) => ({
          id: b.id,
          batch_no: b.batch_no,
          expiry_date: b.expiry_date?.toISOString().slice(0, 10) ?? null,
          quantity: b.quantity,
          mrp: b.mrp,
        })),
      };
    });

    const filtered = lowOnly
      ? rows.filter((r) => r.low || r.out_of_stock)
      : rows;

    return NextResponse.json(filtered);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stock error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const medicine_id = String(body.medicine_id ?? "").trim();
    const quantity = Number(body.quantity);

    if (!medicine_id || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "medicine_id and positive quantity are required" },
        { status: 400 },
      );
    }

    const medicine = await prisma.medicine.findUnique({
      where: { id: medicine_id },
    });
    if (!medicine) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }

    const batch = await prisma.stockBatch.create({
      data: {
        medicine_id,
        quantity: Math.round(quantity),
        batch_no: body.batch_no?.trim() || null,
        expiry_date: body.expiry_date ? new Date(body.expiry_date) : null,
        mrp: body.mrp != null && body.mrp !== "" ? Number(body.mrp) : null,
      },
    });

    return NextResponse.json(
      {
        id: batch.id,
        medicine_id: batch.medicine_id,
        quantity: batch.quantity,
        batch_no: batch.batch_no,
        expiry_date: batch.expiry_date?.toISOString().slice(0, 10) ?? null,
        mrp: batch.mrp,
      },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stock error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
