"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { PrescriptionDetail } from "@/components/PrescriptionDetail";
import type { PatientVisit } from "@/lib/types";

export default function PharmacyVisitPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = use(params);
  const [visit, setVisit] = useState<PatientVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadVisit() {
    setLoading(true);
    fetch(`/api/patients/${visitId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setVisit(data);
        setError(null);
      })
      .catch(() => setError("Could not load patient visit"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadVisit();
  }, [visitId]);

  return (
    <ConsoleShell
      title="Dispense prescription"
      subtitle="Mark each medicine and complete patient exit"
      current="/pharmacy"
    >
      <Link href="/pharmacy" className="mb-4 inline-block text-sm text-teal-700">
        ← Back to pharmacy queue
      </Link>

      {loading && <p className="text-slate-600">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {visit && (
        <PrescriptionDetail
          visit={visit}
          onComplete={loadVisit}
        />
      )}
    </ConsoleShell>
  );
}
