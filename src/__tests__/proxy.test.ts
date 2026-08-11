import { afterEach, describe, expect, it, vi } from "vitest";
import { clinicSessionMismatch, extractSlug, config } from "@/proxy";

const CLINIC_A = "11111111-1111-1111-1111-111111111111";
const CLINIC_B = "22222222-2222-2222-2222-222222222222";

describe("clinicSessionMismatch — Finding 4 regression", () => {
  it("rejects a request against clinic B's subdomain carrying a session for clinic A", () => {
    // A user holding a valid session for clinic A (e.g. a since-suspended
    // clinic) must not be able to ride that session onto a different,
    // active clinic B's subdomain -- session.clinicId (A) would otherwise
    // still be trusted by downstream route handlers while the visited host
    // resolves to B.
    expect(clinicSessionMismatch(CLINIC_B, CLINIC_A)).toBe(true);
  });

  it("allows a request when the session's clinic matches the resolved subdomain clinic", () => {
    expect(clinicSessionMismatch(CLINIC_A, CLINIC_A)).toBe(false);
  });

  it("is a no-op on the base domain, where clinicId is null", () => {
    expect(clinicSessionMismatch(null, CLINIC_A)).toBe(false);
  });
});

describe("proxy config export — static asset regression", () => {
  // Shipping this export under any other name (it was `proxyConfig` once)
  // makes Next silently ignore it, dropping the matcher so Proxy runs on
  // /_next/static/* and 404s every CSS/JS chunk in production.
  it("is exported as `config`, the name Next.js actually reads", () => {
    expect(config).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
  });

  it("excludes Next's static asset routes from the matcher", () => {
    // Next anchors matcher patterns against the whole pathname.
    const pattern = new RegExp(`^${config.matcher[0]}$`);
    expect(pattern.test("/_next/static/chunks/abc123.css")).toBe(false);
    expect(pattern.test("/_next/image")).toBe(false);
    expect(pattern.test("/favicon.ico")).toBe(false);
  });

  it("still matches real app routes", () => {
    // Next anchors matcher patterns against the whole pathname.
    const pattern = new RegExp(`^${config.matcher[0]}$`);
    expect(pattern.test("/manager")).toBe(true);
    expect(pattern.test("/api/patients")).toBe(true);
    expect(pattern.test("/login")).toBe(true);
  });

  it("declares no route segment config — Next 16 rejects it in Proxy", () => {
    expect("runtime" in config).toBe(false);
  });
});

describe("extractSlug — DEFAULT_CLINIC_SLUG fallback", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it("returns null on the bare base domain when no default clinic is configured", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_BASE_DOMAIN = "opd-manager.vercel.app";
    delete process.env.DEFAULT_CLINIC_SLUG;
    const { extractSlug: freshExtractSlug } = await import("@/proxy");
    expect(freshExtractSlug("opd-manager.vercel.app")).toBeNull();
  });

  it("falls back to DEFAULT_CLINIC_SLUG on the bare base domain when configured", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_BASE_DOMAIN = "opd-manager.vercel.app";
    process.env.DEFAULT_CLINIC_SLUG = "hmp";
    const { extractSlug: freshExtractSlug } = await import("@/proxy");
    expect(freshExtractSlug("opd-manager.vercel.app")).toBe("hmp");
  });

  it("still resolves a real subdomain over the default, when both are present", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_BASE_DOMAIN = "opd-manager.vercel.app";
    process.env.DEFAULT_CLINIC_SLUG = "hmp";
    const { extractSlug: freshExtractSlug } = await import("@/proxy");
    expect(freshExtractSlug("otherclinic.opd-manager.vercel.app")).toBe("otherclinic");
  });
});
