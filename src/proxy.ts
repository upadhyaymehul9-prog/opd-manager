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

// Temporary bridge for running without a real custom domain (e.g. the bare
// opd-manager.vercel.app, which can't host wildcard subdomains — Vercel only
// supports wildcard/custom-domain routing for domains you actually own).
// When set, a request with no subdomain is treated as this clinic's
// subdomain instead of the "no clinic" base-domain case. Remove this env
// var (and this fallback) once a real domain with subdomain routing exists.
const DEFAULT_CLINIC_SLUG = process.env.DEFAULT_CLINIC_SLUG || null;

type CachedClinic = { id: string; status: string; expiresAt: number };
const clinicCache = new Map<string, CachedClinic>();
const CLINIC_CACHE_TTL_MS = 60_000;

export function extractSlug(host: string): string | null {
  const hostname = host.split(":")[0];
  if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) {
    return DEFAULT_CLINIC_SLUG;
  }
  if (!hostname.endsWith(`.${BASE_DOMAIN}`)) return null;
  return hostname.slice(0, -(`.${BASE_DOMAIN}`.length));
}

async function resolveClinicId(slug: string): Promise<{ id: string; status: string } | null> {
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
  headers.delete("x-clinic-id");
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

// A session is host-scoped (cookies don't cross subdomains), so this is not
// a cross-tenant data leak -- but without this check, a user holding a valid
// session for a since-suspended clinic could keep using that session while
// visiting a different, active clinic's subdomain: the suspension check
// above only inspects the clinic being *visited*, never the session's own
// clinic, so downstream handlers would still trust session.clinicId and
// serve that user's own (nominally suspended) clinic's data. `clinicId` is
// null on the base domain, where no reconciliation is meaningful.
export function clinicSessionMismatch(
  clinicId: string | null,
  sessionClinicId: string,
): boolean {
  return clinicId !== null && sessionClinicId !== clinicId;
}

export async function proxy(request: NextRequest) {
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
    const clinic = await resolveClinicId(slug);
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

  if (clinicSessionMismatch(clinicId, session.clinicId)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

export const proxyConfig = {
  matcher: ["/((?!.*\\..*).*)"],
  runtime: "nodejs",
};
