import type { Prisma } from "@prisma/client";

export const LOW_STOCK_THRESHOLD = 10;
export const MIN_SHELF_LIFE_MONTHS = 3;
export const EXPIRY_WARNING_DAYS = 90;

type Tx = Prisma.TransactionClient;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return startOfDay(d);
}

export function minAllowedExpiryDate(): Date {
  return addMonths(new Date(), MIN_SHELF_LIFE_MONTHS);
}

export function minAllowedExpiryDateStr(): string {
  return minAllowedExpiryDate().toISOString().slice(0, 10);
}

export function daysUntil(date: Date): number {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isBatchUsable(expiry: Date): boolean {
  return startOfDay(expiry) >= startOfDay(new Date());
}

export function isExpired(expiry: Date): boolean {
  return daysUntil(expiry) < 0;
}

export function isExpiringSoon(expiry: Date): boolean {
  const days = daysUntil(expiry);
  return days >= 0 && days <= EXPIRY_WARNING_DAYS;
}

export function validateExpiryForReceiving(expiry: Date): string | null {
  const minDate = minAllowedExpiryDate();
  const exp = startOfDay(expiry);
  if (exp < minDate) {
    return `Expiry must be at least ${MIN_SHELF_LIFE_MONTHS} months from today (${minDate.toISOString().slice(0, 10)} or later)`;
  }
  return null;
}

export function usableBatchWhere(medicineId?: string) {
  const today = startOfDay(new Date());
  return {
    quantity: { gt: 0 },
    expiry_date: { gte: today },
    ...(medicineId ? { medicine_id: medicineId } : {}),
  };
}

export async function getAvailableQuantity(
  tx: Tx,
  medicineId: string,
): Promise<number> {
  const result = await tx.stockBatch.aggregate({
    where: usableBatchWhere(medicineId),
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
    where: usableBatchWhere(medicineId),
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
    where: {
      medicine_id: medicineId,
      expiry_date: { gte: startOfDay(new Date()) },
    },
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

export function serializeBatch(b: {
  id: string;
  batch_no: string;
  expiry_date: Date;
  quantity: number;
  mrp: number | null;
  created_at: Date;
}) {
  const days = daysUntil(b.expiry_date);
  return {
    id: b.id,
    batch_no: b.batch_no,
    expiry_date: b.expiry_date.toISOString().slice(0, 10),
    quantity: b.quantity,
    mrp: b.mrp,
    received_at: b.created_at.toISOString(),
    days_until_expiry: days,
    expired: days < 0,
    expiring_soon: days >= 0 && days <= EXPIRY_WARNING_DAYS,
  };
}
