import { describe, expect, it } from "vitest";
import { canAccessApi } from "@/lib/auth";
import { USER_ROLES } from "@/lib/auth-types";
import type { SessionPayload, UserRole } from "@/lib/auth-types";

function sessionFor(role: UserRole, doctorId: string | null = null): SessionPayload {
  return {
    userId: "u1",
    username: role,
    role,
    displayName: null,
    doctorId,
    mustChangePassword: false,
  };
}

describe("canAccessApi — default deny", () => {
  it("denies an unknown API route for every role (no default-allow)", () => {
    for (const role of USER_ROLES) {
      expect(
        canAccessApi(sessionFor(role), "/api/some/route/nobody/added", "GET"),
      ).toBe(false);
    }
  });

  it("denies the display (TV) account from reading patient procedures", () => {
    expect(
      canAccessApi(
        sessionFor("display"),
        "/api/visits/abc-123/procedures",
        "GET",
      ),
    ).toBe(false);
  });

  it("denies the display account from listing patients", () => {
    expect(canAccessApi(sessionFor("display"), "/api/patients", "GET")).toBe(
      false,
    );
    expect(
      canAccessApi(sessionFor("display"), "/api/patients/abc-123", "GET"),
    ).toBe(false);
  });
});

describe("canAccessApi — previously-fallthrough routes stay reachable", () => {
  it("lets any clinical role read the doctor list", () => {
    for (const role of ["reception", "doctor", "pharmacy", "lab", "display"] as UserRole[]) {
      expect(canAccessApi(sessionFor(role), "/api/doctors", "GET")).toBe(true);
    }
  });

  it("lets a doctor read the lab-test catalog but denies display", () => {
    expect(canAccessApi(sessionFor("doctor"), "/api/lab-tests/catalog", "GET")).toBe(
      true,
    );
    expect(
      canAccessApi(sessionFor("display"), "/api/lab-tests/catalog", "GET"),
    ).toBe(false);
  });

  it("lets a doctor manage visit procedures", () => {
    expect(
      canAccessApi(sessionFor("doctor"), "/api/visits/abc/procedures", "POST"),
    ).toBe(true);
  });

  it("lets reception read a patient record", () => {
    expect(canAccessApi(sessionFor("reception"), "/api/patients", "GET")).toBe(
      true,
    );
    expect(
      canAccessApi(sessionFor("reception"), "/api/patients/abc-123", "GET"),
    ).toBe(true);
  });
});
