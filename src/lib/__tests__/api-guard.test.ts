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

describe("apiGuardDecision — attendance routes", () => {
  const makeSession = (role: SessionPayload["role"]): SessionPayload => ({
    userId: "u1",
    username: role,
    role,
    displayName: null,
    doctorId: null,
    mustChangePassword: false,
  });

  const staffRoutes = [
    "/api/attendance/status",
    "/api/attendance/clock-in",
    "/api/attendance/clock-out",
  ];

  it("allows all non-display roles on staff attendance routes", () => {
    const roles = ["admin", "manager", "reception", "doctor", "lab", "radiology", "pharmacy"] as const;
    for (const role of roles) {
      for (const route of staffRoutes) {
        expect(apiGuardDecision(makeSession(role), route, "GET")).toMatchObject({ ok: true });
        expect(apiGuardDecision(makeSession(role), route, "POST")).toMatchObject({ ok: true });
      }
    }
  });

  it("blocks display role on staff attendance routes", () => {
    for (const route of staffRoutes) {
      expect(apiGuardDecision(makeSession("display"), route, "GET")).toEqual({
        ok: false,
        status: 403,
      });
    }
  });

  it("allows manager and admin on /api/attendance/daily", () => {
    expect(apiGuardDecision(makeSession("manager"), "/api/attendance/daily", "GET")).toMatchObject({ ok: true });
    expect(apiGuardDecision(makeSession("admin"), "/api/attendance/daily", "GET")).toMatchObject({ ok: true });
  });

  it("blocks non-manager roles on /api/attendance/daily", () => {
    const nonManagers = ["reception", "doctor", "lab", "radiology", "pharmacy", "display"] as const;
    for (const role of nonManagers) {
      expect(apiGuardDecision(makeSession(role), "/api/attendance/daily", "GET")).toEqual({
        ok: false,
        status: 403,
      });
    }
  });
});
