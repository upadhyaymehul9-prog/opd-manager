import { describe, expect, it } from "vitest";
import { AppError, errorResponse } from "@/lib/api-error";

describe("errorResponse", () => {
  it("surfaces AppError messages with their status", async () => {
    const res = errorResponse("test", new AppError("Insufficient stock", 400));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Insufficient stock" });
  });

  it("hides unexpected error details behind a generic 500 message", async () => {
    const leak = new Error(
      'relation "pharmacy_bills" does not exist at character 42',
    );
    const res = errorResponse("test", leak, "Bill error");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Bill error");
    expect(JSON.stringify(body)).not.toContain("pharmacy_bills");
  });
});
