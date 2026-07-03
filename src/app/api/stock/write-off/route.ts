import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeMedicine } from "@/lib/serialize";
import { serializeBatch } from "@/lib/stock";

export async function GET() {
  try {
    const records = await prisma.stockWriteOff.findMany({
      include: { medicine: true },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    return NextResponse.json(
      records.map((r) => ({
        id: r.id,
        medicine: serializeMedicine(r.medicine),
        batch_no: r.batch_no,
        quantity: r.quantity,
        reason: r.reason,
        notes: r.notes,
        created_at: r.created_at.toISOString(),
      })),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Write-off error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const batch_id = String(body.batch_id ?? "").trim();
    const reason = String(body.reason ?? "expired").trim();
    const notes = body.notes?.trim() || null;
    const qtyOverride =
      body.quantity != null ? Math.round(Number(body.quantity)) : null;

    if (!batch_id) {
      return NextResponse.json({ error: "batch_id required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.findUnique({
        where: { id: batch_id },
        include: { medicine: true },
      });

      if (!batch) {
        throw new Error("Batch not found");
      }

      const deduct = qtyOverride ?? batch.quantity;
      if (deduct <= 0 || deduct > batch.quantity) {
        throw new Error("Invalid quantity for write-off");
      }

      const remaining = batch.quantity - deduct;
      await tx.stockBatch.update({
        where: { id: batch_id },
        data: { quantity: remaining },
      });

      const record = await tx.stockWriteOff.create({
        data: {
          medicine_id: batch.medicine_id,
          batch_id: batch.id,
          batch_no: batch.batch_no,
          quantity: deduct,
          reason,
          notes,
        },
        include: { medicine: true },
      });

      return { record, batch: { ...batch, quantity: remaining } };
    });

    return NextResponse.json(
      {
        write_off: {
          id: result.record.id,
          medicine: serializeMedicine(result.record.medicine),
          batch_no: result.record.batch_no,
          quantity: result.record.quantity,
          reason: result.record.reason,
          created_at: result.record.created_at.toISOString(),
        },
        batch: serializeBatch({
          ...result.batch,
          expiry_date: result.batch.expiry_date,
          created_at: result.batch.created_at,
        }),
      },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Write-off error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
