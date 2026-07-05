import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Police must be intimated within 24 hours of an MLC arrival, regardless of patient consent. */
export const POLICE_INTIMATION_WINDOW_HOURS = 24;

export async function nextCasualtyNumber(tx: Tx): Promise<number> {
  const row = await tx.mlcRegistry.upsert({
    where: { id: "default" },
    create: { id: "default", last_number: 1 },
    update: { last_number: { increment: 1 } },
  });
  return row.last_number;
}

export type MlcRecordRow = {
  id: string;
  patient_visit_id: string;
  casualty_number: number;
  arrival_at: Date;
  brought_by_name: string | null;
  brought_by_relation: string | null;
  history_own_words: string | null;
  identification_mark_1: string | null;
  identification_mark_2: string | null;
  injury_description: string | null;
  treatment_given: string | null;
  patient_status: string | null;
  dying_declaration_needed: boolean;
  evidence_collected: string | null;
  police_station: string | null;
  police_officer_name: string | null;
  fir_ddr_number: string | null;
  police_intimated_at: Date | null;
  acknowledgment_receipt_ref: string | null;
  acknowledgment_received_at: Date | null;
  created_by: string;
  created_by_role: string;
  created_at: Date;
  updated_at: Date;
};

export function isPoliceIntimationOverdue(record: {
  arrival_at: Date;
  police_intimated_at: Date | null;
}): boolean {
  if (record.police_intimated_at) return false;
  const hoursSinceArrival =
    (Date.now() - record.arrival_at.getTime()) / (1000 * 60 * 60);
  return hoursSinceArrival > POLICE_INTIMATION_WINDOW_HOURS;
}

export function serializeMlcRecord(row: MlcRecordRow) {
  return {
    id: row.id,
    patient_visit_id: row.patient_visit_id,
    casualty_number: row.casualty_number,
    arrival_at: row.arrival_at.toISOString(),
    brought_by_name: row.brought_by_name,
    brought_by_relation: row.brought_by_relation,
    history_own_words: row.history_own_words,
    identification_mark_1: row.identification_mark_1,
    identification_mark_2: row.identification_mark_2,
    injury_description: row.injury_description,
    treatment_given: row.treatment_given,
    patient_status: row.patient_status,
    dying_declaration_needed: row.dying_declaration_needed,
    evidence_collected: row.evidence_collected,
    police_station: row.police_station,
    police_officer_name: row.police_officer_name,
    fir_ddr_number: row.fir_ddr_number,
    police_intimated_at: row.police_intimated_at?.toISOString() ?? null,
    acknowledgment_receipt_ref: row.acknowledgment_receipt_ref,
    acknowledgment_received_at:
      row.acknowledgment_received_at?.toISOString() ?? null,
    created_by: row.created_by,
    created_by_role: row.created_by_role,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    police_intimation_overdue: isPoliceIntimationOverdue(row),
  };
}

export type UpdateMlcRecordInput = Partial<{
  arrival_at: string;
  brought_by_name: string | null;
  brought_by_relation: string | null;
  history_own_words: string | null;
  identification_mark_1: string | null;
  identification_mark_2: string | null;
  injury_description: string | null;
  treatment_given: string | null;
  patient_status: string | null;
  dying_declaration_needed: boolean;
  evidence_collected: string | null;
  police_station: string | null;
  police_officer_name: string | null;
  fir_ddr_number: string | null;
  police_intimated_at: string | null;
  acknowledgment_receipt_ref: string | null;
  acknowledgment_received_at: string | null;
}>;
