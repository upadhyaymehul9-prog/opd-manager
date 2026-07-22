import { AppError } from "@/lib/api-error";
import { visitEmrCompleteForDischarge } from "@/lib/nabh";
import {
  hasDispensedForBilling,
  pendingRxItems,
  activeRxItems,
} from "@/lib/prescription-status";

export type DischargeVisit = {
  chief_complaint: string | null;
  diagnosis: string | null;
  final_diagnosis?: string | null;
  medico_legal: boolean;
};

export type DischargeRxItem = {
  dispensed: boolean;
  skipped?: boolean;
  voided_at?: Date | string | null;
};

export type DischargeCheckInput = {
  visit: DischargeVisit;
  /** Active (non-voided) prescription lines, if any prescription exists */
  prescriptionItems: DischargeRxItem[] | null;
  /** True when a pharmacy bill already exists for this visit */
  hasPharmacyBill: boolean;
  /** True when medico_legal and a structured MlcRecord exists */
  hasMlcRecord: boolean;
  /** Count of lab tests still ordered/collected (not resulted/cancelled) */
  pendingLabTests: number;
  /** Doctor/admin/manager explicitly chose to discharge without EMR notes
   * on file. Only bypasses the EMR check below — MLC, pending labs, and
   * pharmacy-billing gates are never overridable. Caller is responsible for
   * restricting this to the allowed roles and logging the override. */
  overrideEmrGate?: boolean;
};

/**
 * Shared discharge readiness checks for doctor exit, pharmacy complete, and
 * any other path that marks a visit completed.
 */
export function assertVisitReadyForDischarge(input: DischargeCheckInput) {
  if (!input.overrideEmrGate && !visitEmrCompleteForDischarge(input.visit)) {
    throw new AppError(
      "NABH: complete EMR (chief complaint and diagnosis) before marking visit completed",
      400,
    );
  }

  if (input.visit.medico_legal && !input.hasMlcRecord) {
    throw new AppError(
      "MLC flagged — create the medico-legal record before discharge",
      400,
    );
  }

  if (input.pendingLabTests > 0) {
    throw new AppError(
      `${input.pendingLabTests} lab test(s) still pending — result or cancel before discharge`,
      400,
    );
  }

  const items = input.prescriptionItems;
  if (!items || activeRxItems(items).length === 0) {
    return; // no Rx — EMR (+ MLC/lab) gates are enough
  }

  const pending = pendingRxItems(items);
  if (pending.length > 0) {
    throw new AppError(
      `${pending.length} medicine(s) still pending — dispense or skip before discharge`,
      400,
    );
  }

  if (hasDispensedForBilling(items) && !input.hasPharmacyBill) {
    throw new AppError(
      "Pharmacy bill required — generate the bill before discharge",
      400,
    );
  }
}

/** All active lines skipped, none dispensed — pharmacy may exit without a bill. */
export function canExitWithoutPharmacyBill(items: DischargeRxItem[]) {
  const active = activeRxItems(items);
  if (active.length === 0) return true;
  return (
    pendingRxItems(items).length === 0 && !hasDispensedForBilling(items)
  );
}
