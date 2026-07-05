import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = String(body.current_password ?? "");
    const newPassword = String(body.new_password ?? "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 },
      );
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current password" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    const password_hash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash },
    });

    await logAudit({
      action: AUDIT_ACTIONS.PASSWORD_CHANGE,
      entity_type: "user",
      entity_id: user.id,
      summary: `${user.username} changed their password`,
      session,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Password change failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
