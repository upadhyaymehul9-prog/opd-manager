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

type WorkspaceTab = "emr" | "mlc" | "procedures" | "labs" | "prescription";

function WorkspaceTabs({
  visit,
  doctorId,
  activeTab,
  onTabChange,
  onRefresh,
}: {
  visit: PatientVisit;
  doctorId: string;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onRefresh: () => void;
}) {
  const atPharmacy = isAtPharmacy(visit.status);

  const tabs: { id: WorkspaceTab; label: string }[] = atPharmacy
    ? [{ id: "prescription", label: "Prescription" }]
    : [
        { id: "emr", label: "Consultation (EMR)" },
        ...(visit.medico_legal ? [{ id: "mlc" as const, label: "MLC" }] : []),
        { id: "procedures", label: "Procedures" },
        { id: "labs", label: "Lab tests" },
        { id: "prescription", label: "Prescription" },
      ];

  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0].id;

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-current={currentTab === tab.id ? "page" : undefined}
            className={`focus-ring -mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition ${
              currentTab === tab.id
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-3">
        {currentTab === "emr" && (
          <ConsultationEmrPanel
            visitId={visit.id}
            doctorId={doctorId}
            initialAllergies={visit.patient_allergies}
          />
        )}
        {currentTab === "mlc" && visit.medico_legal && (
          <MlcDetailsPanel visitId={visit.id} onDeleted={onRefresh} />
        )}
        {currentTab === "procedures" && <ProcedurePanel visitId={visit.id} />}
        {currentTab === "labs" && <LabTestsPanel visitId={visit.id} canOrder />}
        {currentTab === "prescription" && (
          <PrescriptionForm
            visitId={visit.id}
            doctorId={doctorId}
            patientAllergies={visit.patient_allergies}
          />
        )}
      </div>
    </div>
  );
}

export default function DoctorConsolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: doctorId } = use(params);
  const { visits, loading, error, refresh } = usePatientVisits({ activeOnly: true });
  const [workspaceOpen, setWorkspaceOpen] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<Record<string, WorkspaceTab>>({});
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const myPatients = getRelevantPatients(visits, "doctor", doctorId).sort(
    (a, b) => a.token_number - b.token_number,
  );

  const doctorName =
    visits.find((v) => v.doctor_id === doctorId)?.doctors?.name ?? "Doctor";

  // Keyed by visit + phase (consult vs. at-pharmacy), not just visit id, so
  // sending a patient to pharmacy always starts the workspace collapsed
  // again — a doctor who had it open during consultation doesn't end up
  // with the full prescription form left expanded after "Send to Pharmacy".
  // It's still one click away via "Expand" if they need to edit it there.
  function workspacePhaseKey(visit: PatientVisit) {
    return `${visit.id}:${isAtPharmacy(visit.status) ? "pharmacy" : "consult"}`;
  }

  function isWorkspaceOpen(visit: PatientVisit) {
    return workspaceOpen[workspacePhaseKey(visit)] ?? false;
  }

  function toggleWorkspace(visit: PatientVisit) {
    const key = workspacePhaseKey(visit);
    setWorkspaceOpen((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
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
          <div key={visit.id} className="space-y-2">
            {isAtPharmacy(visit.status) ? (
              <DoctorPatientQueueBar visit={visit} queueIndex={idx + 1} />
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
            {canWritePrescription(visit.status) && (
              <section className="overflow-hidden rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => toggleWorkspace(visit)}
                  className="flex w-full items-center justify-between bg-slate-50 px-4 py-2 text-left hover:bg-slate-100"
                >
                  <span className="text-sm font-medium text-slate-700">
                    Doctor workspace
                    <span className="ml-1 font-normal text-slate-400">
                      · EMR, Procedure, Lab tests, Prescription
                    </span>
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {isWorkspaceOpen(visit) ? "Collapse ▴" : "Expand ▾"}
                  </span>
                </button>
                {isWorkspaceOpen(visit) && (
                  <div className="border-t border-slate-200 bg-white p-3">
                    <WorkspaceTabs
                      visit={visit}
                      doctorId={doctorId}
                      activeTab={activeTab[visit.id] ?? "emr"}
                      onTabChange={(tab) =>
                        setActiveTab((prev) => ({ ...prev, [visit.id]: tab }))
                      }
                      onRefresh={refresh}
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
