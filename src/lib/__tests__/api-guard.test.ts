import { describe, expect, it } from "vitest";
import { apiGuardDecision } from "@/lib/api-guard";
import type { SessionPayload } from "@/lib/auth-types";

const doctor: SessionPayload = {
  userId: "u1",
  username: "doctor",
  role: "doctor",
  displayName: null,
  doctorId: null,
  mustChangePassword: false,
};

describe("apiGuardDecision", () => {
  it("returns 401 when there is no session", () => {
    expect(apiGuardDecision(null, "/api/records/abc", "GET")).toEqual({
      ok: false,
      status: 401,
    });
  });

  it("returns 403 when the role may not access the route", () => {
    const display = { ...doctor, role: "display" as const, username: "tv" };
    expect(
      apiGuardDecision(display, "/api/visits/abc/procedures", "GET"),
    ).toEqual({ ok: false, status: 403 });
  });

  it("allows an authorized role through", () => {
    expect(
      apiGuardDecision(doctor, "/api/visits/abc/procedures", "POST"),
    ).toEqual({ ok: true, session: doctor });
  });
});
