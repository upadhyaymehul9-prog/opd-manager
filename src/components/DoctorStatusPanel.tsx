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
      <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
        Loading OPD status…
      </div>
    );
  }

  return (
    <section className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 shadow-sm">
      <span className="text-sm font-medium text-slate-700">OPD status</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DOCTOR_OPD_STATUS_TABLE_COLORS[doctor.opd_status]}`}
      >
        {DOCTOR_OPD_STATUS_LABELS[doctor.opd_status]}
      </span>
      <select
        value={doctor.opd_status}
        disabled={busy}
        onChange={(e) => setStatus(e.target.value as DoctorOpdStatus)}
        className="focus-ring min-w-[180px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
        aria-label="Change OPD status"
      >
        {DOCTOR_OPD_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </section>
  );
}
