import type { PrescriptionStatus } from "@/lib/prescription-types";

export function computePrescriptionStatus(
  items: { dispensed: boolean; skipped?: boolean }[],
  current: string,
): PrescriptionStatus {
  if (items.length === 0) return current as PrescriptionStatus;
  const active = items.filter((i) => !i.skipped);
  if (active.length === 0) return current as PrescriptionStatus;
  const dispensedCount = active.filter((i) => i.dispensed).length;
  const pendingCount = active.filter((i) => !i.dispensed).length;
  if (dispensedCount === 0) {
    return current === "draft" ? "draft" : "sent_to_pharmacy";
  }
  if (pendingCount === 0) return "dispensed";
  return "partially_dispensed";
}
