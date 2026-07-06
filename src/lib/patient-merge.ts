import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

const FILL_IF_BLANK_FIELDS = [
  "mobile",
  "address",
  "allergies",
  "blood_group",
  "gender",
  "emergency_contact",
  "date_of_birth",
  "occupation",
  "national_id_type",
  "national_id",
] as const;

export type MergeSummary = {
  visitsMoved: number;
  appointmentsMoved: number;
  consentsMoved: number;
  fieldsFilledOnTarget: string[];
  abhaMoved: boolean;
};

export async function resolveCanonicalPatientIdTx(
  tx: Tx,
  patientId: string,
): Promise<string> {
  let current = patientId;
  const seen = new Set<string>();

  for (let depth = 0; depth < 10; depth++) {
    if (seen.has(current)) break;
    seen.add(current);

    const row = await tx.patient.findUnique({
      where: { id: current },
      select: { merged_into_patient_id: true },
    });
    if (!row?.merged_into_patient_id) return current;
    current = row.merged_into_patient_id;
  }

  return current;
}

/**
 * Merges `sourceId` into `targetId`: every visit/appointment/consent that
 * pointed at the source patient is repointed to the target, any blank field
 * on the target is filled from the source, and the source row is marked
 * merged (never deleted) so old references still resolve. This should only
 * ever be run by a human after reviewing both records side by side —
 * mismerging two different people's clinical histories is exactly the
 * failure mode this must avoid, so there is no automatic/silent merge path.
 */
export async function mergePatients(
  tx: Tx,
  input: {
    sourceId: string;
    targetId: string;
    mergedBy: string;
    reason: string;
  },
): Promise<MergeSummary> {
  const { sourceId, targetId, mergedBy, reason } = input;

  if (sourceId === targetId) {
    throw new Error("Cannot merge a patient into itself");
  }

  const [source, target] = await Promise.all([
    tx.patient.findUnique({ where: { id: sourceId } }),
    tx.patient.findUnique({ where: { id: targetId } }),
  ]);

  if (!source) throw new Error("Source patient not found");
  if (!target) throw new Error("Target patient not found");
  if (source.merged_into_patient_id) {
    throw new Error(
      `Source patient (P-${source.patient_number}) is already merged into another record`,
    );
  }
  if (target.merged_into_patient_id) {
    throw new Error(
      `Target patient (P-${target.patient_number}) has itself been merged into another record — merge into that record instead`,
    );
  }

  const [visitsResult, appointmentsResult, consentsResult] = await Promise.all([
    tx.patientVisit.updateMany({
      where: { patient_id: sourceId },
      data: { patient_id: targetId },
    }),
    tx.appointment.updateMany({
      where: { patient_id: sourceId },
      data: { patient_id: targetId },
    }),
    tx.patientConsent.updateMany({
      where: { patient_id: sourceId },
      data: { patient_id: targetId },
    }),
  ]);

  const targetUpdates: Record<string, unknown> = {};
  const fieldsFilledOnTarget: string[] = [];
  for (const field of FILL_IF_BLANK_FIELDS) {
    const targetValue = target[field];
    const sourceValue = source[field];
    const targetBlank =
      targetValue == null || (typeof targetValue === "string" && !targetValue.trim());
    if (targetBlank && sourceValue != null) {
      targetUpdates[field] = sourceValue;
      fieldsFilledOnTarget.push(field);
    }
  }

  // abha_id is unique, so it must be moved (not copied) to avoid a
  // constraint violation — the source keeps a tombstone with no abha_id.
  let abhaMoved = false;
  if (!target.abha_id && source.abha_id) {
    targetUpdates.abha_id = source.abha_id;
    abhaMoved = true;
  }

  if (Object.keys(targetUpdates).length > 0) {
    await tx.patient.update({ where: { id: targetId }, data: targetUpdates });
  }

  await tx.patient.update({
    where: { id: sourceId },
    data: {
      merged_into_patient_id: targetId,
      merged_at: new Date(),
      merge_reason: reason,
      merged_by: mergedBy,
      ...(abhaMoved ? { abha_id: null } : {}),
    },
  });

  return {
    visitsMoved: visitsResult.count,
    appointmentsMoved: appointmentsResult.count,
    consentsMoved: consentsResult.count,
    fieldsFilledOnTarget,
    abhaMoved,
  };
}
