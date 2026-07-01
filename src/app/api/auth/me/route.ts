import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, rolesForNav, verifySessionToken } from "@/lib/auth";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    username: session.username,
    role: session.role,
    displayName: session.displayName,
    doctorId: session.doctorId,
    navPaths: rolesForNav(session.role),
  });
}
