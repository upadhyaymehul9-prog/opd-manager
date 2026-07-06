import { describe, expect, it } from "vitest";
import { visitEmrCompleteForDischarge, visitHasEmr } from "@/lib/nabh";

const emptyVisit = {
  chief_complaint: null,
  diagnosis: null,
  final_diagnosis: null,
  examination_notes: null,
  advice: null,
  vitals_bp: null,
  vitals_pulse: null,
  vitals_temp: null,
  vitals_weight: null,
  vitals_spo2: null,
};

describe("nabh EMR helpers", () => {
  it("detects when any EMR field is present", () => {
    expect(visitHasEmr(emptyVisit)).toBe(false);
    expect(visitHasEmr({ ...emptyVisit, vitals_pulse: 72 })).toBe(true);
    expect(visitHasEmr({ ...emptyVisit, chief_complaint: "Fever" })).toBe(true);
  });

  it("requires chief complaint and diagnosis for discharge readiness", () => {
    expect(
      visitEmrCompleteForDischarge({
        chief_complaint: "Fever",
        diagnosis: null,
        final_diagnosis: null,
      }),
    ).toBe(false);
    expect(
      visitEmrCompleteForDischarge({
        chief_complaint: "Fever",
        diagnosis: "Viral fever",
        final_diagnosis: null,
      }),
    ).toBe(true);
    expect(
      visitEmrCompleteForDischarge({
        chief_complaint: "Fever",
        diagnosis: null,
        final_diagnosis: "Viral fever",
      }),
    ).toBe(true);
  });
});
