import type { Prisma } from "@prisma/client";
import { parseAbhaInput } from "@/lib/abha";
import { resolveCanonicalPatientIdTx } from "@/lib/patient-merge";

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
  input: {
    name: string;
    mobile: string | null;
    address?: string | null;
    abha_id?: string | null;
    gender?: string | null;
    emergency_contact?: string | null;
    date_of_birth?: Date | null;
    occupation?: string | null;
    national_id_type?: string | null;
    national_id?: string | null;
  },
) {
  const name = input.name.trim();
  const mobile = input.mobile?.trim() || null;
  const address = input.address?.trim() || null;
  const abha_id = input.abha_id ? parseAbhaInput(input.abha_id) : null;
  const gender = input.gender?.trim() || null;
  const emergency_contact = input.emergency_contact?.trim() || null;
  const occupation = input.occupation?.trim() || null;
  const national_id_type = input.national_id_type?.trim() || null;
  const national_id = input.national_id?.trim() || null;
  const date_of_birth = input.date_of_birth ?? null;

  if (abha_id) {
    const byAbha = await tx.patient.findUnique({ where: { abha_id } });
    if (byAbha) {
      const canonicalId = await resolveCanonicalPatientIdTx(tx, byAbha.id);
      const patient =
        canonicalId === byAbha.id
          ? byAbha
          : await tx.patient.findUniqueOrThrow({ where: { id: canonicalId } });
      const updates: { name?: string; mobile?: string | null; address?: string | null; gender?: string | null; emergency_contact?: string | null } = {};
      if (!patient.name?.trim() && name) updates.name = name;
      if (mobile && patient.mobile !== mobile) updates.mobile = mobile;
      if (address && patient.address !== address) updates.address = address;
      if (gender && patient.gender !== gender) updates.gender = gender;
      if (emergency_contact && patient.emergency_contact !== emergency_contact) {
        updates.emergency_contact = emergency_contact;
      }
      if (Object.keys(updates).length > 0) {
        return tx.patient.update({ where: { id: patient.id }, data: updates });
      }
      return patient;
    }
  }

  if (mobile) {
    const byMobile = await tx.patient.findFirst({
      where: { mobile, merged_into_patient_id: null },
    });
    if (byMobile) {
      const updates: {
        name?: string;
        address?: string | null;
        abha_id?: string | null;
        gender?: string | null;
        emergency_contact?: string | null;
        date_of_birth?: Date | null;
        occupation?: string | null;
        national_id?: string | null;
        national_id_type?: string | null;
      } = {};
      // Matching on mobile alone is weak (numbers get reused/recycled), so a
      // name that doesn't match the record on file is never overwritten —
      // only fill it in if the record has no name at all.
      if (!byMobile.name?.trim() && name) updates.name = name;
      if (address && byMobile.address !== address) updates.address = address;
      if (abha_id && !byMobile.abha_id) updates.abha_id = abha_id;
      if (gender && !byMobile.gender) updates.gender = gender;
      if (emergency_contact && !byMobile.emergency_contact) {
        updates.emergency_contact = emergency_contact;
      }
      if (date_of_birth && !byMobile.date_of_birth) updates.date_of_birth = date_of_birth;
      if (occupation && !byMobile.occupation) updates.occupation = occupation;
      if (national_id && !byMobile.national_id) {
        updates.national_id = national_id;
        updates.national_id_type = national_id_type ?? null;
      }
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
    data: {
      patient_number,
      name,
      mobile,
      address,
      abha_id,
      gender,
      emergency_contact,
      date_of_birth,
      occupation,
      national_id_type,
      national_id,
      mobile_verified_at: mobile ? new Date() : null,
    },
  });
}
