"use client";

import { useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { LabTestsPanel } from "@/components/LabTestsPanel";
import { PatientCard } from "@/components/PatientCard";
import { PatientActions } from "@/components/PatientActions";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import { getRelevantPatients, STATUS_LABELS } from "@/lib/status";
import type { PatientStatus } from "@/lib/types";

const LAB_STEPS: { status: PatientStatus; label: string }[] = [
  { status: "to_lab", label: "1. Sent to lab" },
  { status: "lab_calling", label: "2. Call patient" },
  { status: "at_lab", label: "3. Arrived" },
  { status: "lab_processing", label: "4. Ready time" },
  { status: "lab_ready", label: "5. Report ready" },
];

function stepIndex(status: PatientStatus) {
  if (status === "to_lab") return 0;
  if (status === "lab_calling") return 1;
  if (status === "at_lab") return 2;
  if (status === "lab_processing") return 3;
  if (status === "lab_ready") return 4;
  return -1;
}

export default function LabPage() {
  const { visits, loading, error, refresh } = usePatientVisits({
    activeOnly: true,
  });
  const labPatients = getRelevantPatients(visits, "lab");
  const [selectedId, setSelectedId] = useState("");

  // Keep the selection valid as the queue refreshes; auto-clear when the
  // patient leaves the lab queue (e.g. sent back to doctor).
  useEffect(() => {
    if (selectedId && !labPatients.some((v) => v.id === selectedId)) {
      setSelectedId("");
    }
  }, [labPatients, selectedId]);

  const selected = labPatients.find((v) => v.id === selectedId) ?? null;

  return (
    <ConsoleShell
      title="Laboratory Console"
      subtitle="Select a patient → mark arrived → enter results → send back to doctor"
      current="/lab"
    >
      {loading && <p className="text-slate-600">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
        <p className="font-semibold">How to use</p>
        <ol className="mt-1 list-inside list-decimal text-violet-900">
          <li>Select the patient from the dropdown below</li>
          <li>
            <strong>Patient Arrived</strong> — patient is at the lab counter
          </li>
          <li>
            <strong>Set ready time &amp; start</strong> — minutes until the report is ready (optional)
          </li>
          <li>Enter results in each report panel</li>
          <li>
            <strong>Report Ready</strong> / <strong>Send Back to Doctor</strong> — returns the patient to the doctor
          </li>
        </ol>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor="lab-patient"
          className="mb-1 block text-sm font-semibold text-slate-800"
        >
          Patient at lab
        </label>
        <select
          id="lab-patient"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
        >
          <option value="">
            {labPatients.length === 0
              ? "No patients at lab right now"
              : `Select patient… (${labPatients.length} waiting)`}
          </option>
          {labPatients.map((v) => (
            <option key={v.id} value={v.id}>
              #{v.token_number} · {v.patient_name} — {STATUS_LABELS[v.status]}
            </option>
          ))}
        </select>
        {labPatients.length === 0 && !loading && (
          <p className="mt-2 text-xs text-slate-500">
            Doctor must tap &quot;Send to Lab&quot; first.
          </p>
        )}
      </div>

      {selected && (
        <div className="space-y-3">
          <PatientCard
            visit={selected}
            actions={
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {LAB_STEPS.map((step, i) => {
                    const current = stepIndex(selected.status);
                    return (
                      <span
                        key={step.status}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          i < current
                            ? "bg-emerald-100 text-emerald-800"
                            : i === current
                              ? "bg-violet-600 text-white"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {step.label}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  Now: {STATUS_LABELS[selected.status]} — use the button below for the next step
                </p>
                <PatientActions visit={selected} role="lab" onUpdated={refresh} />
              </div>
            }
          />
          <LabTestsPanel visitId={selected.id} canOrder canEnterResults />
        </div>
      )}
    </ConsoleShell>
  );
}
