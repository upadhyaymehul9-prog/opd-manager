"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { PatientCard } from "@/components/PatientCard";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import { getRelevantPatients } from "@/lib/status";
import type { Prescription } from "@/lib/prescription-types";

function RxBadge({ visitId }: { visitId: string }) {
  const [prescription, setPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    fetch(`/api/prescriptions?visit_id=${visitId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPrescription(data))
      .catch(() => setPrescription(null));
  }, [visitId]);

  if (!prescription) {
    return (
      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
        No Rx yet
      </span>
    );
  }

  const pending = prescription.items.filter((i) => !i.dispensed).length;
  return (
    <span className="rounded bg-teal-100 px-2 py-0.5 text-xs text-teal-900">
      Rx: {prescription.items.length} meds ({pending} pending)
    </span>
  );
}

export default function PharmacyPage() {
  const { visits, loading, error } = usePatientVisits(true);
  const pharmacyPatients = getRelevantPatients(visits, "pharmacy");

  return (
    <ConsoleShell
      title="Pharmacy Console"
      subtitle="Dispense prescriptions and send patients outside clinic"
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
          <div key={visit.id} className="space-y-2">
            <PatientCard visit={visit} />
            <div className="flex flex-wrap items-center gap-3 px-1">
              <RxBadge visitId={visit.id} />
              <Link
                href={`/pharmacy/${visit.id}`}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Open prescription →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </ConsoleShell>
  );
}
