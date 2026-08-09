import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function nextConsultationBillNo(tx: Tx, clinicId: string): Promise<string> {
  const row = await tx.consultationBillCounter.upsert({
    where: { clinic_id: clinicId },
    create: { clinic_id: clinicId, last_no: 1 },
    update: { last_no: { increment: 1 } },
  });
  const year = new Date().getFullYear();
  return `CON-${year}-${String(row.last_no).padStart(5, "0")}`;
}
