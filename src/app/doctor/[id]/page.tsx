"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ConsoleShell } from "@/components/ConsoleShell";
import { DoctorStatusPanel } from "@/components/DoctorStatusPanel";
import { PrescriptionForm } from "@/components/PrescriptionForm";
import { ConsultationEmrPanel } from "@/components/ConsultationEmrPanel";
import { MlcDetailsPanel } from "@/components/MlcDetailsPanel";
import { ProcedurePanel } from "@/components/ProcedurePanel";
import { LabTestsPanel } from "@/components/LabTestsPanel";
import { TransferDoctorPanel } from "@/components/TransferDoctorPanel";
import { PatientCard } from "@/components/PatientCard";
import { DoctorPatientQueueBar } from "@/components/DoctorPatientQueueBar";
import { PatientActions } from "@/components/PatientActions";
import { deletePatient, usePatientVisits } from "@/hooks/usePatientVisits";
import { canWritePrescription, getRelevantPatients } from "@/lib/status";
import type { PatientVisit } from "@/lib/types";

function isAtPharmacy(status: PatientVisit["status"]) {
  return status === "to_pharmacy" || status === "at_pharmacy";
}

export default function DoctorConsolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: doctorId } = use(params);
  const { visits, loading, error, refresh } = usePatientVisits({ activeOnly: true });
  const [workspaceOpen, setWorkspaceOpen] = useState<Record<string, boolean>>({});
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const myPatients = getRelevantPatients(visits, "doctor", doctorId).sort(
    (a, b) => a.token_number - b.token_number,
  );

  const doctorName =
    visits.find((v) => v.doctor_id === doctorId)?.doctors?.name ?? "Doctor";

  function isWorkspaceOpen(visitId: string) {
    return workspaceOpen[visitId] ?? false;
  }

  function toggleWorkspace(visitId: string) {
    setWorkspaceOpen((prev) => ({ ...prev, [visitId]: !isWorkspaceOpen(visitId) }));
  }

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
          <div key={visit.id} className="space-y-3">
            {isAtPharmacy(visit.status) ? (
              <DoctorPatientQueueBar visit={visit} queueIndex={idx + 1} />
            ) : (
              <PatientCard
                visit={visit}
                showDoctor={false}
                actions={
                  <div className="space-y-3">
                    <PatientActions
                      visit={visit}
                      role="doctor"
                      onUpdated={refresh}
                    />
                    <TransferDoctorPanel
                      visitId={visit.id}
                      currentDoctorId={doctorId}
                      onTransferred={refresh}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteVisit(visit)}
                      disabled={busyDeleteId === visit.id}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {busyDeleteId === visit.id ? "Removing..." : "Remove patient"}
                    </button>
                  </div>
                }
              />
            )}
            {canWritePrescription(visit.status) && (
              <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
                <button
                  type="button"
                  onClick={() => toggleWorkspace(visit.id)}
                  className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left"
                >
                  <span className="text-sm font-semibold text-blue-900">
                    Doctor workspace (EMR, Procedure, Lab tests, Prescription)
                  </span>
                  <span className="text-xs text-blue-700">
                    {isWorkspaceOpen(visit.id) ? "Collapse ▴" : "Expand ▾"}
                  </span>
                </button>
                {isWorkspaceOpen(visit.id) && (
                  <div className="mt-3 space-y-3">
                    {!isAtPharmacy(visit.status) && (
                      <>
                        <ConsultationEmrPanel
                          visitId={visit.id}
                          doctorId={doctorId}
                          initialAllergies={visit.patient_allergies}
                        />
                        {visit.medico_legal && (
                          <MlcDetailsPanel visitId={visit.id} />
                        )}
                        <ProcedurePanel visitId={visit.id} />
                        <LabTestsPanel visitId={visit.id} canOrder />
                      </>
                    )}
                    <PrescriptionForm
                      visitId={visit.id}
                      doctorId={doctorId}
                      patientAllergies={visit.patient_allergies}
                    />
                  </div>
                )}
              </section>
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
