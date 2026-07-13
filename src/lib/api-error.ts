import { NextResponse } from "next/server";

/**
 * A user-facing business-rule error whose message is safe to show the caller
 * (e.g. "Insufficient stock", "No dispensed medicines to bill"). Anything that
 * is NOT an AppError is treated as unexpected and its details are hidden.
 */
export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

/**
 * Turns a caught error into a safe HTTP response:
 *  - AppError  → its own message and status (safe to display).
 *  - anything else → logged in full server-side, but the client only sees a
 *    generic `fallback` message. This stops Prisma/internal details (table
 *    names, SQL, stack fragments) from leaking to end users.
 */
export function errorResponse(
  context: string,
  e: unknown,
  fallback = "Something went wrong — please try again",
): NextResponse {
  if (e instanceof AppError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(`[${context}]`, e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
