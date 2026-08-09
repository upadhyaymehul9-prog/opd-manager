import { describe, it, expect } from "vitest";
import { isValidClinicId, withClinicScope } from "@/lib/tenant";

describe("isValidClinicId", () => {
  it("accepts a well-formed UUID", () => {
    expect(isValidClinicId("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
  });

  it("rejects non-UUID strings", () => {
    expect(isValidClinicId("'; DROP TABLE clinics; --")).toBe(false);
    expect(isValidClinicId("not-a-uuid")).toBe(false);
    expect(isValidClinicId("")).toBe(false);
  });
});

describe("withClinicScope", () => {
  it("rejects an invalid clinicId before touching the database", async () => {
    await expect(
      withClinicScope("not-a-uuid", async () => "unreachable"),
    ).rejects.toThrow(/invalid clinicId/);
  });
});
