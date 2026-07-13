"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { logout, useSession } from "@/hooks/useSession";

type NavItem = { href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

const ADMIN_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ href: "/manager", label: "OPD Manager" }] },
  {
    label: "Clinical",
    items: [
      { href: "/reception", label: "Reception" },
      { href: "/appointments", label: "Appointments" },
      { href: "/doctor", label: "Doctor" },
      { href: "/lab", label: "Lab" },
      { href: "/radiology", label: "Radiology" },
      { href: "/pharmacy", label: "Pharmacy" },
      { href: "/stock", label: "Stock" },
    ],
  },
  { label: "Display", items: [{ href: "/tv", label: "TV Display" }] },
  {
    label: "Reports & Records",
    items: [
      { href: "/analytics", label: "Analytics" },
      { href: "/records", label: "Records" },
      { href: "/records/completeness", label: "Record gaps" },
      { href: "/records/release", label: "ROI log" },
      { href: "/reports", label: "Reports" },
      { href: "/reconciliation", label: "Day-end" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/nabh", label: "NABH" },
      { href: "/feedback", label: "Feedback" },
      { href: "/incidents", label: "Incidents" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/settings/doctors", label: "My profile" },
      { href: "/settings/patients/merge", label: "Merge patients" },
    ],
  },
];

const STAFF_GROUPS: NavGroup[] = [
  {
    label: "Clinical",
    items: [
      { href: "/reception", label: "Reception" },
      { href: "/appointments", label: "Appointments" },
      { href: "/doctor", label: "Doctor" },
      { href: "/lab", label: "Lab" },
      { href: "/radiology", label: "Radiology" },
      { href: "/pharmacy", label: "Pharmacy" },
      { href: "/stock", label: "Stock" },
    ],
  },
  { label: "Display", items: [{ href: "/tv", label: "TV Display" }] },
  {
    label: "Reports & Records",
    items: [
      { href: "/records", label: "Records" },
      { href: "/records/release", label: "ROI log" },
      { href: "/reports", label: "Reports" },
      { href: "/reconciliation", label: "Day-end" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/nabh", label: "NABH" },
      { href: "/feedback", label: "Feedback" },
      { href: "/incidents", label: "Incidents" },
    ],
  },
  { label: "Account", items: [{ href: "/settings/doctors", label: "My profile" }] },
];

function SidebarContent({
  current,
  onNavigate,
}: {
  current?: string;
  onNavigate?: () => void;
}) {
  const { session } = useSession();
  const isAdminView = session?.role === "admin" || session?.role === "manager";
  const groups = isAdminView ? ADMIN_GROUPS : STAFF_GROUPS;

  const visibleGroups = session
    ? groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => session.navPaths.includes(item.href)),
        }))
        .filter((group) => group.items.length > 0)
    : [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-4 py-4">
        <Link href="/" className="text-base font-bold tracking-tight text-white">
          OPD Manager
        </Link>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {group.items.map((item) => {
                const active = current === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`focus-ring block rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                      active
                        ? "bg-teal-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {session && (
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="truncate text-sm font-medium text-white">
            {session.displayName || session.username}
          </p>
          <p className="text-xs capitalize text-slate-400">{session.role}</p>
          <div className="mt-2.5 flex gap-2">
            <Link
              href="/account/change-password"
              onClick={onNavigate}
              className="focus-ring flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-center text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              Password
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="focus-ring flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { session } = useSession();

  if (publicMode) {
    return (
      <div className="min-h-screen bg-[var(--color-clinic-bg)]">
        <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-sm">
          <Link href="/feedback" className="text-sm font-bold tracking-tight text-slate-900">
            Clinic feedback
          </Link>
        </nav>
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

  return (
    <div className="flex min-h-screen bg-[var(--color-clinic-bg)]">
      {session && (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 shrink-0 bg-slate-900 lg:block">
          <SidebarContent current={current} />
        </aside>
      )}

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900 shadow-xl">
            <SidebarContent current={current} onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:ml-60">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-gradient-to-r from-white via-slate-50/80 to-white">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
            {session && (
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
                className="focus-ring -ml-1 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 lg:hidden"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 4h16v2H2V4zm0 5h16v2H2V9zm0 5h16v2H2v-2z" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 truncate text-sm text-slate-600 sm:text-base">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {session?.mustChangePassword && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <div>
                <p className="font-semibold">You&apos;re still on the shared default password</p>
                <p className="mt-1 text-sm">
                  Set your own password so this account can&apos;t be used by
                  anyone who knows the default.
                </p>
              </div>
              <Link
                href="/account/change-password"
                className="focus-ring shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Set password
              </Link>
            </div>
          )}
          {children}
        </main>
      </div>
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
