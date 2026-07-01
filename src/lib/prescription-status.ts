import type { PrescriptionStatus } from "@/lib/prescription-types";

export function computePrescriptionStatus(
  items: { dispensed: boolean }[],
  current: string,
): PrescriptionStatus {
  if (items.length === 0) return current as PrescriptionStatus;
  const dispensedCount = items.filter((i) => i.dispensed).length;
  if (dispensedCount === 0) {
    return current === "draft" ? "draft" : "sent_to_pharmacy";
  }
  if (dispensedCount === items.length) return "dispensed";
  return "partially_dispensed";
}
