import type { NextRequest } from "next/server";

export function verifyBookMyClinicKey(request: NextRequest): boolean {
  const expected = process.env.BOOKMYCLINIC_API_KEY;
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  const headerKey =
    request.headers.get("x-bookmyclinic-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return headerKey === expected;
}

export const BOOKMYCLINIC_SOURCE = "bookmyclinic";
