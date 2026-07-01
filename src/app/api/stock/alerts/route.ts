import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatMedicineLabel } from "@/lib/medicine";
import {
  LOW_STOCK_THRESHOLD,
  isExpiringSoon,
  isExpired,
  startOfDay,
} from "@/lib/stock";

export async function GET() {
  try {
    const today = startOfDay(new Date());

    const batches = await prisma.stockBatch.findMany({
      where: { quantity: { gt: 0 } },
      include: { medicine: true },
      orderBy: [{ expiry_date: "asc" }, { created_at: "asc" }],
    });

    const stockedMedicineIds = [
      ...new Set(
        (
          await prisma.stockBatch.groupBy({
            by: ["medicine_id"],
          })
        ).map((g) => g.medicine_id),
      ),
    ];

    const lowStock: { medicine: string; available: number }[] = [];
    const depleted: { medicine: string }[] = [];

    for (const medicineId of stockedMedicineIds) {
      const medicine = await prisma.medicine.findUnique({
        where: { id: medicineId },
      });
      if (!medicine) continue;

      const usable = batches.filter(
        (b) =>
          b.medicine_id === medicineId &&
          startOfDay(b.expiry_date) >= today,
      );
      const available = usable.reduce((sum, b) => sum + b.quantity, 0);
      const label = formatMedicineLabel(medicine);

      if (available > 0 && available <= LOW_STOCK_THRESHOLD) {
        lowStock.push({ medicine: label, available });
      } else if (available === 0) {
        depleted.push({ medicine: label });
      }
    }

    const expiringSoon = batches
      .filter((b) => isExpiringSoon(b.expiry_date))
      .map((b) => ({
        medicine: formatMedicineLabel(b.medicine),
        batch_no: b.batch_no,
        expiry_date: b.expiry_date.toISOString().slice(0, 10),
        quantity: b.quantity,
        days_until_expiry: Math.ceil(
          (startOfDay(b.expiry_date).getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      }));

    const expired = batches
      .filter((b) => isExpired(b.expiry_date))
      .map((b) => ({
        medicine: formatMedicineLabel(b.medicine),
        batch_no: b.batch_no,
        expiry_date: b.expiry_date.toISOString().slice(0, 10),
        quantity: b.quantity,
      }));

    return NextResponse.json({
      low_stock: lowStock,
      depleted,
      expiring_soon: expiringSoon,
      expired,
      counts: {
        low_stock: lowStock.length,
        depleted: depleted.length,
        expiring_soon: expiringSoon.length,
        expired: expired.length,
        total:
          lowStock.length +
          depleted.length +
          expiringSoon.length +
          expired.length,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stock alerts error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
