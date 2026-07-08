import { describe, expect, it } from "vitest";
import { dateStrIST, resolveRange, startOfDay } from "@/lib/date-range";

describe("date-range", () => {
  it("pins day boundaries to IST", () => {
    const utcLateNight = new Date("2026-07-05T20:00:00.000Z");
    expect(dateStrIST(utcLateNight)).toBe("2026-07-06");
  });

  it("resolves a single-day range", () => {
    const params = new URLSearchParams({ from: "2026-07-06", to: "2026-07-06" });
    const range = resolveRange(params);
    expect(range.from).toBe("2026-07-06");
    expect(range.to).toBe("2026-07-06");
    expect(range.rangeEndExclusive.getTime()).toBeGreaterThan(
      range.rangeStart.getTime(),
    );
  });

  it("swaps inverted from/to dates", () => {
    const params = new URLSearchParams({ from: "2026-07-10", to: "2026-07-06" });
    const range = resolveRange(params);
    expect(range.from).toBe("2026-07-06");
    expect(range.to).toBe("2026-07-10");
  });

  it("startOfDay normalizes to IST midnight", () => {
    const day = startOfDay(new Date("2026-07-06T15:30:00.000Z"));
    expect(dateStrIST(day)).toBe("2026-07-06");
  });
});
