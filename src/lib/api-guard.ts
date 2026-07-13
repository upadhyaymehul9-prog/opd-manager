import { NextResponse } from "next/server";
import { canAccessApi } from "@/lib/auth";
import { getSessionFromCookies } from "@/lib/audit";
import type { SessionPayload } from "@/lib/auth-types";

export type GuardDecision =
  | { ok: true; session: SessionPayload }
  | { ok: false; status: 401 | 403 };

/**
 * Pure authorization decision for an API request. Middleware already enforces
 * this, but calling it inside a handler gives defense in depth: even if the
 * middleware layer is ever bypassed (misconfig, framework CVE), the handler
 * still refuses to serve data to an unauthenticated or unauthorized caller.
 */
export function apiGuardDecision(
  session: SessionPayload | null,
  pathname: string,
  method: string,
): GuardDecision {
  if (!session) return { ok: false, status: 401 };
  if (!canAccessApi(session, pathname, method)) {
    return { ok: false, status: 403 };
  }
  return { ok: true, session };
}

type GuardResult =
  | { session: SessionPayload; response?: undefined }
  | { session?: undefined; response: NextResponse };

/**
 * Reads the session from cookies and enforces the API access policy. Returns
 * either the session (proceed) or a ready-to-return error response.
 *
 *   const guard = await requireApi(request);
 *   if (guard.response) return guard.response;
 *   const { session } = guard;
 */
export async function requireApi(request: Request): Promise<GuardResult> {
  const { pathname } = new URL(request.url);
  const session = await getSessionFromCookies();
  const decision = apiGuardDecision(session, pathname, request.method);
  if (decision.ok) return { session: decision.session };
  return {
    response: NextResponse.json(
      { error: decision.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: decision.status },
    ),
  };
}
