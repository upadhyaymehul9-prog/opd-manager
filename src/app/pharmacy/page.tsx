"use client";

import { ConsoleShell } from "@/components/ConsoleShell";
import { PatientCard } from "@/components/PatientCard";
import { PatientActions } from "@/components/PatientActions";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import { PHARMACY_ACTIONS, getRelevantPatients } from "@/lib/status";

export default function PharmacyPage() {
  const { visits, loading, error } = usePatientVisits(true);
  const pharmacyPatients = getRelevantPatients(visits, "pharmacy");

  return (
    <ConsoleShell
      title="Pharmacy Console"
      subtitle="Final step — dispense and send patient outside clinic"
      current="/pharmacy"
    >
      {loading && <p className="text-slate-600">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="space-y-4">
        {pharmacyPatients.length === 0 && !loading && (
          <p className="rounded-xl bg-white p-8 text-center text-slate-500">
            No patients at pharmacy right now.
          </p>
        )}
        {pharmacyPatients.map((visit) => (
          <PatientCard
            key={visit.id}
            visit={visit}
            actions={
              <PatientActions visit={visit} actions={PHARMACY_ACTIONS} />
            }
          />
        ))}
      </div>
    </ConsoleShell>
  );
}
