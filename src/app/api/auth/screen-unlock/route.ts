import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { requireApi } from "@/lib/api-guard";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { withClinicScope } from "@/lib/tenant";

export async function POST(request: Request) {
  const guard = await requireApi(request);
  if (guard.response) return guard.response;
  const { session } = guard;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const password = String(body.password ?? "");
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const user = await withClinicScope(session.clinicId, (tx) =>
    tx.user.findUnique({ where: { id: session.userId } }),
  );
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
