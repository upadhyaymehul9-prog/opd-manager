import { describe, expect, it } from "vitest";
import {
  hasDispensedForBilling,
  isReadyForPharmacyBill,
  pendingRxItems,
} from "@/lib/prescription-status";

describe("prescription-status", () => {
  it("ignores voided lines when checking pending dispense", () => {
    const items = [
      { dispensed: true, skipped: false, voided_at: null },
      { dispensed: false, skipped: false, voided_at: new Date() },
    ];
    expect(pendingRxItems(items)).toHaveLength(0);
    expect(isReadyForPharmacyBill(items)).toBe(true);
  });

  it("treats skipped lines as resolved for billing", () => {
    const items = [
      { dispensed: true, skipped: false, voided_at: null },
      { dispensed: false, skipped: true, voided_at: null },
    ];
    expect(pendingRxItems(items)).toHaveLength(0);
    expect(hasDispensedForBilling(items)).toBe(true);
    expect(isReadyForPharmacyBill(items)).toBe(true);
  });
});
