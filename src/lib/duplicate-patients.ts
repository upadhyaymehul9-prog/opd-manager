import { prisma } from "@/lib/prisma";
import { resolveCanonicalPatientIdTx } from "@/lib/patient-merge";

function activePatientFilter(excludeId?: string) {
  return {
    merged_into_patient_id: null,
    ...(excludeId ? { NOT: { id: excludeId } } : {}),
  };
}

export async function findDuplicatePatients(input: {
  name: string;
  mobile?: string | null;
  abha_id?: string | null;
  national_id?: string | null;
  date_of_birth?: string | Date | null;
  exclude_patient_id?: string;
}) {
  const name = input.name.trim();
  const mobile = input.mobile?.trim() || null;
  const abha_id = input.abha_id?.trim() || null;
  const national_id = input.national_id?.trim() || null;
  const dob =
    input.date_of_birth instanceof Date
      ? input.date_of_birth
      : input.date_of_birth
        ? new Date(input.date_of_birth)
        : null;
  const dobValid = dob && !Number.isNaN(dob.getTime()) ? dob : null;

  const or: Array<Record<string, unknown>> = [];

  if (mobile) or.push({ mobile });
  if (abha_id) or.push({ abha_id });
  if (national_id) or.push({ national_id });

  if (name.length >= 3) {
    or.push({
      name: { equals: name, mode: "insensitive" },
    });
    if (dobValid) {
      or.push({
        AND: [
          { name: { equals: name, mode: "insensitive" } },
          { date_of_birth: dobValid },
        ],
      });
    }
  }

  if (dobValid && mobile) {
    or.push({
      AND: [{ date_of_birth: dobValid }, { mobile }],
    });
  }

  if (or.length === 0) return [];

  return prisma.patient.findMany({
    where: {
      OR: or,
      ...activePatientFilter(input.exclude_patient_id),
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
    take: 8,
    orderBy: { patient_number: "desc" },
  });
}

export async function resolveCanonicalPatientId(
  patientId: string,
): Promise<string> {
  return resolveCanonicalPatientIdTx(prisma, patientId);
}
