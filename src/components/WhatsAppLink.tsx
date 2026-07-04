"use client";

import { buildWhatsAppUrl } from "@/lib/whatsapp";

type WhatsAppLinkProps = {
  mobile: string | null | undefined;
  message: string;
  label?: string;
  className?: string;
};

export function WhatsAppLink({
  mobile,
  message,
  label = "WhatsApp",
  className = "",
}: WhatsAppLinkProps) {
  const url = buildWhatsAppUrl(mobile, message);

  if (!url) {
    return (
      <span
        className={`inline-flex cursor-not-allowed items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 ${className}`}
        title="Add patient mobile number to send WhatsApp"
      >
        {label} (no mobile)
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-100 ${className}`}
      title="Opens WhatsApp Web or app — free, no API needed"
    >
      <span aria-hidden>💬</span>
      {label}
    </a>
  );
}
