export const RESERVED_CLINIC_SLUGS = [
  "www", "api", "app", "admin", "static", "assets", "mail", "ftp",
  "login", "signup", "help", "support", "docs", "blog", "status",
] as const;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidClinicSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 63) return false;
  if (!SLUG_PATTERN.test(slug)) return false;
  if ((RESERVED_CLINIC_SLUGS as readonly string[]).includes(slug)) return false;
  return true;
}
