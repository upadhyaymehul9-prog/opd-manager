"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ConsoleShell } from "@/components/ConsoleShell";
import { DoctorStatusPanel } from "@/components/DoctorStatusPanel";
import { EditPatientDetailsPanel } from "@/components/EditPatientDetailsPanel";
import { TransferDoctorPanel } from "@/components/TransferDoctorPanel";
import { PatientCard } from "@/components/PatientCard";
import { DoctorPatientQueueBar } from "@/components/DoctorPatientQueueBar";
import { PatientActions } from "@/components/PatientActions";
import { isAtPharmacy } from "@/components/DoctorWorkspaceTabs";
import { deletePatient, usePatientVisits } from "@/hooks/usePatientVisits";
import { canWritePrescription, getRelevantPatients } from "@/lib/status";
import type { PatientVisit } from "@/lib/types";

export default function DoctorConsolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: doctorId } = use(params);
  const { visits, loading, error, refresh } = usePatientVisits({ activeOnly: true });
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const myPatients = getRelevantPatients(visits, "doctor", doctorId).sort(
    (a, b) => a.token_number - b.token_number,
  );

  const doctorName =
    visits.find((v) => v.doctor_id === doctorId)?.doctors?.name ?? "Doctor";

  async function handleDeleteVisit(visit: PatientVisit) {
    const ok = window.confirm(
      `Remove ${visit.patient_name} (Token #${visit.token_number}) from workflow?\n\nThis deletes the visit and related entries for this OPD encounter.`,
    );
    if (!ok) return;
    setBusyDeleteId(visit.id);
    setActionError(null);
    try {
      await deletePatient(visit.id);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not remove patient visit");
    } finally {
      setBusyDeleteId(null);
    }
  }

  return (
    <ConsoleShell
      title={doctorName}
      subtitle="Tap to call patient or guide them to lab / radiology / pharmacy"
      current="/doctor"
    >
      <Link
        href="/settings/doctors"
        className="mb-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
      >
        My profile &amp; photo for TV →
      </Link>

      {loading && <p className="text-slate-600">Loading patients…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {actionError && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <DoctorStatusPanel doctorId={doctorId} />

      <div className="space-y-4">
        {myPatients.length === 0 && !loading && (
          <p className="rounded-xl bg-white p-8 text-center text-slate-500">
            No patients in your queue right now.
          </p>
        )}
        {myPatients.map((visit, idx) => (
          <div key={visit.id} className="space-y-2">
            {isAtPharmacy(visit.status) ? (
              <div className="space-y-2">
                <DoctorPatientQueueBar visit={visit} queueIndex={idx + 1} doctorId={doctorId} />
                <EditPatientDetailsPanel visit={visit} onUpdated={refresh} />
              </div>
            ) : (
              <PatientCard
                visit={visit}
                showDoctor={false}
                actions={
                  <div className="space-y-2.5">
                    <PatientActions
                      visit={visit}
                      role="doctor"
                      onUpdated={refresh}
                    />
                    <EditPatientDetailsPanel visit={visit} onUpdated={refresh} />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200 pt-2">
                      <TransferDoctorPanel
                        visitId={visit.id}
                        currentDoctorId={doctorId}
                        onTransferred={refresh}
                      />
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteVisit(visit)}
                        disabled={busyDeleteId === visit.id}
                        className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
                      >
                        {busyDeleteId === visit.id ? "Removing..." : "Remove patient"}
                      </button>
                    </div>
                  </div>
                }
              />
            )}
            {canWritePrescription(visit.status) && !isAtPharmacy(visit.status) && (
              <Link
                href={`/doctor/${doctorId}/visit/${visit.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 hover:bg-slate-100"
              >
                <span className="text-sm font-medium text-slate-700">
                  Open patient
                  <span className="ml-1 font-normal text-slate-400">
                    · EMR, journey, vitals, prescription
                  </span>
                </span>
                <span className="text-xs font-medium text-teal-700">Open →</span>
              </Link>
            )}
            {isAtPharmacy(visit.status) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDeleteVisit(visit)}
                  disabled={busyDeleteId === visit.id}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {busyDeleteId === visit.id ? "Removing..." : "Remove patient"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ConsoleShell>
  );
}
