"use client";

import { useState } from "react";
import { addMinutes } from "date-fns";
import type { PatientVisit } from "@/lib/types";
import type { StatusAction } from "@/lib/status";
import { ActionButton } from "./PatientCard";
import { updatePatient } from "@/hooks/usePatientVisits";

export function PatientActions({
  visit,
  actions,
}: {
  visit: PatientVisit;
  actions: StatusAction[];
}) {
  const [busy, setBusy] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(30);
  const [showEtaFor, setShowEtaFor] = useState<"lab" | "radio" | null>(null);

  async function applyAction(action: StatusAction) {
    if (action.needsEta) {
      setShowEtaFor(action.needsEta);
      return;
    }
    await runUpdate({ status: action.status });
  }

  async function runUpdate(updates: Record<string, unknown>) {
    setBusy(true);
    try {
      await updatePatient(visit.id, updates);
      setShowEtaFor(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEta() {
    if (!showEtaFor) return;
    const eta = addMinutes(new Date(), etaMinutes).toISOString();
    const status = showEtaFor === "lab" ? "lab_processing" : "radio_processing";
    const etaField = showEtaFor === "lab" ? "lab_eta" : "radio_eta";
    await runUpdate({ status, [etaField]: eta });
  }

  return (
    <div className="space-y-3">
      {showEtaFor && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3">
          <label className="text-sm font-medium text-slate-700">
            Report ready in (minutes):
          </label>
          <input
            type="number"
            min={5}
            max={240}
            value={etaMinutes}
            onChange={(e) => setEtaMinutes(Number(e.target.value))}
            className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <ActionButton
            label="Set ETA & Start"
            variant="primary"
            onClick={confirmEta}
            disabled={busy}
          />
          <ActionButton
            label="Cancel"
            onClick={() => setShowEtaFor(null)}
            disabled={busy}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <ActionButton
            key={`${action.status}-${action.label}`}
            label={action.label}
            variant={action.variant}
            disabled={busy}
            onClick={() => applyAction(action)}
          />
        ))}
      </div>
    </div>
  );
}
