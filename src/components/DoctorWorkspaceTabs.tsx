"use client";

import { ConsultationEmrPanel } from "@/components/ConsultationEmrPanel";
import { LabTestsPanel } from "@/components/LabTestsPanel";
import { MlcDetailsPanel } from "@/components/MlcDetailsPanel";
import { PrescriptionForm } from "@/components/PrescriptionForm";
import { ProcedurePanel } from "@/components/ProcedurePanel";
import type { PatientVisit } from "@/lib/types";

export function isAtPharmacy(status: PatientVisit["status"]) {
  return status === "to_pharmacy" || status === "at_pharmacy";
}

export type WorkspaceTab = "emr" | "mlc" | "procedures" | "labs" | "prescription";

export function DoctorWorkspaceTabs({
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

  // Keep Lab tests visible at pharmacy so unused orders can be cancelled
  // and patients are not stuck if results are still pending.
  const tabs: { id: WorkspaceTab; label: string }[] = atPharmacy
    ? [
        { id: "labs", label: "Lab tests" },
        { id: "prescription", label: "Prescription" },
      ]
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
