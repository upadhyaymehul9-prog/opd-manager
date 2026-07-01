"use client";

import { useEffect, useState } from "react";
import {
  DOCTOR_OPD_STATUS_LABELS,
  DOCTOR_OPD_STATUS_OPTIONS,
  DOCTOR_OPD_STATUS_TABLE_COLORS,
} from "@/lib/doctor-status";
import type { Doctor, DoctorOpdStatus } from "@/lib/types";
import { updateDoctorStatus } from "@/hooks/useDoctors";

export function DoctorStatusPanel({ doctorId }: { doctorId: string }) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/doctors/${doctorId}`)
      .then((r) => r.json())
      .then((data) => setDoctor(data))
      .catch(() => setError("Could not load your status"));
  }, [doctorId]);

  async function setStatus(status: DoctorOpdStatus) {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateDoctorStatus(doctorId, status);
      setDoctor(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  if (!doctor) {
    return (
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
        Loading your OPD status…
      </div>
    );
  }

  return (
    <section className="mb-6 rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">My OPD Status</h2>
          <p className="text-sm text-slate-600">
            Shown on the TV screen — update from your phone
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${DOCTOR_OPD_STATUS_TABLE_COLORS[doctor.opd_status]}`}
        >
          {DOCTOR_OPD_STATUS_LABELS[doctor.opd_status]}
        </span>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {DOCTOR_OPD_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={busy}
            onClick={() => setStatus(opt.value)}
            className={`rounded-lg border-2 px-3 py-3 text-sm font-medium transition disabled:opacity-50 ${
              doctor.opd_status === opt.value
                ? "border-blue-600 bg-blue-50 text-blue-900"
                : "border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );
}
