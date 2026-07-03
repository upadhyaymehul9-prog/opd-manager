"use client";

import { useEffect, useState } from "react";
import { updatePatient } from "@/hooks/usePatientVisits";
import type { Doctor } from "@/lib/types";
import { ActionButton } from "./PatientCard";

export function TransferDoctorPanel({
  visitId,
  currentDoctorId,
  onTransferred,
}: {
  visitId: string;
  currentDoctorId: string;
  onTransferred?: () => void;
}) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDoctors(data.filter((d: Doctor) => d.id !== currentDoctorId));
        }
      });
  }, [currentDoctorId]);

  async function transfer() {
    if (!targetId) return;
    setBusy(true);
    try {
      await updatePatient(visitId, { doctor_id: targetId });
      setOpen(false);
      setTargetId("");
      onTransferred?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Transfer to another doctor
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <select
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1.5 text-sm"
      >
        <option value="">Select consultant</option>
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} — Room {d.room_number}
          </option>
        ))}
      </select>
      <ActionButton
        label="Confirm transfer"
        variant="primary"
        disabled={busy || !targetId}
        onClick={transfer}
      />
      <ActionButton label="Cancel" disabled={busy} onClick={() => setOpen(false)} />
    </div>
  );
}
