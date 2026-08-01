/** BMI = weight_kg / (height_m)^2 */
export function calcBmi(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  if (
    weightKg == null ||
    heightCm == null ||
    !(weightKg > 0) ||
    !(heightCm > 0)
  ) {
    return null;
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi)) return null;
  return Math.round(bmi * 10) / 10;
}

export type BmiCategory =
  | "underweight"
  | "normal"
  | "overweight"
  | "obese";

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export function bmiCategoryLabel(category: BmiCategory): string {
  switch (category) {
    case "underweight":
      return "Underweight";
    case "normal":
      return "OK / Normal";
    case "overweight":
      return "Overweight";
    case "obese":
      return "Obese";
  }
}

export function bmiCategoryTone(category: BmiCategory): string {
  switch (category) {
    case "underweight":
      return "bg-sky-100 text-sky-900";
    case "normal":
      return "bg-emerald-100 text-emerald-900";
    case "overweight":
      return "bg-amber-100 text-amber-900";
    case "obese":
      return "bg-red-100 text-red-900";
  }
}
