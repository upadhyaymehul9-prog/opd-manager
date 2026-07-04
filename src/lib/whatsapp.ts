/** Normalize Indian mobile to wa.me digits (e.g. 919876543210). */
export function normalizeWhatsAppMobile(mobile: string | null | undefined): string | null {
  if (!mobile?.trim()) return null;

  let digits = mobile.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  if (digits.length >= 10) {
    return digits;
  }

  return null;
}

export function buildWhatsAppUrl(mobile: string | null | undefined, message: string): string | null {
  const normalized = normalizeWhatsAppMobile(mobile);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(mobile: string | null | undefined, message: string): boolean {
  const url = buildWhatsAppUrl(mobile, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
