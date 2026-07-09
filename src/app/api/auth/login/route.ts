import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/auth-types";
import {
  createSessionToken,
  getHomeForRole,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOCKOUT_MINUTES,
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

    if (user?.locked_until && user.locked_until > new Date()) {
      const minutesLeft = Math.ceil(
        (user.locked_until.getTime() - Date.now()) / 60_000,
      );
      return NextResponse.json(
        {
          error: `Account locked after too many failed attempts. Try again in ${minutesLeft} minute(s).`,
        },
        { status: 423 },
      );
    }

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      if (user) {
        const attempts = user.failed_login_attempts + 1;
        const lockingNow = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failed_login_attempts: lockingNow ? 0 : attempts,
            locked_until: lockingNow
              ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
              : null,
          },
        });
      }
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

    if (user.failed_login_attempts > 0 || user.locked_until) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failed_login_attempts: 0, locked_until: null },
      });
    }

    const role = user.role as UserRole;
    const remember = Boolean(body.remember_me);
    const sessionPayload = {
      userId: user.id,
      username: user.username,
      role,
      displayName: user.display_name,
      doctorId: user.doctor_id,
      mustChangePassword: user.must_change_password,
    };
    const token = await createSessionToken(sessionPayload, remember);

    const response = NextResponse.json({
      ok: true,
      role,
      home: getHomeForRole(role),
      displayName: user.display_name,
      mustChangePassword: user.must_change_password,
    });
    const cookie = sessionCookieOptions(token, remember);
    response.cookies.set(cookie);

    await logAudit({
      action: AUDIT_ACTIONS.LOGIN,
      entity_type: "user",
      entity_id: user.id,
      summary: `${user.username} logged in`,
      session: sessionPayload,
    });

    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
