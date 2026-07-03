import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function nextConsultationBillNo(tx: Tx): Promise<string> {
  const row = await tx.consultationBillCounter.upsert({
    where: { id: "default" },
    create: { id: "default", last_no: 1 },
    update: { last_no: { increment: 1 } },
  });
  const year = new Date().getFullYear();
  return `CON-${year}-${String(row.last_no).padStart(5, "0")}`;
}
