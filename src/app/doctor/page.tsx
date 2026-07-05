"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import type { Doctor } from "@/lib/types";

export default function DoctorListPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load doctors");
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Invalid response");
        setDoctors(data);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load doctors"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConsoleShell
      title="Doctor Console"
      subtitle="Select your name — works on PC or mobile"
      current="/doctor"
    >
      {loading && <p className="text-slate-600">Loading doctors…</p>}
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((d) => (
          <Link
            key={d.id}
            href={`/doctor/${d.id}`}
            className="card group p-6 transition hover:border-blue-300 hover:shadow-[var(--shadow-card-hover)]"
          >
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-700">
              {d.name}
            </h2>
            <p className="mt-1 text-slate-600">Room {d.room_number}</p>
            {d.specialty && (
              <p className="mt-1 text-sm text-blue-600">{d.specialty}</p>
            )}
            <p className="mt-4 text-sm font-medium text-blue-700">
              Open console →
            </p>
          </Link>
        ))}
      </div>
      {doctors.length === 0 && !loading && !error && (
        <p className="card p-8 text-center text-slate-500">
          No doctors found. Run the database seed to add doctors.
        </p>
      )}
    </ConsoleShell>
  );
}
