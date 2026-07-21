import type { NextRequest } from "next/server";

/** Constant-time string compare (edge-runtime safe, no node:crypto). */
function timingSafeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function verifyBookMyClinicKey(request: NextRequest): boolean {
  const expected = process.env.BOOKMYCLINIC_API_KEY;
  if (!expected) {
    // Fail closed unless explicitly in local development.
    return process.env.NODE_ENV === "development";
  }

  const headerKey =
    request.headers.get("x-bookmyclinic-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return headerKey != null && timingSafeEquals(headerKey, expected);
}

export const BOOKMYCLINIC_SOURCE = "bookmyclinic";
