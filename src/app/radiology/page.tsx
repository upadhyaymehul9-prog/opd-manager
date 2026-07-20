"use client";

import { ConsoleShell } from "@/components/ConsoleShell";
import { PatientCard } from "@/components/PatientCard";
import { PatientActions } from "@/components/PatientActions";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import { getRelevantPatients } from "@/lib/status";

export default function RadiologyPage() {
  const { visits, loading, error, refresh } = usePatientVisits({
    activeOnly: true,
  });
  const radioPatients = getRelevantPatients(visits, "radiology");

  return (
    <ConsoleShell
      title="Radiology Console"
      subtitle="Call patient → mark arrived → set report ready time → send back to doctor"
      current="/radiology"
    >
      {loading && <p className="text-slate-600">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <p className="font-semibold">Radiology workflow</p>
        <p className="mt-1">
          Call Patient → Patient Arrived → Set ready time &amp; start → Report Ready →
          Send Back to Doctor
        </p>
      </div>

      <div className="space-y-4">
        {radioPatients.length === 0 && !loading && (
          <p className="rounded-xl bg-white p-8 text-center text-slate-500">
            No patients at radiology right now.
          </p>
        )}
        {radioPatients.map((visit) => (
          <PatientCard
            key={visit.id}
            visit={visit}
            actions={
              <PatientActions
                visit={visit}
                role="radiology"
                onUpdated={refresh}
              />
            }
          />
        ))}
      </div>
    </ConsoleShell>
  );
}
