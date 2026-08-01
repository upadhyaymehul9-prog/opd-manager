import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api-guard";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const guard = await requireApi(request);
  if (guard.response) return guard.response;
  const { session } = guard;

  await logAudit({
    action: AUDIT_ACTIONS.SCREEN_LOCK,
    entity_type: "session",
    summary: `${session.displayName ?? session.username} screen locked (${session.role})`,
    session,
  });

  return NextResponse.json({ ok: true });
}
