"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ConsoleShell, SetupBanner } from "@/components/ConsoleShell";
import type { Doctor } from "@/lib/types";

export default function ReceptionPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientName, setPatientName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastRegistered, setLastRegistered] = useState<{
    token: number;
    name: string;
    room: string;
    doctor: string;
    time: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDoctors(data);
          if (data[0]) setDoctorId(data[0].id);
        }
      })
      .catch(() => setError("Could not load doctors — check DATABASE_URL setup"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName.trim() || !doctorId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName,
          doctor_id: doctorId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      const doctor = doctors.find((d) => d.id === doctorId);
      setLastRegistered({
        token: data.token_number,
        name: data.patient_name,
        room: data.room_number,
        doctor: doctor?.name ?? "",
        time: format(new Date(data.registered_at), "h:mm:ss a"),
      });
      setPatientName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  return (
    <ConsoleShell
      title="Reception"
      subtitle="Register patient — auto timestamp & room from consultant"
      current="/reception"
    >
      {doctors.length === 0 && <SetupBanner />}

      <div className="grid gap-8 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">New Patient</h2>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Patient Name
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Full name"
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-lg focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            autoFocus
            required
          />

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Consultant (Doctor)
          </label>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-lg focus:border-emerald-500 focus:outline-none"
            required
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — Room {d.room_number}
                {d.specialty ? ` (${d.specialty})` : ""}
              </option>
            ))}
          </select>

          {selectedDoctor && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Patient will go to <strong>Room {selectedDoctor.room_number}</strong>
            </p>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !patientName.trim()}
            className="mt-6 w-full rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Registering…" : "Register Patient"}
          </button>
        </form>

        {lastRegistered && (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Registered successfully
            </p>
            <p className="mt-2 text-5xl font-black text-emerald-900">
              Token #{lastRegistered.token}
            </p>
            <dl className="mt-4 space-y-2 text-slate-800">
              <div>
                <dt className="text-xs text-slate-500">Patient</dt>
                <dd className="text-xl font-semibold">{lastRegistered.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Consultant</dt>
                <dd>{lastRegistered.doctor}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Room</dt>
                <dd className="text-2xl font-bold">{lastRegistered.room}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Time</dt>
                <dd>{lastRegistered.time}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}
