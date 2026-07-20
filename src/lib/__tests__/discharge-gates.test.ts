import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/api-error";
import {
  assertVisitReadyForDischarge,
  canExitWithoutPharmacyBill,
} from "@/lib/discharge-gates";

const emrOk = {
  chief_complaint: "Fever",
  diagnosis: "Viral fever",
  medico_legal: false,
};

describe("assertVisitReadyForDischarge", () => {
  it("requires EMR", () => {
    expect(() =>
      assertVisitReadyForDischarge({
        visit: { ...emrOk, chief_complaint: null },
        prescriptionItems: null,
        hasPharmacyBill: false,
        hasMlcRecord: false,
        pendingLabTests: 0,
      }),
    ).toThrow(AppError);
  });

  it("requires MLC record when flagged", () => {
    expect(() =>
      assertVisitReadyForDischarge({
        visit: { ...emrOk, medico_legal: true },
        prescriptionItems: null,
        hasPharmacyBill: false,
        hasMlcRecord: false,
        pendingLabTests: 0,
      }),
    ).toThrow(/MLC/);
  });

  it("requires bill when medicines were dispensed", () => {
    expect(() =>
      assertVisitReadyForDischarge({
        visit: emrOk,
        prescriptionItems: [{ dispensed: true, skipped: false }],
        hasPharmacyBill: false,
        hasMlcRecord: false,
        pendingLabTests: 0,
      }),
    ).toThrow(/bill/i);
  });

  it("allows all-skipped Rx without a bill", () => {
    expect(() =>
      assertVisitReadyForDischarge({
        visit: emrOk,
        prescriptionItems: [{ dispensed: false, skipped: true }],
        hasPharmacyBill: false,
        hasMlcRecord: false,
        pendingLabTests: 0,
      }),
    ).not.toThrow();
  });

  it("blocks pending lab tests", () => {
    expect(() =>
      assertVisitReadyForDischarge({
        visit: emrOk,
        prescriptionItems: null,
        hasPharmacyBill: false,
        hasMlcRecord: false,
        pendingLabTests: 2,
      }),
    ).toThrow(/lab test/i);
  });
});

describe("canExitWithoutPharmacyBill", () => {
  it("is true when every active line is skipped", () => {
    expect(
      canExitWithoutPharmacyBill([
        { dispensed: false, skipped: true },
        { dispensed: false, skipped: true },
      ]),
    ).toBe(true);
  });

  it("is false when anything was dispensed", () => {
    expect(
      canExitWithoutPharmacyBill([
        { dispensed: true, skipped: false },
        { dispensed: false, skipped: true },
      ]),
    ).toBe(false);
  });
});
