import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessPath,
  getHomeForRole,
  getSessionFromRequest,
} from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/feedback"];

function isPublicBookingApi(pathname: string) {
  return pathname.startsWith("/api/public/booking/");
}

// The public feedback form must POST anonymously, but reading feedback
// (GET) exposes patient names/mobiles and must stay behind auth.
function isPublicFeedbackSubmit(pathname: string, method: string) {
  return pathname === "/api/feedback" && method === "POST";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    isPublicFeedbackSubmit(pathname, request.method) ||
    isPublicBookingApi(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (pathname === "/") {
      return NextResponse.next();
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/login") {
    return NextResponse.redirect(
      new URL(getHomeForRole(session.role), request.url),
    );
  }

  if (!canAccessPath(session, pathname, request.method)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(
      new URL(getHomeForRole(session.role), request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
