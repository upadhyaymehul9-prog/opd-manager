import { describe, expect, it } from "vitest";
import { computeDuration, isStaffRole } from "@/lib/attendance";

describe("isStaffRole", () => {
  it("returns false for display role", () => {
    expect(isStaffRole("display")).toBe(false);
  });

  it("returns true for all staff roles", () => {
    const staffRoles = ["admin", "manager", "reception", "doctor", "lab", "radiology", "pharmacy"];
    for (const role of staffRoles) {
      expect(isStaffRole(role)).toBe(true);
    }
  });
});

describe("computeDuration", () => {
  it("formats multi-hour durations correctly", () => {
    // 09:00 IST = 03:30 UTC on a standard day
    const clockIn  = new Date("2026-08-02T03:30:00.000Z");
    const clockOut = new Date("2026-08-02T12:17:00.000Z");
    // 8 hours 47 minutes
    expect(computeDuration(clockIn, clockOut)).toBe("8h 47m");
  });

  it("formats sub-hour durations correctly", () => {
    const clockIn  = new Date("2026-08-02T03:30:00.000Z");
    const clockOut = new Date("2026-08-02T04:02:00.000Z");
    // 0 hours 32 minutes
    expect(computeDuration(clockIn, clockOut)).toBe("0h 32m");
  });

  it("formats exact-hour durations correctly", () => {
    const clockIn  = new Date("2026-08-02T03:30:00.000Z");
    const clockOut = new Date("2026-08-02T11:30:00.000Z");
    // 8 hours 0 minutes
    expect(computeDuration(clockIn, clockOut)).toBe("8h 0m");
  });
});
