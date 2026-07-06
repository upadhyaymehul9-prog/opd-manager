import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth-types";
import { prisma } from "@/lib/prisma";

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
}

export async function logAudit(input: {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  summary: string;
  details?: Record<string, unknown>;
  session?: SessionPayload | null;
  actor?: { userId?: string; username: string; role: string };
}) {
  try {
    const session = input.session ?? (await getSessionFromCookies());
    const actor = session ?? input.actor;
    if (!actor) return;

    await prisma.auditLog.create({
      data: {
        user_id: session?.userId ?? input.actor?.userId ?? null,
        username: actor.username,
        role: actor.role,
        action: input.action,
        entity_type: input.entity_type,
        entity_id: input.entity_id ?? null,
        summary: input.summary,
        details: input.details ? JSON.stringify(input.details) : null,
        ip_address: await clientIp(),
      },
    });
  } catch (e) {
    // Audit must not break clinical workflow — but a swallowed failure here
    // means the audit trail silently has a hole, so at least surface it.
    console.error("logAudit failed", { action: input.action, entity_type: input.entity_type }, e);
  }
}

/** Computes only the fields that actually changed, so audit entries record
 * a real before/after diff instead of just a summary sentence. */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  keys: (keyof T & string)[],
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of keys) {
    const a = before[key];
    const b = after[key];
    const changed =
      a instanceof Date || b instanceof Date ? String(a) !== String(b) : a !== b;
    if (changed) {
      diff[key] = { from: a, to: b };
    }
  }
  return diff;
}

export const AUDIT_ACTIONS = {
  LOGIN: "login",
  LOGIN_FAILED: "login_failed",
  LOGOUT: "logout",
  PASSWORD_CHANGE: "password_change",
  PATIENT_REGISTER: "patient_register",
  VISIT_UPDATE: "visit_update",
  EMR_UPDATE: "emr_update",
  CONSENT_RECORD: "consent_record",
  PRESCRIPTION_SAVE: "prescription_save",
  PRESCRIPTION_SEND: "prescription_send",
  DISPENSE: "dispense",
  INCIDENT_REPORT: "incident_report",
  INCIDENT_CLOSE: "incident_close",
  INCIDENT_STATUS_CHANGE: "incident_status_change",
  MLC_RECORD_CREATE: "mlc_record_create",
  MLC_RECORD_UPDATE: "mlc_record_update",
  PATIENT_MERGE: "patient_merge",
} as const;
