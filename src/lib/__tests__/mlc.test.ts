import { describe, expect, it } from "vitest";
import {
  isPoliceIntimationOverdue,
  POLICE_INTIMATION_WINDOW_HOURS,
} from "@/lib/mlc";

describe("mlc police intimation", () => {
  it("is not overdue when police were intimated", () => {
    const arrival = new Date(Date.now() - 48 * 60 * 60 * 1000);
    expect(
      isPoliceIntimationOverdue({
        arrival_at: arrival,
        police_intimated_at: new Date(),
      }),
    ).toBe(false);
  });

  it("is overdue after the 24h window", () => {
    const arrival = new Date(
      Date.now() - (POLICE_INTIMATION_WINDOW_HOURS + 1) * 60 * 60 * 1000,
    );
    expect(
      isPoliceIntimationOverdue({
        arrival_at: arrival,
        police_intimated_at: null,
      }),
    ).toBe(true);
  });

  it("is not overdue inside the 24h window", () => {
    const arrival = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(
      isPoliceIntimationOverdue({
        arrival_at: arrival,
        police_intimated_at: null,
      }),
    ).toBe(false);
  });
});
