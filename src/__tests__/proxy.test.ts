import { describe, expect, it } from "vitest";
import { clinicSessionMismatch } from "@/proxy";

const CLINIC_A = "11111111-1111-1111-1111-111111111111";
const CLINIC_B = "22222222-2222-2222-2222-222222222222";

describe("clinicSessionMismatch — Finding 4 regression", () => {
  it("rejects a request against clinic B's subdomain carrying a session for clinic A", () => {
    // A user holding a valid session for clinic A (e.g. a since-suspended
    // clinic) must not be able to ride that session onto a different,
    // active clinic B's subdomain -- session.clinicId (A) would otherwise
    // still be trusted by downstream route handlers while the visited host
    // resolves to B.
    expect(clinicSessionMismatch(CLINIC_B, CLINIC_A)).toBe(true);
  });

  it("allows a request when the session's clinic matches the resolved subdomain clinic", () => {
    expect(clinicSessionMismatch(CLINIC_A, CLINIC_A)).toBe(false);
  });

  it("is a no-op on the base domain, where clinicId is null", () => {
    expect(clinicSessionMismatch(null, CLINIC_A)).toBe(false);
  });
});
