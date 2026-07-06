"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { logout, useSession } from "@/hooks/useSession";

const ADMIN_NAV = [
  { href: "/manager", label: "OPD Manager", color: "bg-slate-700" },
  { href: "/reception", label: "Reception", color: "bg-emerald-600" },
  { href: "/appointments", label: "Appointments", color: "bg-emerald-700" },
  { href: "/doctor", label: "Doctor", color: "bg-blue-600" },
  { href: "/lab", label: "Lab", color: "bg-purple-600" },
  { href: "/radiology", label: "Radiology", color: "bg-indigo-600" },
  { href: "/pharmacy", label: "Pharmacy", color: "bg-teal-600" },
  { href: "/stock", label: "Stock", color: "bg-amber-600" },
  { href: "/tv", label: "TV Display", color: "bg-rose-600" },
  { href: "/analytics", label: "Analytics", color: "bg-indigo-700" },
  { href: "/records", label: "Records", color: "bg-cyan-700" },
  { href: "/records/completeness", label: "Record gaps", color: "bg-cyan-900" },
  { href: "/records/release", label: "ROI log", color: "bg-cyan-800" },
  { href: "/reports", label: "Reports", color: "bg-sky-700" },
  { href: "/reconciliation", label: "Day-end", color: "bg-orange-700" },
  { href: "/nabh", label: "NABH", color: "bg-teal-800" },
  { href: "/feedback", label: "Feedback", color: "bg-violet-800" },
  { href: "/incidents", label: "Incidents", color: "bg-red-700" },
  { href: "/settings/doctors", label: "My profile", color: "bg-violet-700" },
  { href: "/settings/patients/merge", label: "Merge patients", color: "bg-fuchsia-700" },
];

const STAFF_NAV = [
  { href: "/reception", label: "Reception", color: "bg-emerald-600" },
  { href: "/appointments", label: "Appointments", color: "bg-emerald-700" },
  { href: "/doctor", label: "Doctor", color: "bg-blue-600" },
  { href: "/lab", label: "Lab", color: "bg-purple-600" },
  { href: "/radiology", label: "Radiology", color: "bg-indigo-600" },
  { href: "/pharmacy", label: "Pharmacy", color: "bg-teal-600" },
  { href: "/stock", label: "Stock", color: "bg-amber-600" },
  { href: "/records", label: "Records", color: "bg-cyan-700" },
  { href: "/records/release", label: "ROI log", color: "bg-cyan-800" },
  { href: "/tv", label: "TV Display", color: "bg-rose-600" },
  { href: "/reports", label: "Reports", color: "bg-sky-700" },
  { href: "/reconciliation", label: "Day-end", color: "bg-orange-700" },
  { href: "/nabh", label: "NABH", color: "bg-teal-800" },
  { href: "/feedback", label: "Feedback", color: "bg-violet-800" },
  { href: "/incidents", label: "Incidents", color: "bg-red-700" },
  { href: "/settings/doctors", label: "My profile", color: "bg-violet-700" },
];

export function ConsoleNav({
  current,
  publicMode = false,
}: {
  current?: string;
  publicMode?: boolean;
}) {
  const { session } = useSession();
  const isAdminView =
    session?.role === "admin" || session?.role === "manager";
  const navPool = isAdminView ? ADMIN_NAV : STAFF_NAV;
  const visibleNav = publicMode
    ? []
    : session
      ? navPool.filter((item) => session.navPaths.includes(item.href))
      : [];
  const homeHref = publicMode ? "/feedback" : "/";

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
        <Link
          href={homeHref}
          className="mr-1 shrink-0 text-sm font-bold tracking-tight text-slate-900"
        >
          {publicMode ? "Clinic feedback" : "OPD Manager"}
        </Link>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {visibleNav.map((item) => {
            const active = current === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`focus-ring rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? `${item.color} text-white shadow-sm`
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {session && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:inline">
              {session.displayName || session.username}
            </span>
            <Link
              href="/account/change-password"
              className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm"
            >
              Change password
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export function ConsoleShell({
  title,
  subtitle,
  current,
  publicMode = false,
  children,
}: {
  title: string;
  subtitle?: string;
  current?: string;
  publicMode?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-clinic-bg)]">
      <ConsoleNav current={current} publicMode={publicMode} />
      <header className="border-b border-slate-200/80 bg-gradient-to-r from-white via-slate-50/80 to-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-600 sm:text-base">{subtitle}</p>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

export function SetupBanner() {
  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <p className="font-semibold">Database not configured yet</p>
      <p className="mt-1 text-sm">
        Create a free Neon database, set <code>DATABASE_URL</code> in{" "}
        <code>.env.local</code>, then run <code>npm run db:push</code> and{" "}
        <code>npm run db:seed</code>. See README for step-by-step setup.
      </p>
    </div>
  );
}
