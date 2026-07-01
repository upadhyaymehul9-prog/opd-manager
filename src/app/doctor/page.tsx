"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import type { Doctor } from "@/lib/types";

export default function DoctorListPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setDoctors(data));
  }, []);

  return (
    <ConsoleShell
      title="Doctor Console"
      subtitle="Select your name — works on PC or mobile"
      current="/doctor"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((d) => (
          <Link
            key={d.id}
            href={`/doctor/${d.id}`}
            className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <h2 className="text-xl font-bold text-slate-900">{d.name}</h2>
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
      {doctors.length === 0 && (
        <p className="text-slate-600">
          No doctors found. Run the database schema to seed doctors.
        </p>
      )}
    </ConsoleShell>
  );
}
