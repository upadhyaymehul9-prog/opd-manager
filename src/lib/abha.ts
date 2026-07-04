/** Normalize ABHA to 14 digits (strip dashes/spaces). */
export function normalizeAbhaDigits(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  return digits;
}

export function formatAbhaId(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 14) return digits;
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}-${d.slice(10, 14)}`;
}

export function parseAbhaInput(raw: string | null | undefined): string | null {
  const digits = normalizeAbhaDigits(raw);
  if (!digits) return null;
  return formatAbhaId(digits);
}

export function isValidAbhaInput(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return true;
  return normalizeAbhaDigits(raw) != null;
}
