import { describe, expect, it } from "vitest";
import {
  bmiCategory,
  bmiCategoryLabel,
  calcBmi,
} from "@/lib/bmi";

describe("calcBmi", () => {
  it("computes BMI from kg and cm", () => {
    expect(calcBmi(84, 170)).toBe(29.1);
  });

  it("returns null when height or weight missing", () => {
    expect(calcBmi(84, null)).toBeNull();
    expect(calcBmi(null, 170)).toBeNull();
  });
});

describe("bmiCategory", () => {
  it("labels obese and normal ranges", () => {
    expect(bmiCategoryLabel(bmiCategory(17))).toBe("Underweight");
    expect(bmiCategoryLabel(bmiCategory(22))).toBe("OK / Normal");
    expect(bmiCategoryLabel(bmiCategory(27))).toBe("Overweight");
    expect(bmiCategoryLabel(bmiCategory(32))).toBe("Obese");
  });
});
