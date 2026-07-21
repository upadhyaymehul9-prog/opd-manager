"use client";

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

  return (
    <ConsoleShell
      title="Laboratory Console"
      subtitle="Call patient → mark arrived → enter results → send back to doctor"
      current="/lab"
    >
      {loading && <p className="text-slate-600">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
        <p className="font-semibold">Lab workflow (buttons appear step by step)</p>
        <ol className="mt-1 list-inside list-decimal text-violet-900">
          <li>
            <strong>Call Patient</strong> — announces on TV display
          </li>
          <li>
            <strong>Patient Arrived</strong> — patient is at the lab counter
          </li>
          <li>
            <strong>Set ready time &amp; start</strong> — enter minutes until report is ready (optional if results are already entered)
          </li>
          <li>
            <strong>Report Ready</strong> or <strong>Send Back to Doctor</strong> — use either once tests are done; send back returns patient to doctor cabin
          </li>
        </ol>
      </div>

      <div className="space-y-4">
        {labPatients.length === 0 && !loading && (
          <p className="rounded-xl bg-white p-8 text-center text-slate-500">
            No patients at lab right now. Doctor must tap &quot;Send to Lab&quot; first.
          </p>
        )}
        {labPatients.map((visit) => {
          const current = stepIndex(visit.status);
          return (
            <div key={visit.id} className="space-y-3">
              <PatientCard
                visit={visit}
                actions={
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {LAB_STEPS.map((step, i) => (
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
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Now: {STATUS_LABELS[visit.status]} — use the button below for the next
                      step
                    </p>
                    <PatientActions
                      visit={visit}
                      role="lab"
                      onUpdated={refresh}
                    />
                  </div>
                }
              />
              <LabTestsPanel
                visitId={visit.id}
                canOrder
                canEnterResults
              />
            </div>
          );
        })}
      </div>
    </ConsoleShell>
  );
}
