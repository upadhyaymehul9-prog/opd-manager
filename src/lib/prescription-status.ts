import type { PrescriptionStatus } from "@/lib/prescription-types";

export type RxLine = {
  dispensed: boolean;
  skipped?: boolean;
  voided_at?: Date | string | null;
};

export function activeRxItems(items: RxLine[]) {
  return items.filter((i) => !i.voided_at);
}

/** Active lines still awaiting dispense or skip (outside/OOS). */
export function pendingRxItems(items: RxLine[]) {
  return activeRxItems(items).filter((i) => !i.dispensed && !i.skipped);
}

export function isPharmacyDispenseComplete(items: RxLine[]) {
  const active = activeRxItems(items);
  if (active.length === 0) return false;
  return pendingRxItems(items).length === 0;
}

export function hasDispensedForBilling(items: RxLine[]) {
  return activeRxItems(items).some((i) => i.dispensed);
}

export function isReadyForPharmacyBill(items: RxLine[]) {
  return isPharmacyDispenseComplete(items) && hasDispensedForBilling(items);
}

export function computePrescriptionStatus(
  items: RxLine[],
  current: string,
): PrescriptionStatus {
  const active = activeRxItems(items).filter((i) => !i.skipped);
  if (active.length === 0) return current as PrescriptionStatus;
  const dispensedCount = active.filter((i) => i.dispensed).length;
  const pendingCount = active.filter((i) => !i.dispensed).length;
  if (dispensedCount === 0) {
    return current === "draft" ? "draft" : "sent_to_pharmacy";
  }
  if (pendingCount === 0) return "dispensed";
  return "partially_dispensed";
}
