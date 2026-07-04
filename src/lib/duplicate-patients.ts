import { prisma } from "@/lib/prisma";

export async function findDuplicatePatients(input: {
  name: string;
  mobile?: string | null;
  abha_id?: string | null;
  national_id?: string | null;
  exclude_patient_id?: string;
}) {
  const name = input.name.trim();
  const mobile = input.mobile?.trim() || null;
  const abha_id = input.abha_id?.trim() || null;
  const national_id = input.national_id?.trim() || null;

  const or: Array<Record<string, unknown>> = [];

  if (mobile) or.push({ mobile });
  if (abha_id) or.push({ abha_id });
  if (national_id) or.push({ national_id });

  if (name.length >= 3) {
    or.push({
      name: { equals: name, mode: "insensitive" },
    });
  }

  if (or.length === 0) return [];

  return prisma.patient.findMany({
    where: {
      OR: or,
      ...(input.exclude_patient_id
        ? { NOT: { id: input.exclude_patient_id } }
        : {}),
    },
    select: {
      id: true,
      patient_number: true,
      name: true,
      mobile: true,
      abha_id: true,
      gender: true,
      date_of_birth: true,
    },
    take: 5,
  });
}
