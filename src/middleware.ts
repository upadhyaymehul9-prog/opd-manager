import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessPath,
  getHomeForRole,
  getSessionFromRequest,
} from "@/lib/auth";
import { RESERVED_CLINIC_SLUGS } from "@/lib/clinic-slug";
import { prisma } from "@/lib/prisma";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/feedback"];

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "localhost";

type CachedClinic = { id: string; status: string; expiresAt: number };
const clinicCache = new Map<string, CachedClinic>();
const CLINIC_CACHE_TTL_MS = 60_000;

function extractSlug(host: string): string | null {
  const hostname = host.split(":")[0];
  if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) return null;
  if (!hostname.endsWith(`.${BASE_DOMAIN}`)) return null;
  return hostname.slice(0, -(`.${BASE_DOMAIN}`.length));
}

async function resolveClinicId(host: string): Promise<{ id: string; status: string } | null> {
  const slug = extractSlug(host);
  if (!slug) return null;

  // A reserved word can never be claimed by a real clinic — treat it exactly
  // like "not found in the DB" so a reserved subdomain and a genuinely
  // unregistered one are indistinguishable to the caller, at every path.
  if ((RESERVED_CLINIC_SLUGS as readonly string[]).includes(slug)) return null;

  const cached = clinicCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return { id: cached.id, status: cached.status };
  }

  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
  if (!clinic) return null;

  clinicCache.set(slug, {
    id: clinic.id,
    status: clinic.status,
    expiresAt: Date.now() + CLINIC_CACHE_TTL_MS,
  });
  return clinic;
}

function nextWithClinic(request: NextRequest, clinicId: string | null) {
  const headers = new Headers(request.headers);
  if (clinicId) headers.set("x-clinic-id", clinicId);
  return NextResponse.next({ request: { headers } });
}

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

  const host = request.headers.get("host") ?? "";
  const slug = extractSlug(host);

  // Base-domain requests (no clinic subdomain) only serve the future signup
  // flow and marketing/base pages -- not built in this plan, so for now
  // anything on the base domain other than the public paths 404s.
  if (!slug && !PUBLIC_PATHS.includes(pathname) && pathname !== "/") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let clinicId: string | null = null;
  if (slug) {
    const clinic = await resolveClinicId(host);
    if (!clinic || clinic.status === "suspended") {
      return NextResponse.json({ error: "Unknown clinic" }, { status: 404 });
    }
    clinicId = clinic.id;
  }

  if (
    PUBLIC_PATHS.includes(pathname) ||
    isPublicFeedbackSubmit(pathname, request.method) ||
    isPublicBookingApi(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return nextWithClinic(request, clinicId);
  }

  const session = await getSessionFromRequest(request);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (pathname === "/") {
      return nextWithClinic(request, clinicId);
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

  return nextWithClinic(request, clinicId);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
  runtime: "nodejs",
};
