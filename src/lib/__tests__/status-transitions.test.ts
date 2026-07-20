import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/api-error";
import {
  assertStatusTransition,
  isValidStatusTransition,
  roleMaySetStatus,
} from "@/lib/status-transitions";

describe("isValidStatusTransition", () => {
  it("allows no-op and normal doctor flow", () => {
    expect(isValidStatusTransition("registered", "registered")).toBe(true);
    expect(isValidStatusTransition("registered", "calling")).toBe(true);
    expect(isValidStatusTransition("calling", "in_consultation")).toBe(true);
    expect(isValidStatusTransition("in_consultation", "to_pharmacy")).toBe(true);
    expect(isValidStatusTransition("in_consultation", "completed")).toBe(true);
  });

  it("blocks skipping stages", () => {
    expect(isValidStatusTransition("registered", "completed")).toBe(false);
    expect(isValidStatusTransition("registered", "to_pharmacy")).toBe(false);
    expect(isValidStatusTransition("to_lab", "lab_ready")).toBe(false);
    expect(isValidStatusTransition("completed", "registered")).toBe(false);
  });

  it("allows lab call then arrive", () => {
    expect(isValidStatusTransition("to_lab", "lab_calling")).toBe(true);
    expect(isValidStatusTransition("lab_calling", "at_lab")).toBe(true);
  });
});

describe("roleMaySetStatus", () => {
  it("lets pharmacy complete only from pharmacy stages", () => {
    expect(roleMaySetStatus("pharmacy", "at_pharmacy", "completed")).toBe(true);
    expect(roleMaySetStatus("pharmacy", "in_consultation", "completed")).toBe(
      false,
    );
  });

  it("blocks pharmacy from flipping medico-legal clinical statuses", () => {
    expect(roleMaySetStatus("pharmacy", "registered", "calling")).toBe(false);
    expect(roleMaySetStatus("lab", "to_lab", "at_lab")).toBe(true);
  });
});

describe("assertStatusTransition", () => {
  it("throws AppError on invalid edge", () => {
    expect(() =>
      assertStatusTransition({
        from: "registered",
        to: "completed",
        role: "doctor",
      }),
    ).toThrow(AppError);
  });

  it("allows admin force outside the graph", () => {
    expect(() =>
      assertStatusTransition({
        from: "registered",
        to: "completed",
        role: "admin",
        allowForce: true,
      }),
    ).not.toThrow();
  });
});
