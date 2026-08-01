import { NextResponse } from "next/server";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await logAudit({
    action: AUDIT_ACTIONS.SCREEN_LOCK,
    entity_type: "session",
    summary: `${session.displayName ?? session.username} screen locked (${session.role})`,
    session,
  });

  return NextResponse.json({ ok: true });
}
