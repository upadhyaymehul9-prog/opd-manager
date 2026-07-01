"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { logout, useSession } from "@/hooks/useSession";

const NAV = [
  { href: "/reception", label: "Reception", color: "bg-emerald-600" },
  { href: "/doctor", label: "Doctor", color: "bg-blue-600" },
  { href: "/lab", label: "Lab", color: "bg-purple-600" },
  { href: "/radiology", label: "Radiology", color: "bg-indigo-600" },
  { href: "/pharmacy", label: "Pharmacy", color: "bg-teal-600" },
  { href: "/stock", label: "Stock", color: "bg-amber-600" },
  { href: "/tv", label: "TV Display", color: "bg-rose-600" },
  { href: "/manager", label: "OPD Manager", color: "bg-slate-700" },
  { href: "/analytics", label: "Analytics", color: "bg-indigo-700" },
];

export function ConsoleNav({ current }: { current?: string }) {
  const { session } = useSession();
  const visibleNav = session
    ? NAV.filter((item) => session.navPaths.includes(item.href))
    : NAV;

  return (
    <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
      <Link
        href="/"
        className="mr-2 self-center text-sm font-bold text-slate-800"
      >
        OPD Manager
      </Link>
      {visibleNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 ${
            current === item.href ? "ring-2 ring-offset-2 ring-slate-400" : ""
          } ${item.color}`}
        >
          {item.label}
        </Link>
      ))}
      {session && (
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {session.displayName || session.username}
          </span>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}

export function ConsoleShell({
  title,
  subtitle,
  current,
  children,
}: {
  title: string;
  subtitle?: string;
  current?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <ConsoleNav current={current} />
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
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
