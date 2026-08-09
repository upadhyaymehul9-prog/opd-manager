import { describe, it, expect } from "vitest";
import { isValidClinicSlug, RESERVED_CLINIC_SLUGS } from "@/lib/clinic-slug";

describe("isValidClinicSlug", () => {
  it("accepts lowercase alphanumeric with hyphens", () => {
    expect(isValidClinicSlug("sunrise-clinic")).toBe(true);
    expect(isValidClinicSlug("apollo2")).toBe(true);
  });

  it("rejects uppercase, spaces, and underscores", () => {
    expect(isValidClinicSlug("Sunrise")).toBe(false);
    expect(isValidClinicSlug("sun rise")).toBe(false);
    expect(isValidClinicSlug("sun_rise")).toBe(false);
  });

  it("rejects leading or trailing hyphens", () => {
    expect(isValidClinicSlug("-sunrise")).toBe(false);
    expect(isValidClinicSlug("sunrise-")).toBe(false);
  });

  it("rejects slugs shorter than 3 or longer than 63 characters", () => {
    expect(isValidClinicSlug("ab")).toBe(false);
    expect(isValidClinicSlug("a".repeat(64))).toBe(false);
    expect(isValidClinicSlug("a".repeat(63))).toBe(true);
  });

  it("rejects reserved words", () => {
    for (const reserved of RESERVED_CLINIC_SLUGS) {
      expect(isValidClinicSlug(reserved)).toBe(false);
    }
  });
});
