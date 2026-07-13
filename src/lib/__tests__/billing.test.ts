import { describe, expect, it } from "vitest";
import {
  calculateLine,
  formatPharmacyBillNo,
  parseUnitPriceOverride,
  round2,
} from "@/lib/billing";

describe("parseUnitPriceOverride", () => {
  it("rejects negative, NaN, and non-numeric values", () => {
    expect(parseUnitPriceOverride(-1)).toBeNull();
    expect(parseUnitPriceOverride("abc")).toBeNull();
    expect(parseUnitPriceOverride(NaN)).toBeNull();
    expect(parseUnitPriceOverride(Infinity)).toBeNull();
  });

  it("accepts zero and positive prices, rounded to 2 decimals", () => {
    expect(parseUnitPriceOverride(0)).toBe(0);
    expect(parseUnitPriceOverride("12.5")).toBe(12.5);
    expect(parseUnitPriceOverride(12.345)).toBe(12.35);
  });
});

describe("formatPharmacyBillNo", () => {
  it("formats as PH-YYYYMMDD-NNN using the IST calendar date", () => {
    // UTC-midnight of IST day 2026-07-13.
    const day = new Date("2026-07-13T00:00:00.000Z");
    expect(formatPharmacyBillNo(day, 1)).toBe("PH-20260713-001");
    expect(formatPharmacyBillNo(day, 42)).toBe("PH-20260713-042");
  });

  it("does not truncate sequence numbers beyond 999", () => {
    const day = new Date("2026-07-13T00:00:00.000Z");
    expect(formatPharmacyBillNo(day, 1000)).toBe("PH-20260713-1000");
  });
});

describe("calculateLine", () => {
  it("computes taxable, gst, and total with 2-decimal rounding", () => {
    const line = calculateLine(3, 10, 12);
    expect(line.taxable_amount).toBe(30);
    expect(line.gst_amount).toBe(round2(3.6));
    expect(line.line_total).toBe(33.6);
  });
});
