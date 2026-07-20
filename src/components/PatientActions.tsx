"use client";

import { useState } from "react";
import { addMinutes } from "date-fns";
import type { PatientVisit } from "@/lib/types";
import type { StatusAction } from "@/lib/status";
import {
  getDoctorActions,
  getLabActions,
  getPharmacyActions,
  getRadiologyActions,
} from "@/lib/status";
import { ActionButton } from "./PatientCard";
import { updatePatient } from "@/hooks/usePatientVisits";

export type WorkflowRole = "doctor" | "lab" | "radiology" | "pharmacy";

function actionsForRole(role: WorkflowRole, status: PatientVisit["status"]) {
  switch (role) {
    case "doctor":
      return getDoctorActions(status);
    case "lab":
      return getLabActions(status);
    case "radiology":
      return getRadiologyActions(status);
    case "pharmacy":
      return getPharmacyActions(status);
  }
}

export function PatientActions({
  visit,
  role,
  onUpdated,
}: {
  visit: PatientVisit;
  role: WorkflowRole;
  onUpdated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etaMinutes, setEtaMinutes] = useState(30);
  const [showEtaFor, setShowEtaFor] = useState<"lab" | "radio" | null>(null);

  const actions = actionsForRole(role, visit.status);

  async function applyAction(action: StatusAction) {
    if (action.needsEta) {
      setShowEtaFor(action.needsEta);
      return;
    }
    await runUpdate({ status: action.status });
  }

  async function runUpdate(updates: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await updatePatient(visit.id, updates);
      setShowEtaFor(null);
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
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

  if (actions.length === 0 && !showEtaFor) {
    return null;
  }

  return (
    <div className="space-y-3">
      {showEtaFor && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="text-sm font-medium text-slate-700">
            Report ready in (minutes) — shown on TV:
          </label>
          <input
            type="number"
            min={5}
            max={240}
            value={etaMinutes}
            onChange={(e) => setEtaMinutes(Number(e.target.value))}
            className="focus-ring w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
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
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {actions.length > 0 && (
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
      )}
    </div>
  );
}
