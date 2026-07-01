"use client";

import { ConsoleShell } from "@/components/ConsoleShell";
import { PatientCard } from "@/components/PatientCard";
import { PatientActions } from "@/components/PatientActions";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import { RADIOLOGY_ACTIONS, getRelevantPatients } from "@/lib/status";

export default function RadiologyPage() {
  const { visits, loading, error } = usePatientVisits(true);
  const radioPatients = getRelevantPatients(visits, "radiology");

  return (
    <ConsoleShell
      title="Radiology Console"
      subtitle="Collect patients — predict report time for TV display"
      current="/radiology"
    >
      {loading && <p className="text-slate-600">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

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
              <PatientActions visit={visit} actions={RADIOLOGY_ACTIONS} />
            }
          />
        ))}
      </div>
    </ConsoleShell>
  );
}
