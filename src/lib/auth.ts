import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import type { SessionPayload, UserRole } from "@/lib/auth-types";

export const SESSION_COOKIE = "opd_session";
const SESSION_REMEMBER_SEC = 60 * 60 * 24 * 30;
const SESSION_DEFAULT_SEC = 60 * 60 * 8;

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/manager",
  manager: "/manager",
  reception: "/reception",
  doctor: "/doctor",
  lab: "/lab",
  radiology: "/radiology",
  pharmacy: "/pharmacy",
  display: "/tv",
};

const PAGE_ACCESS: Record<string, UserRole[]> = {
  "/reception": ["reception", "admin", "manager"],
  "/doctor": ["doctor", "admin", "manager"],
  "/lab": ["lab", "admin", "manager"],
  "/radiology": ["radiology", "admin", "manager"],
  "/pharmacy": ["pharmacy", "admin", "manager"],
  "/stock": ["pharmacy", "admin", "manager"],
  "/tv": ["display", "admin", "manager"],
  "/manager": ["manager", "admin"],
  "/analytics": ["manager", "admin"],
  "/reports": ["manager", "admin", "pharmacy", "reception"],
  "/reconciliation": ["manager", "admin", "pharmacy", "reception"],
  "/nabh": ["manager", "admin", "doctor", "reception"],
  "/incidents": ["manager", "admin", "doctor", "reception", "pharmacy", "lab", "radiology"],
  "/feedback": ["manager", "admin", "reception"],
  "/records": ["pharmacy", "admin", "manager", "reception", "doctor"],
  "/appointments": ["reception", "admin", "manager", "doctor"],
  "/settings/doctors": ["admin", "manager", "doctor"],
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  return new TextEncoder().encode("dev-only-change-me");
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(
  payload: SessionPayload,
  remember = false,
) {
  const maxAge = remember ? SESSION_REMEMBER_SEC : SESSION_DEFAULT_SEC;
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecret());
}

export function sessionMaxAge(remember = false) {
  return remember ? SESSION_REMEMBER_SEC : SESSION_DEFAULT_SEC;
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: String(payload.userId),
      username: String(payload.username),
      role: payload.role as UserRole,
      displayName: payload.displayName ? String(payload.displayName) : null,
      doctorId: payload.doctorId ? String(payload.doctorId) : null,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(token: string, remember = false) {
  const maxAge = sessionMaxAge(remember);
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function getHomeForRole(role: UserRole) {
  return ROLE_HOME[role];
}

function pageKey(pathname: string) {
  if (pathname === "/doctor" || pathname.startsWith("/doctor/")) return "/doctor";
  if (pathname === "/pharmacy" || pathname.startsWith("/pharmacy/"))
    return "/pharmacy";
  if (pathname === "/stock" || pathname.startsWith("/stock/")) return "/stock";
  if (pathname === "/records" || pathname.startsWith("/records/"))
    return "/records";
  if (pathname === "/settings/doctors" || pathname.startsWith("/settings/"))
    return "/settings/doctors";
  return pathname;
}

export function canAccessPage(session: SessionPayload, pathname: string) {
  const key = pageKey(pathname);
  const allowed = PAGE_ACCESS[key];
  if (!allowed) return pathname === "/";

  if (!allowed.includes(session.role)) return false;

  if (
    session.role === "doctor" &&
    session.doctorId &&
    pathname.startsWith("/doctor/")
  ) {
    const doctorId = pathname.split("/")[2];
    return doctorId === session.doctorId;
  }

  return true;
}

export function canAccessApi(
  session: SessionPayload,
  pathname: string,
  method: string,
) {
  if (pathname === "/api/auth/logout" || pathname === "/api/auth/me") {
    return true;
  }

  if (pathname === "/api/analytics") {
    return session.role === "admin" || session.role === "manager";
  }

  if (pathname === "/api/reports") {
    return (
      session.role === "admin" ||
      session.role === "manager" ||
      session.role === "pharmacy" ||
      session.role === "reception"
    );
  }

  if (pathname === "/api/reconciliation") {
    return (
      session.role === "admin" ||
      session.role === "manager" ||
      session.role === "pharmacy" ||
      session.role === "reception"
    );
  }

  if (pathname === "/api/nabh/compliance" || pathname === "/api/audit-logs") {
    return (
      session.role === "admin" ||
      session.role === "manager" ||
      session.role === "reception" ||
      session.role === "doctor"
    );
  }

  if (
    pathname === "/api/incidents" ||
    pathname.match(/^\/api\/incidents\/[^/]+$/)
  ) {
    return session.role !== "display";
  }

  if (pathname.match(/^\/api\/visits\/[^/]+\/opd-summary$/)) {
    return (
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager" ||
      session.role === "reception" ||
      session.role === "doctor"
    );
  }

  if (pathname === "/api/collection/today") {
    return (
      session.role === "admin" ||
      session.role === "manager" ||
      session.role === "pharmacy" ||
      session.role === "reception"
    );
  }

  if (
    pathname === "/api/appointments" ||
    pathname === "/api/appointments/slots" ||
    pathname.match(/^\/api\/appointments\/[^/]+$/) ||
    pathname.match(/^\/api\/appointments\/[^/]+\/arrive$/)
  ) {
    return (
      session.role === "reception" ||
      session.role === "admin" ||
      session.role === "manager" ||
      session.role === "doctor"
    );
  }

  if (pathname.match(/^\/api\/visits\/[^/]+\/emr$/)) {
    if (method === "GET") {
      return (
        session.role === "doctor" ||
        session.role === "admin" ||
        session.role === "manager" ||
        session.role === "reception"
      );
    }
    return (
      session.role === "doctor" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (
    pathname === "/api/consultation-templates" ||
    pathname.match(/^\/api\/consultation-templates\/[^/]+$/)
  ) {
    return (
      session.role === "doctor" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname === "/api/doctors" && method === "POST") {
    return session.role === "admin" || session.role === "manager";
  }

  if (pathname.startsWith("/api/doctors/") && method === "PATCH") {
    if (session.role === "admin" || session.role === "manager") return true;
    if (session.role !== "doctor") return false;
    const doctorId = pathname.split("/")[3];
    return !session.doctorId || session.doctorId === doctorId;
  }

  if (pathname === "/api/patients" && method === "POST") {
    return (
      session.role === "reception" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname === "/api/patients/check-duplicate" && method === "GET") {
    return (
      session.role === "reception" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname.match(/^\/api\/patients\/[^/]+\/verify-mobile$/) && method === "POST") {
    return (
      session.role === "reception" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname === "/api/feedback" && method === "GET") {
    return session.role === "admin" || session.role === "manager";
  }

  if (pathname.startsWith("/api/patients/") && method === "PATCH") {
    return session.role !== "display";
  }

  if (pathname === "/api/medicines" && method === "POST") {
    return (
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname === "/api/medicines" && method === "GET") {
    return (
      session.role === "doctor" ||
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname === "/api/prescriptions" && method === "GET") {
    return (
      session.role === "doctor" ||
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname === "/api/prescriptions" && method === "POST") {
    return (
      session.role === "doctor" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname.match(/^\/api\/prescriptions\/[^/]+\/send$/) && method === "POST") {
    return (
      session.role === "doctor" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (
    pathname.match(/^\/api\/prescriptions\/[^/]+\/complete$/) &&
    method === "POST"
  ) {
    return (
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname.startsWith("/api/prescriptions/items/") && method === "PATCH") {
    return (
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname.startsWith("/api/prescriptions/items/") && method === "DELETE") {
    return (
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (
    pathname === "/api/stock/audit" ||
    pathname.startsWith("/api/stock/audit/")
  ) {
    return (
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname === "/api/stock" && method === "POST") {
    return session.role === "admin" || session.role === "manager";
  }

  if (pathname === "/api/stock/write-off" && method === "POST") {
    return session.role === "admin" || session.role === "manager";
  }

  if (
    pathname === "/api/stock/write-off" ||
    pathname === "/api/stock/expired"
  ) {
    return (
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname === "/api/patients/search") {
    return (
      session.role === "reception" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (pathname === "/api/doctors" && method === "POST") {
    return session.role === "admin" || session.role === "manager";
  }

  if (pathname.match(/^\/api\/doctors\/[^/]+$/) && method === "PATCH") {
    return true;
  }

  if (
    pathname === "/api/stock" ||
    pathname === "/api/stock/availability" ||
    pathname === "/api/stock/alerts"
  ) {
    return (
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (
    pathname === "/api/bills" ||
    pathname === "/api/bills/preview" ||
    pathname.startsWith("/api/bills/")
  ) {
    return (
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager"
    );
  }

  if (
    pathname === "/api/records" ||
    pathname.startsWith("/api/records/")
  ) {
    return (
      session.role === "pharmacy" ||
      session.role === "admin" ||
      session.role === "manager" ||
      session.role === "reception" ||
      session.role === "doctor"
    );
  }

  if (pathname.startsWith("/api/")) {
    return true;
  }

  return false;
}

export function canAccessPath(
  session: SessionPayload,
  pathname: string,
  method: string,
) {
  if (pathname.startsWith("/api/")) {
    return canAccessApi(session, pathname, method);
  }
  return canAccessPage(session, pathname);
}

export function rolesForNav(role: UserRole) {
  if (role === "admin" || role === "manager") {
    return Object.keys(PAGE_ACCESS);
  }
  return Object.entries(PAGE_ACCESS)
    .filter(([, roles]) => roles.includes(role))
    .map(([path]) => path);
}
