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
  input: { name: string; mobile: string | null; address?: string | null },
) {
  const name = input.name.trim();
  const mobile = input.mobile?.trim() || null;
  const address = input.address?.trim() || null;

  if (mobile) {
    const byMobile = await tx.patient.findFirst({
      where: { mobile },
    });
    if (byMobile) {
      const updates: { name?: string; address?: string | null } = {};
      if (byMobile.name !== name) updates.name = name;
      if (address && byMobile.address !== address) updates.address = address;
      if (Object.keys(updates).length > 0) {
        return tx.patient.update({
          where: { id: byMobile.id },
          data: updates,
        });
      }
      return byMobile;
    }
  }

  const patient_number = await nextPatientNumber(tx);
  return tx.patient.create({
    data: { patient_number, name, mobile, address },
  });
}
