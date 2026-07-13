import { describe, expect, it } from "vitest";
import { dateStrIST, istDateOnly, resolveRange, startOfDay } from "@/lib/date-range";

describe("istDateOnly", () => {
  it("returns UTC midnight of the current IST calendar date", () => {
    // 2026-07-12 20:00 UTC is 2026-07-13 01:30 IST — still IST day 13.
    const d = istDateOnly(new Date("2026-07-12T20:00:00.000Z"));
    expect(d.toISOString()).toBe("2026-07-13T00:00:00.000Z");
  });

  it("is idempotent for a value already at UTC midnight (a @db.Date value)", () => {
    const stored = new Date("2026-07-13T00:00:00.000Z");
    expect(istDateOnly(stored).toISOString()).toBe("2026-07-13T00:00:00.000Z");
  });
});

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
