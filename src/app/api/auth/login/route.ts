import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/auth-types";
import {
  createSessionToken,
  getHomeForRole,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      await logAudit({
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entity_type: "user",
        summary: `Failed login attempt for ${username}`,
        actor: { username, role: "unknown" },
      });
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const role = user.role as UserRole;
    const remember = Boolean(body.remember_me);
    const token = await createSessionToken(
      {
        userId: user.id,
        username: user.username,
        role,
        displayName: user.display_name,
        doctorId: user.doctor_id,
      },
      remember,
    );

    const response = NextResponse.json({
      ok: true,
      role,
      home: getHomeForRole(role),
      displayName: user.display_name,
    });
    const cookie = sessionCookieOptions(token, remember);
    response.cookies.set(cookie);

    await logAudit({
      action: AUDIT_ACTIONS.LOGIN,
      entity_type: "user",
      entity_id: user.id,
      summary: `${user.username} logged in`,
      session: {
        userId: user.id,
        username: user.username,
        role,
        displayName: user.display_name,
        doctorId: user.doctor_id,
      },
    });

    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
