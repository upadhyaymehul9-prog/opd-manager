import type { Prisma } from "@prisma/client";

export const LOW_STOCK_THRESHOLD = 10;

type Tx = Prisma.TransactionClient;

export async function getAvailableQuantity(
  tx: Tx,
  medicineId: string,
): Promise<number> {
  const result = await tx.stockBatch.aggregate({
    where: { medicine_id: medicineId, quantity: { gt: 0 } },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

export async function deductFromStock(
  tx: Tx,
  medicineId: string,
  qty: number,
) {
  if (qty <= 0) return;

  const batches = await tx.stockBatch.findMany({
    where: { medicine_id: medicineId, quantity: { gt: 0 } },
    orderBy: [{ expiry_date: "asc" }, { created_at: "asc" }],
  });

  let remaining = qty;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    await tx.stockBatch.update({
      where: { id: batch.id },
      data: { quantity: batch.quantity - take },
    });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error(
      `Insufficient stock — need ${qty}, short by ${remaining}. Add stock first.`,
    );
  }
}

export async function restoreToStock(
  tx: Tx,
  medicineId: string,
  qty: number,
) {
  if (qty <= 0) return;

  const batch = await tx.stockBatch.findFirst({
    where: { medicine_id: medicineId },
    orderBy: { created_at: "desc" },
  });

  if (batch) {
    await tx.stockBatch.update({
      where: { id: batch.id },
      data: { quantity: batch.quantity + qty },
    });
    return;
  }

  await tx.stockBatch.create({
    data: {
      medicine_id: medicineId,
      quantity: qty,
      batch_no: "RETURN",
      expiry_date: new Date("2099-12-31"),
    },
  });
}
