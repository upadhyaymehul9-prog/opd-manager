import { describe, expect, it } from "vitest";
import {
  checkAllergyConflicts,
  checkCriticalInteractions,
  checkDrugSafety,
} from "@/lib/drug-safety";

describe("drug-safety", () => {
  it("flags allergy matches", () => {
    const warnings = checkAllergyConflicts(["Paracetamol"], "penicillin, sulfa");
    expect(warnings).toHaveLength(0);

    const hit = checkAllergyConflicts(["Amoxicillin 500"], "amoxicillin");
    expect(hit).toHaveLength(1);
    expect(hit[0].type).toBe("allergy");
  });

  it("flags critical interactions", () => {
    const warnings = checkCriticalInteractions(["Warfarin 5mg", "Ibuprofen 400"]);
    expect(warnings.some((w) => w.type === "interaction")).toBe(true);
  });

  it("combines allergy and interaction checks", () => {
    const warnings = checkDrugSafety(
      ["Warfarin", "Ibuprofen"],
      "ibuprofen sensitivity",
    );
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });
});
