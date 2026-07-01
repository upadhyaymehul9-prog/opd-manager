"use client";

import Link from "next/link";
import { use } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { PrescriptionDetail } from "@/components/PrescriptionDetail";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import { useRouter } from "next/navigation";

export default function PharmacyVisitPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = use(params);
  const router = useRouter();
  const { visits, loading, error } = usePatientVisits(true);
  const visit = visits.find((v) => v.id === visitId);

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
          onComplete={() => router.push("/pharmacy")}
        />
      )}
      {!loading && !visit && (
        <p className="text-slate-600">Patient not found in active pharmacy queue.</p>
      )}
    </ConsoleShell>
  );
}
