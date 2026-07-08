"use client";

import { ConsoleShell } from "@/components/ConsoleShell";
import { PatientCard } from "@/components/PatientCard";
import { PatientActions } from "@/components/PatientActions";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import { getRelevantPatients } from "@/lib/status";

export default function LabPage() {
  const { visits, loading, error } = usePatientVisits({ activeOnly: true });
  const labPatients = getRelevantPatients(visits, "lab");

  return (
    <ConsoleShell
      title="Laboratory Console"
      subtitle="Collect patients from doctor — set report ready time"
      current="/lab"
    >
      {loading && <p className="text-slate-600">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="space-y-4">
        {labPatients.length === 0 && !loading && (
          <p className="rounded-xl bg-white p-8 text-center text-slate-500">
            No patients at lab right now.
          </p>
        )}
        {labPatients.map((visit) => (
          <PatientCard
            key={visit.id}
            visit={visit}
            actions={<PatientActions visit={visit} role="lab" />}
          />
        ))}
      </div>
    </ConsoleShell>
  );
}
