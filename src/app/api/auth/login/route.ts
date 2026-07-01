import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/auth-types";
import {
  createSessionToken,
  getHomeForRole,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
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
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const role = user.role as UserRole;
    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      role,
      displayName: user.display_name,
      doctorId: user.doctor_id,
    });

    const response = NextResponse.json({
      ok: true,
      role,
      home: getHomeForRole(role),
      displayName: user.display_name,
    });
    const cookie = sessionCookieOptions(token);
    response.cookies.set(cookie);
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
