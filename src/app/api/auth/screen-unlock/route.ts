import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const password = String(body.password ?? "");
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.password_hash);

  if (ok) {
    await logAudit({
      action: AUDIT_ACTIONS.SCREEN_UNLOCK,
      entity_type: "session",
      summary: `${session.displayName ?? session.username} unlocked screen (${session.role})`,
      session,
    });
    return NextResponse.json({ ok: true });
  }

  await logAudit({
    action: AUDIT_ACTIONS.SCREEN_UNLOCK_FAILED,
    entity_type: "session",
    summary: `Failed screen-unlock attempt for ${session.displayName ?? session.username} (${session.role})`,
    session,
  });
  return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
}
