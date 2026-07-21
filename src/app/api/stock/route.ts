import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import {
  LOW_STOCK_THRESHOLD,
  serializeBatch,
  startOfDay,
  validateExpiryForReceiving,
} from "@/lib/stock";
import { serializeMedicine } from "@/lib/serialize";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lowOnly = searchParams.get("low") === "true";
    const stockedOnly = searchParams.get("stocked") === "true";

    const medicines = await prisma.medicine.findMany({
      where: { is_active: true },
      include: {
        stock_batches: {
          where: { quantity: { gt: 0 } },
          orderBy: [{ expiry_date: "asc" }, { created_at: "asc" }],
        },
        _count: { select: { stock_batches: true } },
      },
      orderBy: { name: "asc" },
    });

    const rows = medicines.map((med) => {
      const usableBatches = med.stock_batches.filter((b) =>
        startOfDay(b.expiry_date) >= startOfDay(new Date()),
      );
      const available = usableBatches.reduce((sum, b) => sum + b.quantity, 0);
      const everStocked = med._count.stock_batches > 0;

      return {
        medicine: serializeMedicine(med),
        available,
        ever_stocked: everStocked,
        low: everStocked && available > 0 && available <= LOW_STOCK_THRESHOLD,
        depleted: everStocked && available === 0,
        out_of_stock: !everStocked,
        batches: med.stock_batches.map(serializeBatch),
      };
    });

    let filtered = rows;
    if (stockedOnly) {
      filtered = filtered.filter((r) => r.ever_stocked);
    }
    if (lowOnly) {
      filtered = filtered.filter((r) => r.low || r.depleted);
    }

    return NextResponse.json(filtered);
  } catch (e) {
    return errorResponse("stock GET", e, "Stock error");
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;

    const body = await request.json();
    const medicine_id = String(body.medicine_id ?? "").trim();
    const quantity = Number(body.quantity);

    const batch_no = String(body.batch_no ?? "").trim();
    const expiryRaw = String(body.expiry_date ?? "").trim();

    if (!medicine_id || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "medicine_id and positive quantity are required" },
        { status: 400 },
      );
    }
    if (!batch_no) {
      return NextResponse.json(
        { error: "Batch number is required" },
        { status: 400 },
      );
    }
    if (!expiryRaw) {
      return NextResponse.json(
        { error: "Expiry date is required" },
        { status: 400 },
      );
    }

    const expiry_date = new Date(expiryRaw);
    if (Number.isNaN(expiry_date.getTime())) {
      return NextResponse.json(
        { error: "Invalid expiry date" },
        { status: 400 },
      );
    }

    const expiryError = validateExpiryForReceiving(expiry_date);
    if (expiryError) {
      return NextResponse.json({ error: expiryError }, { status: 400 });
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
        batch_no,
        expiry_date,
        pack_size:
          body.pack_size != null && Number(body.pack_size) > 0
            ? Math.round(Number(body.pack_size))
            : 1,
        mrp: body.mrp != null && body.mrp !== "" ? Number(body.mrp) : null,
      },
    });

    return NextResponse.json(serializeBatch(batch), { status: 201 });
  } catch (e) {
    return errorResponse("stock POST", e, "Stock error");
  }
}
