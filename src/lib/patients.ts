import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function nextPatientNumber(tx: Tx): Promise<number> {
  const row = await tx.patientRegistry.upsert({
    where: { id: "default" },
    create: { id: "default", last_number: 1 },
    update: { last_number: { increment: 1 } },
  });
  return row.last_number;
}

export async function findOrCreatePatient(
  tx: Tx,
  input: { name: string; mobile: string | null },
) {
  const name = input.name.trim();
  const mobile = input.mobile?.trim() || null;

  if (mobile) {
    const byMobile = await tx.patient.findFirst({
      where: { mobile },
    });
    if (byMobile) {
      if (byMobile.name !== name) {
        return tx.patient.update({
          where: { id: byMobile.id },
          data: { name },
        });
      }
      return byMobile;
    }
  }

  const patient_number = await nextPatientNumber(tx);
  return tx.patient.create({
    data: { patient_number, name, mobile },
  });
}
